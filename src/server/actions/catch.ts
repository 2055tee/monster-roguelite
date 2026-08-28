'use server';

import type { Item, OwnedMonster } from '@/lib/game/types';
import { computeCatchChance, computePerformance } from '@/lib/game/catch';
import { createRng } from '@/lib/game/rng';
import { effectiveStats } from '@/lib/game/stats';
import { applyXp, roomXp } from '@/lib/game/xp';
import { requireUser } from '@/server/auth';
import { getAllItems, getDungeonById, getSpeciesById } from '@/server/repo/catalog';
import { getEncounterForRoom, getEncountersForRun } from '@/server/repo/encounter';
import {
  getMonsterRowsByIds,
  insertMonster,
  mapMonsterRow,
  rollAbilities,
  rollStatMultipliers,
  updateMonster,
  type MonsterRow,
} from '@/server/repo/monster';
import { adjustCurrency, consumeItem, getInventoryRows } from '@/server/repo/profile';
import { getRunRow, updateRun, type DungeonRunRow } from '@/server/repo/run';
import { getMaxHpFor } from '@/server/game-bridge';

async function loadCatchContext(runId: string) {
  const user = await requireUser();
  const run = await getRunRow(runId);
  if (!run || run.owner_id !== user.id) {
    throw new Error('Run not found');
  }
  if (run.status !== 'in_progress') {
    throw new Error('Run is not awaiting a catch decision');
  }
  const dungeon = await getDungeonById(run.dungeon_id);
  const lastIndex = dungeon.roomLayout.length - 1;
  if (run.current_room_index !== lastIndex || dungeon.roomLayout[lastIndex] !== 'boss') {
    throw new Error('Run is not at the boss room');
  }
  const encounter = await getEncounterForRoom(run.id, run.current_room_index);
  if (!encounter || encounter.status !== 'won') {
    throw new Error('Boss encounter has not been won yet');
  }
  return { user, run, dungeon };
}

async function computeCatchBasics(run: DungeonRunRow) {
  const performance = computePerformance(run.total_expected_turns, run.total_turns);
  const teamRows = await getMonsterRowsByIds(run.team_snapshot);
  const faintCount = teamRows.filter((r) => (r.current_hp ?? 0) <= 0).length;
  return { performance, faintCount };
}

export async function getCatchPreview(runId: string): Promise<{
  performance: number;
  baseChance: number;
  faintPenalty: number;
  availableLures: { itemId: string; name: string; bonus: number; quantity: number }[];
}> {
  const { user, run, dungeon } = await loadCatchContext(runId);
  const { performance, faintCount } = await computeCatchBasics(run);

  const inventory = await getInventoryRows(user.id);
  const items = await getAllItems();
  const itemById = new Map(items.map((i) => [i.id, i]));

  const availableLures = inventory
    .filter((row) => row.quantity > 0)
    .map((row) => ({ row, item: itemById.get(row.item_id) }))
    .filter(
      (
        x
      ): x is { row: (typeof inventory)[number]; item: Item & { effect: { type: 'catch_bonus'; value: number } } } =>
        !!x.item && x.item.category === 'consumable' && x.item.effect.type === 'catch_bonus'
    )
    .map((x) => ({
      itemId: x.item.id,
      name: x.item.name,
      bonus: x.item.effect.value,
      quantity: x.row.quantity,
    }));

  return {
    performance,
    baseChance: dungeon.baseCatchRate,
    faintPenalty: faintCount * 0.1,
    availableLures,
  };
}

export async function attemptCatch(
  runId: string,
  consumableItemIds: string[]
): Promise<{ chance: number; roll: number; success: boolean; monster?: OwnedMonster }> {
  const { run, dungeon } = await loadCatchContext(runId);
  const { performance, faintCount } = await computeCatchBasics(run);

  const items = await getAllItems();
  const itemById = new Map(items.map((i) => [i.id, i]));
  const inventory = await getInventoryRows(run.owner_id);
  const inventoryById = new Map(inventory.map((row) => [row.item_id, row.quantity]));

  let consumableBonus = 0;
  for (const itemId of consumableItemIds) {
    const item = itemById.get(itemId);
    const qty = inventoryById.get(itemId) ?? 0;
    if (!item || item.category !== 'consumable' || item.effect.type !== 'catch_bonus' || qty < 1) {
      throw new Error(`Invalid catch-bonus consumable: ${itemId}`);
    }
    consumableBonus += item.effect.value;
  }

  const chance = computeCatchChance(dungeon.baseCatchRate, performance, faintCount, consumableBonus);

  let rng = createRng(run.rng_seed, run.rng_cursor);
  const roll = rng.next();
  const success = roll < chance;

  // Persist rng cursor progress from the roll immediately.
  await updateRun(run.id, { rng_cursor: rng.cursor });

  for (const itemId of consumableItemIds) {
    await consumeItem(run.owner_id, itemId, 1);
  }

  let monster: OwnedMonster | undefined;
  const patch: Record<string, unknown> = {
    catch_chance: chance,
    catch_roll: roll,
    catch_succeeded: success,
  };

  if (success) {
    rng = createRng(run.rng_seed, rng.cursor);
    const rolls = rollStatMultipliers(() => rng.next());
    const bossSpecies = await getSpeciesById(dungeon.bossSpeciesId);
    const abilities = rollAbilities(bossSpecies, () => rng.next());
    const level = dungeon.enemyLevel + 3;
    const draftOwned: OwnedMonster = {
      id: 'draft',
      speciesId: bossSpecies.id,
      level,
      xp: 0,
      rolls,
      abilities,
      teamSlot: null,
      currentHp: null,
      equippedItemId: null,
      isStarter: false,
      healingUntil: null,
      caughtAt: new Date().toISOString(),
    };
    const maxHp = effectiveStats(bossSpecies, draftOwned, null).hp;

    const row = await insertMonster({
      ownerId: run.owner_id,
      speciesId: bossSpecies.id,
      level,
      rolls,
      abilities,
      teamSlot: null,
      currentHp: maxHp,
      isStarter: false,
    });
    monster = mapMonsterRow(row);
    patch.caught_monster_id = row.id;
    await updateRun(run.id, { rng_cursor: rng.cursor });
  }

  await updateRun(run.id, patch);

  return { chance, roll, success, monster };
}

export async function finishRun(runId: string): Promise<{
  gold: number;
  healing: { monsterId: string; until: string }[];
  xpAwarded: number;
  levelUps: { monsterId: string; from: number; to: number }[];
}> {
  const user = await requireUser();
  const run = await getRunRow(runId);
  if (!run || run.owner_id !== user.id) {
    throw new Error('Run not found');
  }

  if (run.completed_at) {
    // Already finalized — idempotent return.
    const teamRows = await getMonsterRowsByIds(run.team_snapshot);
    const healing = teamRows
      .filter((r) => r.healing_until && new Date(r.healing_until).getTime() > Date.now())
      .map((r) => ({ monsterId: r.id, until: r.healing_until as string }));
    return { gold: run.gold_awarded, healing, xpAwarded: run.xp_awarded, levelUps: [] };
  }

  const dungeon = await getDungeonById(run.dungeon_id);
  let goldAwarded = run.gold_awarded;
  let finalStatus: 'completed' | 'failed';

  if (run.status === 'in_progress') {
    finalStatus = 'completed';
    goldAwarded = dungeon.goldReward;
  } else {
    finalStatus = 'failed';
    goldAwarded = 0;
  }

  // XP: full amount to every team monster for each *won* room's encounter
  // (rest rooms have no combat_encounters row and award nothing), scaled up
  // 1.5x on a full clear. See CLAUDE.md's XP design for the rationale.
  const lastIndex = dungeon.roomLayout.length - 1;
  const encounters = await getEncountersForRun(run.id);
  const wonXp = encounters
    .filter((e) => e.status === 'won')
    .reduce((sum, e) => {
      const isBoss = e.room_index === lastIndex && dungeon.roomLayout[lastIndex] === 'boss';
      const roomLevel = isBoss ? dungeon.enemyLevel + 3 : dungeon.enemyLevel;
      return sum + roomXp(roomLevel, isBoss);
    }, 0);
  const xpAwarded = Math.floor(wonXp * (finalStatus === 'completed' ? 1.5 : 1));

  await updateRun(run.id, {
    status: finalStatus,
    completed_at: new Date().toISOString(),
    gold_awarded: goldAwarded,
    xp_awarded: xpAwarded,
  });
  if (goldAwarded > 0) {
    await adjustCurrency(run.owner_id, goldAwarded);
  }

  const teamRows = await getMonsterRowsByIds(run.team_snapshot);
  const levelUps: { monsterId: string; from: number; to: number }[] = [];
  const healing: { monsterId: string; until: string }[] = [];

  for (const row of teamRows) {
    let workingRow: MonsterRow = row;

    if (xpAwarded > 0) {
      const oldMaxHp = await getMaxHpFor(row);
      const { level: newLevel, xp: newXp, levelsGained } = applyXp(row.level, row.xp, xpAwarded);
      let newCurrentHp = row.current_hp;

      if (levelsGained > 0) {
        workingRow = { ...row, level: newLevel };
        const newMaxHp = await getMaxHpFor(workingRow);
        newCurrentHp = row.current_hp === null ? null : row.current_hp + (newMaxHp - oldMaxHp);
        levelUps.push({ monsterId: row.id, from: row.level, to: newLevel });
      }

      await updateMonster(row.id, { level: newLevel, xp: newXp, current_hp: newCurrentHp });
      workingRow = { ...workingRow, level: newLevel, xp: newXp, current_hp: newCurrentHp };
    }

    const maxHp = await getMaxHpFor(workingRow);
    const currentHp = workingRow.current_hp ?? maxHp;
    if (currentHp < maxHp) {
      const until = new Date(Date.now() + Math.min(workingRow.level, 12) * 5 * 1000).toISOString();
      await updateMonster(row.id, { healing_until: until });
      healing.push({ monsterId: row.id, until });
    }
  }

  return { gold: goldAwarded, healing, xpAwarded, levelUps };
}

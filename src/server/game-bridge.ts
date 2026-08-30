/**
 * Shared glue between the pure game engine (src/lib/game/**) and the DB rows
 * (src/server/repo/**), used by the run/combat/catch action bodies. Not a
 * repo module itself (no direct table ownership) — just business logic that
 * multiple action files need, kept out of repo/ to keep that layer pure
 * data-access.
 */
import type { Combatant, Item, OwnedMonster, RunView } from '@/lib/game/types';
import { effectiveStats, power } from '@/lib/game/stats';
import { getItemById, getSpeciesById } from '@/server/repo/catalog';
import { getDungeonById } from '@/server/repo/catalog';
import { getEncounterForRoom } from '@/server/repo/encounter';
import { getInstanceRow } from '@/server/repo/item-instance';
import { getMonsterRowsByIds, mapMonsterRow, updateMonster, type MonsterRow } from '@/server/repo/monster';
import type { DungeonRunRow } from '@/server/repo/run';

/**
 * Resolves a monster row's equipped item + its reforge level via the
 * per-copy item_instances table. This is the single point where reforge
 * bonuses enter combat/stat calculations -- every caller that needs a
 * monster's equipped item should go through this rather than reading
 * equipped_item_id directly, so reforge levels are never silently dropped.
 */
export async function getEquippedContext(row: MonsterRow): Promise<{ item: Item | null; reforgeLevel: number }> {
  if (!row.equipped_instance_id) {
    return { item: null, reforgeLevel: 0 };
  }
  const instance = await getInstanceRow(row.equipped_instance_id);
  if (!instance) {
    return { item: null, reforgeLevel: 0 };
  }
  const item = await getItemById(instance.item_id);
  return { item, reforgeLevel: instance.reforge_level };
}

/** Build a player-side Combatant for a monster row, fetching species+item as needed. */
export async function buildPlayerCombatant(row: MonsterRow): Promise<Combatant> {
  const species = await getSpeciesById(row.species_id);
  const { item, reforgeLevel } = await getEquippedContext(row);
  const owned = mapMonsterRow(row);
  const stats = effectiveStats(species, owned, item, reforgeLevel);
  return {
    id: row.id,
    side: 'player',
    name: species.name,
    emoji: species.emoji,
    level: row.level,
    stats,
    currentHp: row.current_hp ?? stats.hp,
    abilities: ['basic_attack', ...(row.abilities ?? [])],
    cooldowns: {},
    effects: {},
  };
}

export async function buildPlayerCombatants(rows: MonsterRow[]): Promise<Combatant[]> {
  return Promise.all(rows.map(buildPlayerCombatant));
}

/** Average `power(effectiveStats(...))` across a team of monster rows. */
export async function computeTeamPower(rows: MonsterRow[]): Promise<number> {
  const combatants = await buildPlayerCombatants(rows);
  const total = combatants.reduce((sum, c) => sum + power(c.stats), 0);
  return total / combatants.length;
}

export async function getMaxHpFor(row: MonsterRow): Promise<number> {
  const species = await getSpeciesById(row.species_id);
  const { item, reforgeLevel } = await getEquippedContext(row);
  const owned = mapMonsterRow(row);
  return effectiveStats(species, owned, item, reforgeLevel).hp;
}

/**
 * A monster whose healing timer has already elapsed (or was never scheduled
 * despite being below max HP -- shouldn't normally happen, but is a dead
 * end for the player if it does, since skipHealing/useElixir both require an
 * active healing_until) should just be healed on read rather than staying
 * stuck forever. Persists the repair and returns the corrected row.
 */
export async function resolveHealingForRow(row: MonsterRow): Promise<MonsterRow> {
  const maxHp = await getMaxHpFor(row);
  const currentHp = row.current_hp ?? maxHp;
  if (currentHp >= maxHp) return row;

  const stillHealing = row.healing_until !== null && new Date(row.healing_until).getTime() > Date.now();
  if (stillHealing) return row;

  await updateMonster(row.id, { current_hp: maxHp, healing_until: null });
  return { ...row, current_hp: maxHp, healing_until: null };
}

export async function resolveHealingForRows(rows: MonsterRow[]): Promise<MonsterRow[]> {
  return Promise.all(rows.map(resolveHealingForRow));
}

/** Assemble the full RunView for a run row. Does not perform authorization — callers must verify ownership first. */
export async function buildRunView(run: DungeonRunRow): Promise<RunView> {
  const dungeon = await getDungeonById(run.dungeon_id);
  const teamRows = await getMonsterRowsByIds(run.team_snapshot);
  const rowById = new Map(teamRows.map((r) => [r.id, r]));
  const team: OwnedMonster[] = run.team_snapshot
    .map((id) => rowById.get(id))
    .filter((r): r is MonsterRow => !!r)
    .map(mapMonsterRow);

  const encounterRow = await getEncounterForRoom(run.id, run.current_room_index);
  const encounter = encounterRow?.state ?? null;
  const log = encounterRow?.log ?? [];

  const lastIndex = dungeon.roomLayout.length - 1;
  const isCatchPending =
    run.status === 'in_progress' &&
    run.current_room_index === lastIndex &&
    dungeon.roomLayout[lastIndex] === 'boss' &&
    encounterRow?.status === 'won';

  let catchInfo: RunView['catchInfo'] = null;
  if (isCatchPending) {
    const { getCatchPreview } = await import('@/server/actions/catch');
    catchInfo = await getCatchPreview(run.id);
  }

  let result: RunView['result'] = null;
  if (run.status === 'completed' || run.status === 'failed') {
    let caughtMonster: OwnedMonster | null = null;
    if (run.caught_monster_id) {
      const rows = await getMonsterRowsByIds([run.caught_monster_id]);
      if (rows[0]) caughtMonster = mapMonsterRow(rows[0]);
    }
    result = {
      goldAwarded: run.gold_awarded,
      caughtMonster,
      catchChance: run.catch_chance,
      catchRoll: run.catch_roll,
      catchSucceeded: run.catch_succeeded,
    };
  }

  return {
    runId: run.id,
    dungeonId: run.dungeon_id,
    status: run.status,
    currentRoomIndex: run.current_room_index,
    roomLayout: dungeon.roomLayout,
    team,
    encounter,
    log,
    totalTurns: run.total_turns,
    totalExpectedTurns: run.total_expected_turns,
    catchInfo,
    result,
  };
}

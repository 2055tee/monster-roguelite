'use server';

import type { ActionError, ActionResult, Combatant, RunView } from '@/lib/game/types';
import { buildEnemy, initEncounter, runEnemyTurnsUntilPlayer } from '@/lib/game/combat';
import { computeExpectedTurns } from '@/lib/game/dungeon';
import { power } from '@/lib/game/stats';
import { createRng } from '@/lib/game/rng';
import { rollChest } from '@/lib/game/catch';
import { requireUser } from '@/server/auth';
import { getAllItems, getDungeonById, getSpeciesById } from '@/server/repo/catalog';
import { getEncounterForRoom, insertEncounter } from '@/server/repo/encounter';
import { getMonsterRowsByIds, getTeamRows, updateMonster } from '@/server/repo/monster';
import { getInProgressRun, getRoomResult, getRunRow, insertRoomResult, insertRun, updateRun } from '@/server/repo/run';
import { grantItem } from '@/server/repo/profile';
import {
  buildPlayerCombatants,
  buildRunView,
  computeTeamPower,
  getMaxHpFor,
  resolveHealingForRows,
} from '@/server/game-bridge';

async function loadOwnedRun(runId: string) {
  const user = await requireUser();
  const run = await getRunRow(runId);
  if (!run || run.owner_id !== user.id) {
    throw new Error('Run not found');
  }
  return { user, run };
}

export async function startRun(dungeonId: string): Promise<{ runId: string } | ActionError> {
  const user = await requireUser();

  const existing = await getInProgressRun(user.id);
  if (existing) {
    return { ok: false, error: 'You already have a run in progress.' };
  }

  const teamRows = await resolveHealingForRows(await getTeamRows(user.id));
  if (teamRows.length < 3 || teamRows.some((r) => r.team_slot === null)) {
    return { ok: false, error: 'You need a full team of 3 monsters to start a run.' };
  }
  for (const row of teamRows) {
    if ((row.current_hp ?? 0) <= 0) {
      return { ok: false, error: 'One of your team monsters has fainted and needs to recover first.' };
    }
    if (row.healing_until && new Date(row.healing_until).getTime() > Date.now()) {
      return { ok: false, error: 'One of your team monsters is still healing.' };
    }
  }

  const dungeon = await getDungeonById(dungeonId);
  const teamPower = await computeTeamPower(teamRows);

  const bossSpecies = await getSpeciesById(dungeon.bossSpeciesId);
  const bossCombatant = buildEnemy(bossSpecies, dungeon.enemyLevel + 3, true);
  const bossPower = power(bossCombatant.stats);

  const { expectedTurnsPerRoom, totalExpectedTurns } = computeExpectedTurns(teamPower, bossPower);
  const rngSeed = Math.floor(Math.random() * 2 ** 31);

  const run = await insertRun({
    ownerId: user.id,
    dungeonId: dungeon.id,
    rngSeed,
    expectedTurnsPerRoom,
    totalExpectedTurns,
    teamSnapshot: teamRows
      .slice()
      .sort((a, b) => (a.team_slot ?? 0) - (b.team_slot ?? 0))
      .map((r) => r.id),
  });

  return { runId: run.id };
}

export async function getRunState(runId: string): Promise<RunView> {
  const { run } = await loadOwnedRun(runId);
  return buildRunView(run);
}

export async function enterRoom(runId: string): Promise<RunView> {
  const { run } = await loadOwnedRun(runId);
  if (run.status !== 'in_progress') {
    throw new Error('Run is not in progress');
  }

  const dungeon = await getDungeonById(run.dungeon_id);
  const roomType = dungeon.roomLayout[run.current_room_index];
  if (roomType !== 'combat' && roomType !== 'boss') {
    throw new Error(`Room ${run.current_room_index} is not a combat/boss room`);
  }

  const existing = await getEncounterForRoom(run.id, run.current_room_index);
  if (existing) {
    return buildRunView(run);
  }

  const teamRows = await getMonsterRowsByIds(run.team_snapshot);
  const playerCombatants = await buildPlayerCombatants(teamRows);

  const rng = createRng(run.rng_seed, run.rng_cursor);
  const enemyCombatants: Combatant[] = [];

  if (roomType === 'boss') {
    const bossSpecies = await getSpeciesById(dungeon.bossSpeciesId);
    enemyCombatants.push(buildEnemy(bossSpecies, dungeon.enemyLevel + 3, true));
  } else {
    const pool = dungeon.enemySpeciesIds;
    for (let i = 0; i < dungeon.enemiesPerRoom; i++) {
      const idx = Math.min(pool.length - 1, Math.floor(rng.next() * pool.length));
      const species = await getSpeciesById(pool[idx]);
      enemyCombatants.push(buildEnemy(species, dungeon.enemyLevel, false));
    }
  }

  let state = initEncounter(playerCombatants, enemyCombatants, rng);
  let log: RunView['log'] = [];
  let status: 'active' | 'won' | 'lost' = 'active';

  // The turn order may start with an enemy (speed/tiebreak dependent) — fast-forward
  // through any leading enemy turns so the encounter is always left awaiting a
  // player action (mirrors what submitCombatAction does mid-fight).
  const firstActor = state.combatants.find((c) => c.id === state.order[state.orderIndex]);
  if (firstActor && firstActor.side === 'enemy') {
    const enemyResult = runEnemyTurnsUntilPlayer(state, rng);
    state = enemyResult.state;
    log = enemyResult.log;
    const enemyDefeated = state.combatants.filter((c) => c.side === 'enemy' && c.currentHp > 0).length === 0;
    const playerWiped = state.combatants.filter((c) => c.side === 'player' && c.currentHp > 0).length === 0;
    if (enemyDefeated) status = 'won';
    else if (playerWiped) status = 'lost';
  }

  await insertEncounter({ runId: run.id, roomIndex: run.current_room_index, state, log, status });
  await updateRun(run.id, { rng_cursor: rng.cursor });

  if (status === 'lost') {
    for (const c of state.combatants.filter((c) => c.side === 'player')) {
      await updateMonster(c.id, { current_hp: c.currentHp });
    }
    await updateRun(run.id, { status: 'failed', completed_at: new Date().toISOString() });
  } else if (status === 'won') {
    for (const c of state.combatants.filter((c) => c.side === 'player')) {
      await updateMonster(c.id, { current_hp: c.currentHp });
    }
    const lastIndex = dungeon.roomLayout.length - 1;
    const isBossRoom = run.current_room_index === lastIndex && dungeon.roomLayout[lastIndex] === 'boss';
    if (!isBossRoom) {
      await updateRun(run.id, { current_room_index: run.current_room_index + 1 });
    }
  }

  const refreshed = await getRunRow(run.id);
  return buildRunView(refreshed!);
}

export async function chooseRestOption(runId: string, choice: 'heal' | 'chest'): Promise<RunView> {
  const { run } = await loadOwnedRun(runId);
  if (run.status !== 'in_progress') {
    throw new Error('Run is not in progress');
  }

  const dungeon = await getDungeonById(run.dungeon_id);
  const roomType = dungeon.roomLayout[run.current_room_index];
  if (roomType !== 'rest') {
    throw new Error(`Room ${run.current_room_index} is not a rest room`);
  }

  const existingResult = await getRoomResult(run.id, run.current_room_index);
  if (existingResult) {
    throw new Error('This rest room has already been resolved');
  }

  const teamRows = await getMonsterRowsByIds(run.team_snapshot);

  if (choice === 'heal') {
    for (const row of teamRows) {
      const maxHp = await getMaxHpFor(row);
      const currentHp = row.current_hp ?? 0;
      const newHp = currentHp <= 0 ? Math.round(0.5 * maxHp) : Math.min(maxHp, currentHp + Math.round(0.5 * maxHp));
      await updateMonster(row.id, { current_hp: newHp });
    }
    await insertRoomResult({ runId: run.id, roomIndex: run.current_room_index, roomType: 'rest', choice: 'heal' });
  } else {
    const items = await getAllItems();
    const dropTable = items.map((i) => ({ itemId: i.id, weight: i.dropWeight }));
    const rng = createRng(run.rng_seed, run.rng_cursor);
    const itemId = rollChest(rng, dropTable);
    await updateRun(run.id, { rng_cursor: rng.cursor });
    await grantItem(run.owner_id, itemId, 1);
    await insertRoomResult({
      runId: run.id,
      roomIndex: run.current_room_index,
      roomType: 'rest',
      choice: 'chest',
      itemId,
    });
  }

  await updateRun(run.id, { current_room_index: run.current_room_index + 1 });

  const refreshed = await getRunRow(run.id);
  return buildRunView(refreshed!);
}

export async function abandonRun(runId: string): Promise<ActionResult> {
  const { run } = await loadOwnedRun(runId);
  if (run.status !== 'in_progress') {
    return { ok: true };
  }
  await updateRun(run.id, { status: 'abandoned', completed_at: new Date().toISOString() });
  return { ok: true };
}

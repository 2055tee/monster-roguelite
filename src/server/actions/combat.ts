'use server';

import type { LogEntry, RunView } from '@/lib/game/types';
import { resolvePlayerAction, runEnemyTurnsUntilPlayer } from '@/lib/game/combat';
import { createRng } from '@/lib/game/rng';
import { requireUser } from '@/server/auth';
import { getDungeonById } from '@/server/repo/catalog';
import { getEncounterForRoom, updateEncounter } from '@/server/repo/encounter';
import { updateMonster } from '@/server/repo/monster';
import { getRunRow, updateRun } from '@/server/repo/run';
import { buildRunView } from '@/server/game-bridge';

export async function submitCombatAction(
  runId: string,
  input: { actorId: string; abilityId: string; targetId: string }
): Promise<{ view: RunView; newLogEntries: LogEntry[] }> {
  const user = await requireUser();
  const run = await getRunRow(runId);
  if (!run || run.owner_id !== user.id) {
    throw new Error('Run not found');
  }
  if (run.status !== 'in_progress') {
    throw new Error('Run is not in progress');
  }

  const encounterRow = await getEncounterForRoom(run.id, run.current_room_index);
  if (!encounterRow || encounterRow.status !== 'active') {
    throw new Error('No active encounter for this room');
  }

  const rng = createRng(run.rng_seed, run.rng_cursor);
  const roundBefore = encounterRow.state.round;

  let state;
  let newLogEntries: LogEntry[];
  try {
    const result = resolvePlayerAction(encounterRow.state, input, rng);
    state = result.state;
    newLogEntries = [...result.log];
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'Invalid combat action');
  }

  const enemyDefeated = state.combatants.filter((c) => c.side === 'enemy' && c.currentHp > 0).length === 0;
  const playerWiped = state.combatants.filter((c) => c.side === 'player' && c.currentHp > 0).length === 0;

  if (!enemyDefeated && !playerWiped) {
    const nextActorId = state.order[state.orderIndex];
    const nextActor = state.combatants.find((c) => c.id === nextActorId);
    if (nextActor && nextActor.side === 'enemy') {
      const enemyResult = runEnemyTurnsUntilPlayer(state, rng);
      state = enemyResult.state;
      newLogEntries = [...newLogEntries, ...enemyResult.log];
    }
  }

  const finalEnemyDefeated = state.combatants.filter((c) => c.side === 'enemy' && c.currentHp > 0).length === 0;
  const finalPlayerWiped = state.combatants.filter((c) => c.side === 'player' && c.currentHp > 0).length === 0;

  const roundsElapsed = Math.max(0, state.round - roundBefore);

  await updateRun(run.id, {
    rng_cursor: rng.cursor,
    total_turns: run.total_turns + roundsElapsed,
  });

  const mergedLog = [...encounterRow.log, ...newLogEntries];
  const encounterPatch: Record<string, unknown> = {
    state,
    log: mergedLog,
    turn_count: encounterRow.turn_count + 1,
  };

  if (finalEnemyDefeated) {
    encounterPatch.status = 'won';
    encounterPatch.resolved_at = new Date().toISOString();
  } else if (finalPlayerWiped) {
    encounterPatch.status = 'lost';
    encounterPatch.resolved_at = new Date().toISOString();
  }

  await updateEncounter(encounterRow.id, encounterPatch);

  // Persist player HP back to the monsters table whenever the encounter resolved.
  if (finalEnemyDefeated || finalPlayerWiped) {
    const playerCombatants = state.combatants.filter((c) => c.side === 'player');
    for (const c of playerCombatants) {
      await updateMonster(c.id, { current_hp: c.currentHp });
    }
  }

  if (finalEnemyDefeated) {
    const dungeon = await getDungeonById(run.dungeon_id);
    const lastIndex = dungeon.roomLayout.length - 1;
    const isBossRoom = run.current_room_index === lastIndex && dungeon.roomLayout[lastIndex] === 'boss';
    if (!isBossRoom) {
      await updateRun(run.id, { current_room_index: run.current_room_index + 1 });
    }
  } else if (finalPlayerWiped) {
    await updateRun(run.id, { status: 'failed', completed_at: new Date().toISOString() });
  }

  const refreshed = await getRunRow(run.id);
  const view = await buildRunView(refreshed!);

  return { view, newLogEntries };
}

import { createAdminClient } from '@/lib/supabase/admin';
import type { DungeonRunStatus } from '@/lib/game/types';

export type DungeonRunRow = {
  id: string;
  owner_id: string;
  dungeon_id: string;
  status: DungeonRunStatus;
  started_at: string;
  completed_at: string | null;
  current_room_index: number;
  rng_seed: number;
  rng_cursor: number;
  expected_turns_per_room: number;
  total_expected_turns: number;
  total_turns: number;
  team_snapshot: string[];
  rooms: unknown[];
  performance: number | null;
  catch_chance: number | null;
  catch_roll: number | null;
  catch_succeeded: boolean | null;
  caught_monster_id: string | null;
  gold_awarded: number;
};

export async function getRunRow(runId: string): Promise<DungeonRunRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('dungeon_runs').select('*').eq('id', runId).maybeSingle();
  if (error) throw new Error(`Failed to load run ${runId}: ${error.message}`);
  return (data as DungeonRunRow | null) ?? null;
}

export async function getInProgressRun(ownerId: string): Promise<DungeonRunRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('dungeon_runs')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('status', 'in_progress')
    .maybeSingle();
  if (error) throw new Error(`Failed to load in-progress run: ${error.message}`);
  return (data as DungeonRunRow | null) ?? null;
}

export async function insertRun(input: {
  ownerId: string;
  dungeonId: string;
  rngSeed: number;
  expectedTurnsPerRoom: number;
  totalExpectedTurns: number;
  teamSnapshot: string[];
}): Promise<DungeonRunRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('dungeon_runs')
    .insert({
      owner_id: input.ownerId,
      dungeon_id: input.dungeonId,
      status: 'in_progress',
      current_room_index: 0,
      rng_seed: input.rngSeed,
      rng_cursor: 0,
      expected_turns_per_room: input.expectedTurnsPerRoom,
      total_expected_turns: input.totalExpectedTurns,
      total_turns: 0,
      team_snapshot: input.teamSnapshot,
      rooms: [],
    })
    .select('*')
    .single();
  if (error || !data) throw new Error(`Failed to create run: ${error?.message}`);
  return data as DungeonRunRow;
}

export async function updateRun(runId: string, patch: Record<string, unknown>): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('dungeon_runs').update(patch).eq('id', runId);
  if (error) throw new Error(`Failed to update run ${runId}: ${error.message}`);
}

export type RunRoomResultRow = {
  run_id: string;
  room_index: number;
  room_type: string;
  choice: 'heal' | 'chest' | null;
  turns: number | null;
  item_id: string | null;
};

export async function getRoomResult(runId: string, roomIndex: number): Promise<RunRoomResultRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('run_room_results')
    .select('*')
    .eq('run_id', runId)
    .eq('room_index', roomIndex)
    .maybeSingle();
  if (error) throw new Error(`Failed to load room result: ${error.message}`);
  return (data as RunRoomResultRow | null) ?? null;
}

export async function insertRoomResult(row: {
  runId: string;
  roomIndex: number;
  roomType: string;
  choice: 'heal' | 'chest' | null;
  turns?: number | null;
  itemId?: string | null;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('run_room_results').insert({
    run_id: row.runId,
    room_index: row.roomIndex,
    room_type: row.roomType,
    choice: row.choice,
    turns: row.turns ?? null,
    item_id: row.itemId ?? null,
  });
  if (error) throw new Error(`Failed to insert room result: ${error.message}`);
}

import { createAdminClient } from '@/lib/supabase/admin';
import type { EncounterState, LogEntry } from '@/lib/game/types';

export type CombatEncounterRow = {
  id: string;
  run_id: string;
  room_index: number;
  status: 'active' | 'won' | 'lost';
  turn_count: number;
  round_pointer: number;
  state: EncounterState;
  log: LogEntry[];
  created_at: string;
  resolved_at: string | null;
};

export async function getEncounterForRoom(runId: string, roomIndex: number): Promise<CombatEncounterRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('combat_encounters')
    .select('*')
    .eq('run_id', runId)
    .eq('room_index', roomIndex)
    .maybeSingle();
  if (error) throw new Error(`Failed to load encounter: ${error.message}`);
  return (data as CombatEncounterRow | null) ?? null;
}

export async function insertEncounter(input: {
  runId: string;
  roomIndex: number;
  state: EncounterState;
  log?: LogEntry[];
  status?: 'active' | 'won' | 'lost';
}): Promise<CombatEncounterRow> {
  const admin = createAdminClient();
  const status = input.status ?? 'active';
  const { data, error } = await admin
    .from('combat_encounters')
    .insert({
      run_id: input.runId,
      room_index: input.roomIndex,
      status,
      turn_count: 0,
      round_pointer: input.state.orderIndex,
      state: input.state,
      log: input.log ?? [],
      resolved_at: status === 'active' ? null : new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error || !data) throw new Error(`Failed to create encounter: ${error?.message}`);
  return data as CombatEncounterRow;
}

export async function updateEncounter(
  id: string,
  patch: Partial<{
    status: 'active' | 'won' | 'lost';
    turn_count: number;
    round_pointer: number;
    state: EncounterState;
    log: LogEntry[];
    resolved_at: string | null;
  }>
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('combat_encounters').update(patch).eq('id', id);
  if (error) throw new Error(`Failed to update encounter ${id}: ${error.message}`);
}

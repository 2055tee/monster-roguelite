'use server';

import type { LogEntry, RunView } from '@/lib/game/types';

export async function submitCombatAction(
  runId: string,
  input: { actorId: string; abilityId: string; targetId: string }
): Promise<{ view: RunView; newLogEntries: LogEntry[] }> {
  throw new Error('not implemented — WP3');
}

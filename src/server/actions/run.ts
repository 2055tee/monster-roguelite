'use server';

import type { ActionError, ActionResult, RunView } from '@/lib/game/types';

export async function startRun(dungeonId: string): Promise<{ runId: string } | ActionError> {
  throw new Error('not implemented — WP3');
}

export async function getRunState(runId: string): Promise<RunView> {
  throw new Error('not implemented — WP3');
}

export async function enterRoom(runId: string): Promise<RunView> {
  throw new Error('not implemented — WP3');
}

export async function chooseRestOption(runId: string, choice: 'heal' | 'chest'): Promise<RunView> {
  throw new Error('not implemented — WP3');
}

export async function abandonRun(runId: string): Promise<ActionResult> {
  throw new Error('not implemented — WP3');
}

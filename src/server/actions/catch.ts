'use server';

import type { OwnedMonster } from '@/lib/game/types';

export async function getCatchPreview(runId: string): Promise<{
  performance: number;
  baseChance: number;
  faintPenalty: number;
  availableLures: { itemId: string; name: string; bonus: number; quantity: number }[];
}> {
  throw new Error('not implemented — WP3');
}

export async function attemptCatch(
  runId: string,
  consumableItemIds: string[]
): Promise<{ chance: number; roll: number; success: boolean; monster?: OwnedMonster }> {
  throw new Error('not implemented — WP3');
}

export async function finishRun(
  runId: string
): Promise<{ gold: number; healing: { monsterId: string; until: string }[] }> {
  throw new Error('not implemented — WP3');
}

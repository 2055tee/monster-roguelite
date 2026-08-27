'use server';

import type { ActionResult, HubView } from '@/lib/game/types';

export async function ensureBootstrap(): Promise<void> {
  throw new Error('not implemented — WP3');
}

export async function getHubState(): Promise<HubView> {
  throw new Error('not implemented — WP3');
}

export async function setTeamSlot(monsterId: string, slot: 0 | 1 | 2): Promise<ActionResult> {
  throw new Error('not implemented — WP3');
}

export async function equipItem(monsterId: string, itemId: string | null): Promise<ActionResult> {
  throw new Error('not implemented — WP3');
}

export async function useElixir(monsterId: string): Promise<ActionResult> {
  throw new Error('not implemented — WP3');
}

export async function skipHealing(monsterId: string): Promise<ActionResult> {
  throw new Error('not implemented — WP3');
}

import type { ItemRarity } from './types';
import type { createRng } from './rng';

/** v1, locked -- see CLAUDE.md's Shop + Reforge plan. */
export const REFORGE_CAP: Record<ItemRarity, number> = {
  common: 6,
  rare: 9,
  epic: 12,
  legendary: 15,
};

export function reforgeCap(rarity: ItemRarity): number {
  return REFORGE_CAP[rarity];
}

/** Chance to succeed reaching +target. +1 -> 95%, +10 -> 50%, +15 -> 25%. */
export function reforgeSuccessChance(targetLevel: number): number {
  const chance = (100 - 5 * targetLevel) / 100;
  return Math.max(0.05, Math.min(1, chance));
}

export function canReforge(rarity: ItemRarity, currentLevel: number): boolean {
  return currentLevel < reforgeCap(rarity);
}

export function rollReforge(
  rng: ReturnType<typeof createRng>,
  targetLevel: number
): { chance: number; roll: number; success: boolean } {
  const chance = reforgeSuccessChance(targetLevel);
  const roll = rng.next();
  return { chance, roll, success: roll < chance };
}

/** The item effect's value after reforge, before it's applied to a base stat. */
export function effectValueAtLevel(baseValue: number, reforgeLevel: number): number {
  return baseValue * (1 + 0.05 * reforgeLevel);
}

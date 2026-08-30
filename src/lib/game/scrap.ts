import type { createRng } from './rng';
import type { ItemRarity, ScrapCounts } from './types';

/** v1, locked -- see CLAUDE.md's Shop + Reforge plan. Higher dungeon tiers skew toward rarer scrap. */
export const SCRAP_TIER_WEIGHTS_BY_DUNGEON_TIER: Record<number, Record<ItemRarity, number>> = {
  1: { common: 85, rare: 13, epic: 2, legendary: 0 },
  2: { common: 65, rare: 27, epic: 7, legendary: 1 },
  3: { common: 45, rare: 35, epic: 17, legendary: 3 },
  4: { common: 25, rare: 38, epic: 29, legendary: 8 },
};

const RARITY_ORDER: ItemRarity[] = ['common', 'rare', 'epic', 'legendary'];

function clampTier(tier: number): number {
  return Math.max(1, Math.min(4, Math.round(tier)));
}

function rollTier(rng: ReturnType<typeof createRng>, weights: Record<ItemRarity, number>): ItemRarity {
  const total = weights.common + weights.rare + weights.epic + weights.legendary;
  let roll = rng.next() * total;
  for (const rarity of RARITY_ORDER) {
    roll -= weights[rarity];
    if (roll < 0) return rarity;
  }
  return 'legendary';
}

/** 1-3 units per dungeon clear; each unit's rarity tier is rolled independently. */
export function rollScrapDrop(rng: ReturnType<typeof createRng>, difficultyTier: number): ScrapCounts {
  const weights = SCRAP_TIER_WEIGHTS_BY_DUNGEON_TIER[clampTier(difficultyTier)];
  const quantity = 1 + Math.floor(rng.next() * 3);

  const result: ScrapCounts = { common: 0, rare: 0, epic: 0, legendary: 0 };
  for (let i = 0; i < quantity; i++) {
    result[rollTier(rng, weights)] += 1;
  }
  return result;
}

import type { createRng } from './rng';
import { CATCH_CHANCE_CEILING, CATCH_CHANCE_FLOOR } from './constants';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computePerformance(expected: number, actual: number): number {
  return clamp(expected / actual, 0.5, 1.5);
}

export function computeCatchChance(
  base: number,
  performance: number,
  faintCount: number,
  consumableBonus: number
): number {
  return clamp(
    base * performance - 0.1 * faintCount + consumableBonus,
    CATCH_CHANCE_FLOOR,
    CATCH_CHANCE_CEILING
  );
}

export function rollChest(
  rng: ReturnType<typeof createRng>,
  dropTable: { itemId: string; weight: number }[]
): string {
  const totalWeight = dropTable.reduce((sum, entry) => sum + entry.weight, 0);
  let r = rng.next() * totalWeight;
  for (const entry of dropTable) {
    r -= entry.weight;
    if (r < 0) {
      return entry.itemId;
    }
  }
  // Fallback for floating point edge cases: return the last entry.
  return dropTable[dropTable.length - 1].itemId;
}

import type { createRng } from './rng';

export function computePerformance(expected: number, actual: number): number {
  throw new Error('not implemented — WP2');
}

export function computeCatchChance(
  base: number,
  performance: number,
  faintCount: number,
  consumableBonus: number
): number {
  throw new Error('not implemented — WP2');
}

export function rollChest(
  rng: ReturnType<typeof createRng>,
  dropTable: { itemId: string; weight: number }[]
): string {
  throw new Error('not implemented — WP2');
}

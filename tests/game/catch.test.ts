import { describe, expect, it } from 'vitest';
import { computeCatchChance, computePerformance, rollChest } from '../../src/lib/game/catch';
import { createRng } from '../../src/lib/game/rng';
import { CATCH_CHANCE_CEILING, CATCH_CHANCE_FLOOR } from '../../src/lib/game/constants';

describe('computePerformance', () => {
  it('clamps between 0.5 and 1.5', () => {
    expect(computePerformance(1, 1000)).toBe(0.5);
    expect(computePerformance(1000, 1)).toBe(1.5);
    expect(computePerformance(10, 10)).toBe(1);
  });
});

describe('computeCatchChance', () => {
  it('clamps at the floor with extreme low inputs', () => {
    const chance = computeCatchChance(0.01, 0.5, 20, 0);
    expect(chance).toBe(CATCH_CHANCE_FLOOR);
  });

  it('clamps at the ceiling with extreme high inputs', () => {
    const chance = computeCatchChance(0.9, 1.5, 0, 0.5);
    expect(chance).toBe(CATCH_CHANCE_CEILING);
  });

  it('computes an unclamped value in the middle of the range', () => {
    const chance = computeCatchChance(0.4, 1.0, 0, 0);
    expect(chance).toBeCloseTo(0.4);
  });
});

describe('rollChest', () => {
  it('respects weights roughly over many trials', () => {
    const table = [
      { itemId: 'common', weight: 80 },
      { itemId: 'rare', weight: 15 },
      { itemId: 'epic', weight: 5 },
    ];
    const rng = createRng(7, 0);
    const counts: Record<string, number> = { common: 0, rare: 0, epic: 0 };
    for (let i = 0; i < 1000; i++) {
      const result = rollChest(rng, table);
      counts[result] += 1;
    }
    expect(counts.common).toBeGreaterThan(counts.rare);
    expect(counts.rare).toBeGreaterThan(counts.epic);
    expect(counts.common).toBeGreaterThan(600);
  });

  it('always returns a valid itemId', () => {
    const table = [
      { itemId: 'a', weight: 1 },
      { itemId: 'b', weight: 1 },
    ];
    const rng = createRng(1, 0);
    for (let i = 0; i < 50; i++) {
      const result = rollChest(rng, table);
      expect(['a', 'b']).toContain(result);
    }
  });
});

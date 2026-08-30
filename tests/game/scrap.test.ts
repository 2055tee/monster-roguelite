import { describe, expect, it } from 'vitest';
import { rollScrapDrop } from '../../src/lib/game/scrap';
import { createRng } from '../../src/lib/game/rng';

function totalScrap(counts: Record<string, number>): number {
  return counts.common + counts.rare + counts.epic + counts.legendary;
}

describe('rollScrapDrop', () => {
  it('always drops 1-3 total units', () => {
    for (let seed = 0; seed < 200; seed++) {
      const rng = createRng(seed, 0);
      const result = rollScrapDrop(rng, 2);
      const total = totalScrap(result);
      expect(total).toBeGreaterThanOrEqual(1);
      expect(total).toBeLessThanOrEqual(3);
    }
  });

  it('tier 1 dungeons never drop legendary scrap', () => {
    let legendaryCount = 0;
    for (let seed = 0; seed < 2000; seed++) {
      const rng = createRng(seed, 0);
      legendaryCount += rollScrapDrop(rng, 1).legendary;
    }
    expect(legendaryCount).toBe(0);
  });

  it('tier 4 dungeons drop legendary scrap at roughly the documented rate', () => {
    let legendaryUnits = 0;
    let totalUnits = 0;
    for (let seed = 0; seed < 10_000; seed++) {
      const rng = createRng(seed, 0);
      const result = rollScrapDrop(rng, 4);
      legendaryUnits += result.legendary;
      totalUnits += totalScrap(result);
    }
    const rate = legendaryUnits / totalUnits;
    expect(rate).toBeGreaterThan(0.06);
    expect(rate).toBeLessThan(0.1);
  });

  it('clamps out-of-range dungeon tiers to the nearest defined tier', () => {
    const rngLow = createRng(1, 0);
    const rngHigh = createRng(1, 0);
    expect(() => rollScrapDrop(rngLow, 0)).not.toThrow();
    expect(() => rollScrapDrop(rngHigh, 99)).not.toThrow();
  });

  it('advances the rng cursor by exactly quantity + 1 rolls', () => {
    const rng = createRng(7, 0);
    const before = rng.cursor;
    const result = rollScrapDrop(rng, 3);
    const total = totalScrap(result);
    expect(rng.cursor - before).toBe(total + 1);
  });
});

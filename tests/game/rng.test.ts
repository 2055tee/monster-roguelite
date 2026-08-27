import { describe, expect, it } from 'vitest';
import { createRng } from '../../src/lib/game/rng';

describe('createRng', () => {
  it('produces identical sequences for the same seed and cursor', () => {
    const a = createRng(12345, 0);
    const b = createRng(12345, 0);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('resuming from a persisted cursor reproduces the same future sequence', () => {
    const full = createRng(999, 0);
    const firstFive = Array.from({ length: 5 }, () => full.next());
    const restOfFull = Array.from({ length: 10 }, () => full.next());

    // Resume from the cursor after the first five draws.
    const resumed = createRng(999, 5);
    const restResumed = Array.from({ length: 10 }, () => resumed.next());

    expect(restResumed).toEqual(restOfFull);
    expect(firstFive.length).toBe(5);
  });

  it('advances the .cursor property in place on each call', () => {
    const rng = createRng(1, 0);
    expect(rng.cursor).toBe(0);
    rng.next();
    expect(rng.cursor).toBe(1);
    rng.next();
    rng.next();
    expect(rng.cursor).toBe(3);
  });

  it('produces floats in [0, 1)', () => {
    const rng = createRng(42, 0);
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

import { describe, expect, it } from 'vitest';
import {
  REFORGE_CAP,
  canReforge,
  effectValueAtLevel,
  reforgeCap,
  reforgeSuccessChance,
  rollReforge,
} from '../../src/lib/game/reforge';
import { createRng } from '../../src/lib/game/rng';

describe('reforgeCap', () => {
  it('matches the locked caps per rarity', () => {
    expect(reforgeCap('common')).toBe(6);
    expect(reforgeCap('rare')).toBe(9);
    expect(reforgeCap('epic')).toBe(12);
    expect(reforgeCap('legendary')).toBe(15);
    expect(REFORGE_CAP).toEqual({ common: 6, rare: 9, epic: 12, legendary: 15 });
  });
});

describe('reforgeSuccessChance', () => {
  it('matches the documented ladder', () => {
    expect(reforgeSuccessChance(1)).toBeCloseTo(0.95);
    expect(reforgeSuccessChance(10)).toBeCloseTo(0.5);
    expect(reforgeSuccessChance(15)).toBeCloseTo(0.25);
  });

  it('clamps to a 5% floor and never exceeds 100%', () => {
    expect(reforgeSuccessChance(19)).toBeCloseTo(0.05);
    expect(reforgeSuccessChance(0)).toBe(1);
  });
});

describe('canReforge', () => {
  it('is true below cap and false at or above cap', () => {
    expect(canReforge('common', 5)).toBe(true);
    expect(canReforge('common', 6)).toBe(false);
    expect(canReforge('legendary', 14)).toBe(true);
    expect(canReforge('legendary', 15)).toBe(false);
  });
});

describe('effectValueAtLevel', () => {
  it('adds 5% per level to the base value', () => {
    expect(effectValueAtLevel(0.1, 0)).toBeCloseTo(0.1);
    expect(effectValueAtLevel(0.1, 6)).toBeCloseTo(0.13);
    expect(effectValueAtLevel(0.42, 15)).toBeCloseTo(0.735);
  });
});

describe('rollReforge', () => {
  it('succeeds when the roll is below the chance and reports both values', () => {
    // seed/cursor chosen so the first roll is well below any realistic chance
    const rng = createRng(1, 0);
    const first = rng.next();
    const rng2 = createRng(1, 0);
    const result = rollReforge(rng2, 1);
    expect(result.chance).toBeCloseTo(0.95);
    expect(result.roll).toBeCloseTo(first);
    expect(result.success).toBe(first < 0.95);
  });

  it('advances the rng cursor by exactly one', () => {
    const rng = createRng(42, 0);
    rollReforge(rng, 5);
    expect(rng.cursor).toBe(1);
  });
});

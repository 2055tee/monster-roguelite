import { describe, expect, it } from 'vitest';
import { MAX_LEVEL, applyXp, roomXp, xpProgress, xpToNext } from '../../src/lib/game/xp';

describe('xpToNext', () => {
  it('matches the documented curve values', () => {
    expect(xpToNext(1)).toBe(50);
    expect(xpToNext(2)).toBe(75);
    expect(xpToNext(3)).toBe(150);
    expect(xpToNext(4)).toBe(275);
    expect(xpToNext(5)).toBe(450);
    expect(xpToNext(6)).toBe(675);
    expect(xpToNext(7)).toBe(950);
  });

  it('is monotonically increasing up to the level cap', () => {
    for (let l = 1; l < MAX_LEVEL; l++) {
      expect(xpToNext(l + 1)).toBeGreaterThan(xpToNext(l));
    }
  });

  it('returns Infinity at and above the level cap', () => {
    expect(xpToNext(MAX_LEVEL)).toBe(Infinity);
    expect(xpToNext(MAX_LEVEL + 5)).toBe(Infinity);
  });
});

describe('roomXp', () => {
  it('scales with room level and triples for a boss room', () => {
    const normal = roomXp(0, false);
    const boss = roomXp(0, true);
    expect(boss).toBe(normal * 3);
    expect(roomXp(8, false)).toBeGreaterThan(roomXp(0, false));
  });

  it('matches the documented Verdant Hollow numbers', () => {
    // enemyLevel 0 combat rooms, boss at enemyLevel+3 = 3
    expect(roomXp(0, false)).toBe(10);
    expect(roomXp(3, true)).toBe(44);
  });
});

describe('applyXp', () => {
  it('accumulates xp without leveling when the gain is below the threshold', () => {
    const result = applyXp(2, 0, 30);
    expect(result).toEqual({ level: 2, xp: 30, levelsGained: 0 });
  });

  it('levels up exactly once when the gain crosses one threshold', () => {
    const result = applyXp(2, 0, xpToNext(2));
    expect(result.level).toBe(3);
    expect(result.xp).toBe(0);
    expect(result.levelsGained).toBe(1);
  });

  it('can level up multiple times from one large gain', () => {
    const result = applyXp(1, 0, xpToNext(1) + xpToNext(2) + 10);
    expect(result.level).toBe(3);
    expect(result.xp).toBe(10);
    expect(result.levelsGained).toBe(2);
  });

  it('clamps at MAX_LEVEL and discards overflow xp', () => {
    const hugeGain = 10 ** 9;
    const result = applyXp(1, 0, hugeGain);
    expect(result.level).toBe(MAX_LEVEL);
    expect(result.xp).toBe(0);
  });

  it('treats a negative gain as zero rather than reducing xp', () => {
    const result = applyXp(2, 20, -50);
    expect(result).toEqual({ level: 2, xp: 20, levelsGained: 0 });
  });

  it('does nothing when already at MAX_LEVEL', () => {
    const result = applyXp(MAX_LEVEL, 0, 500);
    expect(result).toEqual({ level: MAX_LEVEL, xp: 0, levelsGained: 0 });
  });
});

describe('xpProgress', () => {
  it('reports fractional progress toward the next level', () => {
    const p = xpProgress(2, 30);
    expect(p.current).toBe(30);
    expect(p.needed).toBe(75);
    expect(p.pct).toBeCloseTo(30 / 75);
  });

  it('reports a full bar with no needed xp at MAX_LEVEL', () => {
    const p = xpProgress(MAX_LEVEL, 0);
    expect(p).toEqual({ current: 0, needed: 0, pct: 1 });
  });

  it('clamps pct to [0, 1] even with out-of-range input', () => {
    expect(xpProgress(2, -10).pct).toBe(0);
    expect(xpProgress(2, 10000).pct).toBe(1);
  });
});

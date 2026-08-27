import { describe, expect, it } from 'vitest';
import { computeExpectedTurns } from '../../src/lib/game/dungeon';

describe('computeExpectedTurns', () => {
  it('clamps expectedTurnsPerRoom to at least 3 when the team vastly outpowers the boss', () => {
    const { expectedTurnsPerRoom, totalExpectedTurns } = computeExpectedTurns(1_000_000, 1);
    expect(expectedTurnsPerRoom).toBe(3);
    expect(totalExpectedTurns).toBe(12);
  });

  it('clamps expectedTurnsPerRoom to at most 15 when the boss vastly outpowers the team', () => {
    const { expectedTurnsPerRoom, totalExpectedTurns } = computeExpectedTurns(1, 1_000_000);
    expect(expectedTurnsPerRoom).toBe(15);
    expect(totalExpectedTurns).toBe(60);
  });

  it('computes a mid-range value when powers are close', () => {
    const { expectedTurnsPerRoom, totalExpectedTurns } = computeExpectedTurns(100, 100);
    // R = 1, 6/R = 6
    expect(expectedTurnsPerRoom).toBe(6);
    expect(totalExpectedTurns).toBe(24);
  });
});

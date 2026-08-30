import { describe, expect, it } from 'vitest';
import {
  TYPE_ADVANTAGE_MULT,
  TYPE_DISADVANTAGE_MULT,
  TYPE_NEUTRAL_MULT,
  hasAdvantage,
  hasDisadvantage,
  typeMultiplier,
} from '../../src/lib/game/elements';
import type { Element } from '../../src/lib/game/types';

const ALL: Element[] = ['fire', 'nature', 'earth', 'electric', 'water', 'normal', 'light', 'dark'];

describe('the 5-element core cycle', () => {
  it('matches the documented beats/weak-to chart', () => {
    const beats: Record<string, Element> = {
      fire: 'nature',
      nature: 'earth',
      earth: 'electric',
      electric: 'water',
      water: 'fire',
    };
    for (const [attacker, defender] of Object.entries(beats)) {
      expect(hasAdvantage(attacker as Element, defender)).toBe(true);
      expect(hasAdvantage(defender, attacker as Element)).toBe(false);
      expect(hasDisadvantage(defender, attacker as Element)).toBe(true);
    }
  });

  it('is neutral between non-adjacent cycle elements', () => {
    expect(hasAdvantage('fire', 'earth')).toBe(false);
    expect(hasDisadvantage('fire', 'earth')).toBe(false);
    expect(hasAdvantage('fire', 'electric')).toBe(false);
    expect(hasAdvantage('nature', 'water')).toBe(false);
  });
});

describe('Normal', () => {
  it('never has an advantage against anything', () => {
    for (const el of ALL) {
      expect(hasAdvantage('normal', el)).toBe(false);
    }
  });

  it('is never disadvantaged against anything', () => {
    for (const el of ALL) {
      expect(hasDisadvantage('normal', el)).toBe(false);
    }
  });

  it('produces a neutral multiplier in both directions vs every element', () => {
    for (const el of ALL) {
      expect(typeMultiplier('normal', el)).toBe(TYPE_NEUTRAL_MULT);
      expect(typeMultiplier(el, 'normal')).toBe(TYPE_NEUTRAL_MULT);
    }
  });
});

describe('Light vs Dark', () => {
  it('is a mutual rivalry -- both directions get the advantage multiplier', () => {
    expect(hasAdvantage('light', 'dark')).toBe(true);
    expect(hasAdvantage('dark', 'light')).toBe(true);
    expect(typeMultiplier('light', 'dark')).toBe(TYPE_ADVANTAGE_MULT);
    expect(typeMultiplier('dark', 'light')).toBe(TYPE_ADVANTAGE_MULT);
  });

  it('is neutral against every element outside the rivalry, both directions', () => {
    const others: Element[] = ['fire', 'nature', 'earth', 'electric', 'water', 'normal'];
    for (const el of others) {
      expect(typeMultiplier('light', el)).toBe(TYPE_NEUTRAL_MULT);
      expect(typeMultiplier(el, 'light')).toBe(TYPE_NEUTRAL_MULT);
      expect(typeMultiplier('dark', el)).toBe(TYPE_NEUTRAL_MULT);
      expect(typeMultiplier(el, 'dark')).toBe(TYPE_NEUTRAL_MULT);
    }
  });
});

describe('typeMultiplier', () => {
  it('returns the documented multiplier values', () => {
    expect(typeMultiplier('fire', 'nature')).toBe(1.25);
    expect(typeMultiplier('water', 'fire')).toBe(1.25);
    expect(typeMultiplier('nature', 'fire')).toBe(0.8);
    expect(typeMultiplier('fire', 'water')).toBe(0.8);
    expect(typeMultiplier('fire', 'electric')).toBe(1.0);
  });

  it('every element pairing resolves to exactly one of the three multipliers', () => {
    for (const a of ALL) {
      for (const b of ALL) {
        const mult = typeMultiplier(a, b);
        expect([TYPE_ADVANTAGE_MULT, TYPE_DISADVANTAGE_MULT, TYPE_NEUTRAL_MULT]).toContain(mult);
      }
    }
  });

  it('is self-consistent: a cannot simultaneously have advantage and disadvantage vs itself', () => {
    for (const el of ALL) {
      expect(typeMultiplier(el, el)).toBe(TYPE_NEUTRAL_MULT);
    }
  });
});

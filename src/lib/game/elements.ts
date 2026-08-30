import type { Element } from './types';

/**
 * v1, locked -- see GAME_DESIGN.md §4. 5-element core cycle (each beats the
 * next, is weak to the previous) + Normal (always neutral) + Light/Dark
 * (mutual rivalry only, neutral to everything else including each other's
 * non-rival matchups).
 */
const CYCLE: Element[] = ['fire', 'nature', 'earth', 'electric', 'water'];

export const TYPE_ADVANTAGE_MULT = 1.25;
export const TYPE_DISADVANTAGE_MULT = 0.8;
export const TYPE_NEUTRAL_MULT = 1.0;

/** True if `attacker` has a type advantage when hitting `defender`. */
export function hasAdvantage(attacker: Element, defender: Element): boolean {
  const cycleIdx = CYCLE.indexOf(attacker);
  if (cycleIdx !== -1) {
    return CYCLE[(cycleIdx + 1) % CYCLE.length] === defender;
  }
  if (attacker === 'light') return defender === 'dark';
  if (attacker === 'dark') return defender === 'light';
  return false; // Normal never has an advantage.
}

/** True if `attacker` has a type disadvantage when hitting `defender` (i.e. defender has the advantage). */
export function hasDisadvantage(attacker: Element, defender: Element): boolean {
  return hasAdvantage(defender, attacker);
}

/** The damage multiplier for `attacker`'s element attacking `defender`'s element. */
export function typeMultiplier(attacker: Element, defender: Element): number {
  if (hasAdvantage(attacker, defender)) return TYPE_ADVANTAGE_MULT;
  if (hasDisadvantage(attacker, defender)) return TYPE_DISADVANTAGE_MULT;
  return TYPE_NEUTRAL_MULT;
}

import type { Item, Stats } from './types';

/** Each reforge level adds a flat +5% to the item's effect value (+10 = +50%). */
export function reforgeBonusMultiplier(reforgeLevel: number): number {
  return 1 + 0.05 * reforgeLevel;
}

export function applyEquipmentModifier(base: Stats, item: Item | null, reforgeLevel = 0): Stats {
  if (!item || item.effect.type !== 'stat_pct') {
    return base;
  }
  const { stat, value } = item.effect;
  const effectiveValue = value * reforgeBonusMultiplier(reforgeLevel);
  return {
    ...base,
    [stat]: Math.floor(base[stat] * (1 + effectiveValue)),
  };
}

import type { Item, Stats } from './types';

export function applyEquipmentModifier(base: Stats, item: Item | null): Stats {
  if (!item || item.effect.type !== 'stat_pct') {
    return base;
  }
  const { stat, value } = item.effect;
  return {
    ...base,
    [stat]: Math.floor(base[stat] * (1 + value)),
  };
}

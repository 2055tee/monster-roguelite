import type { Item, MonsterSpecies, OwnedMonster, Stats } from './types';

export function effectiveStats(
  species: MonsterSpecies,
  monster: OwnedMonster,
  equippedItem: Item | null
): Stats {
  throw new Error('not implemented — WP2');
}

export function power(stats: Stats): number {
  throw new Error('not implemented — WP2');
}

import type { Item, MonsterSpecies, OwnedMonster, Stats } from './types';
import { applyEquipmentModifier } from './items';

export function effectiveStats(
  species: MonsterSpecies,
  monster: OwnedMonster,
  equippedItem: Item | null
): Stats {
  const levelMult = 1 + 0.1 * (monster.level - 1);
  const base: Stats = {
    hp: Math.floor(species.baseStats.hp * monster.rolls.hp * levelMult),
    atk: Math.floor(species.baseStats.atk * monster.rolls.atk * levelMult),
    def: Math.floor(species.baseStats.def * monster.rolls.def * levelMult),
    spd: Math.floor(species.baseStats.spd * monster.rolls.spd * levelMult),
  };
  return applyEquipmentModifier(base, equippedItem);
}

export function power(stats: Stats): number {
  return stats.hp / 5 + stats.atk * 2 + stats.def * 1.5 + stats.spd * 1;
}

import { describe, expect, it } from 'vitest';
import { applyEquipmentModifier } from '../../src/lib/game/items';
import { effectiveStats, power } from '../../src/lib/game/stats';
import type { Item, MonsterSpecies, OwnedMonster } from '../../src/lib/game/types';

describe('applyEquipmentModifier', () => {
  const base = { hp: 100, atk: 20, def: 10, spd: 5 };

  it('returns base unchanged when item is null', () => {
    expect(applyEquipmentModifier(base, null)).toEqual(base);
  });

  it('returns base unchanged when effect is not stat_pct', () => {
    const item: Item = {
      id: 'lure',
      name: 'Lure',
      category: 'consumable',
      description: 'x',
      effect: { type: 'catch_bonus', value: 0.1 },
      dropWeight: 1,
      rarity: 'common',
    };
    expect(applyEquipmentModifier(base, item)).toEqual(base);
  });

  it('applies a stat_pct modifier to only the specified stat', () => {
    const item: Item = {
      id: 'sword',
      name: 'Sword',
      category: 'equipment',
      description: 'x',
      effect: { type: 'stat_pct', stat: 'atk', value: 0.5 },
      dropWeight: 1,
      rarity: 'common',
    };
    const result = applyEquipmentModifier(base, item);
    expect(result.atk).toBe(30); // floor(20 * 1.5)
    expect(result.hp).toBe(100);
    expect(result.def).toBe(10);
    expect(result.spd).toBe(5);
  });

  it('scales the modifier up with reforge level', () => {
    const item: Item = {
      id: 'charm',
      name: 'Minor Charm',
      category: 'equipment',
      description: 'x',
      effect: { type: 'stat_pct', stat: 'atk', value: 0.1 },
      dropWeight: 1,
      rarity: 'common',
    };
    // +6 -> value*1.30 = 0.13 -> floor(20*1.13) = 22
    const result = applyEquipmentModifier(base, item, 6);
    expect(result.atk).toBe(22);
  });
});

describe('effectiveStats + power', () => {
  const species: MonsterSpecies = {
    id: 'sprigling',
    name: 'Sprigling',
    emoji: '🌱',
    element: 'nature',
    baseStats: { hp: 100, atk: 20, def: 15, spd: 10 },
    rarity: 1,
    minTier: 1,
    signatureAbility: 'basic_attack',
    abilityPool: ['heavy_blow', 'mend'],
  };

  const monster: OwnedMonster = {
    id: 'm1',
    speciesId: 'sprigling',
    level: 6,
    xp: 0,
    rolls: { hp: 1, atk: 1, def: 1, spd: 1 },
    abilities: ['basic_attack'],
    teamSlot: 0,
    currentHp: null,
    equippedItemId: null,
    equippedInstanceId: null,
    isStarter: true,
    healingUntil: null,
    caughtAt: new Date().toISOString(),
  };

  it('scales stats by level with no rolls variance and no equipment', () => {
    const stats = effectiveStats(species, monster, null);
    // levelMult = 1 + 0.1*(6-1) = 1.5
    expect(stats.hp).toBe(150);
    expect(stats.atk).toBe(30);
    expect(stats.def).toBe(22); // floor(15*1.5) = 22
    expect(stats.spd).toBe(15);
  });

  it('computes power from stats', () => {
    const stats = { hp: 100, atk: 10, def: 10, spd: 10 };
    // 100/5 + 10*2 + 10*1.5 + 10 = 20+20+15+10 = 65
    expect(power(stats)).toBe(65);
  });
});

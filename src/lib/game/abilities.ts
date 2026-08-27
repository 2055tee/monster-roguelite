type AbilityDef = { name: string; power: number; cooldown: number; kind: string };

const ABILITIES: Record<string, AbilityDef> = {
  basic_attack: { name: 'Strike', power: 1.0, cooldown: 0, kind: 'damage' },
  heavy_blow: { name: 'Heavy Blow', power: 1.9, cooldown: 3, kind: 'damage' },
  swift_strike: { name: 'Swift Strike', power: 1.15, cooldown: 2, kind: 'damage_first_strike' },
  venom_fang: { name: 'Venom Fang', power: 0.8, cooldown: 3, kind: 'damage_poison' },
  bulwark: { name: 'Bulwark', power: 0, cooldown: 3, kind: 'self_heal_shield' },
  war_cry: { name: 'War Cry', power: 0, cooldown: 4, kind: 'team_buff_atk' },
  mend: { name: 'Mend', power: 0, cooldown: 3, kind: 'heal_ally' },
};

export function getAbility(id: string): { name: string; power: number; cooldown: number; kind: string } {
  const ability = ABILITIES[id];
  if (!ability) {
    throw new Error(`Unknown ability id: ${id}`);
  }
  return ability;
}

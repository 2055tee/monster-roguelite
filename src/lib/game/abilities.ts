type AbilityDef = { name: string; power: number; cooldown: number; kind: string; description: string };

const ABILITIES: Record<string, AbilityDef> = {
  basic_attack: {
    name: 'Strike',
    power: 1.0,
    cooldown: 0,
    kind: 'damage',
    description: 'A basic attack with no cooldown.',
  },
  heavy_blow: {
    name: 'Heavy Blow',
    power: 1.9,
    cooldown: 3,
    kind: 'damage',
    description: 'A powerful strike dealing heavy damage.',
  },
  swift_strike: {
    name: 'Swift Strike',
    power: 1.15,
    cooldown: 2,
    kind: 'damage_first_strike',
    description: 'A quick strike that grants priority at the start of next round.',
  },
  venom_fang: {
    name: 'Venom Fang',
    power: 0.8,
    cooldown: 3,
    kind: 'damage_poison',
    description: 'Deals damage and poisons the target, dealing 6% of its max HP per round for 3 rounds.',
  },
  bulwark: {
    name: 'Bulwark',
    power: 0,
    cooldown: 3,
    kind: 'self_heal_shield',
    description: 'Heals self for 15% of max HP and halves incoming damage for 1 round.',
  },
  war_cry: {
    name: 'War Cry',
    power: 0,
    cooldown: 4,
    kind: 'team_buff_atk',
    description: "Boosts the whole team's attack by 25% for 3 rounds.",
  },
  mend: {
    name: 'Mend',
    power: 0,
    cooldown: 3,
    kind: 'heal_ally',
    description: "Heals an ally for 30% of their max HP.",
  },
};

export function getAbility(id: string): AbilityDef {
  const ability = ABILITIES[id];
  if (!ability) {
    throw new Error(`Unknown ability id: ${id}`);
  }
  return ability;
}

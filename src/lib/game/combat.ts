import { getAbility } from './abilities';
import type { createRng } from './rng';
import type { Combatant, EncounterState, LogEntry, MonsterSpecies, Stats } from './types';

type Rng = ReturnType<typeof createRng>;

function cloneState(state: EncounterState): EncounterState {
  return {
    combatants: state.combatants.map((c) => ({
      ...c,
      stats: { ...c.stats },
      cooldowns: { ...c.cooldowns },
      effects: {
        ...c.effects,
        poison: c.effects.poison ? { ...c.effects.poison } : undefined,
      },
    })),
    round: state.round,
    order: [...state.order],
    orderIndex: state.orderIndex,
  };
}

function computeOrder(combatants: Combatant[], rng: Rng): string[] {
  const sortGroup = (group: Combatant[]): string[] => {
    const withKey = group.map((c) => ({ c, key: rng.next() }));
    withKey.sort((a, b) => b.c.stats.spd - a.c.stats.spd || b.key - a.key);
    return withKey.map((x) => x.c.id);
  };
  const firstStrikers = combatants.filter((c) => c.effects.firstStrike && c.currentHp > 0);
  const rest = combatants.filter((c) => !(c.effects.firstStrike && c.currentHp > 0));
  return [...sortGroup(firstStrikers), ...sortGroup(rest)];
}

function firstAliveIndex(order: string[], combatants: Combatant[]): number {
  for (let i = 0; i < order.length; i++) {
    const c = combatants.find((x) => x.id === order[i]);
    if (c && c.currentHp > 0) return i;
  }
  return 0;
}

function nextAliveIndex(state: EncounterState, fromIndexExclusive: number): number {
  for (let i = fromIndexExclusive + 1; i < state.order.length; i++) {
    const c = state.combatants.find((x) => x.id === state.order[i]);
    if (c && c.currentHp > 0) return i;
  }
  return -1;
}

function startNewRound(state: EncounterState, rng: Rng, log: LogEntry[]): void {
  state.round += 1;

  for (const c of state.combatants) {
    for (const key of Object.keys(c.cooldowns)) {
      c.cooldowns[key] = Math.max(0, c.cooldowns[key] - 1);
    }
  }

  for (const c of state.combatants) {
    if (c.currentHp > 0 && c.effects.poison) {
      const dmg = Math.floor(c.stats.hp * c.effects.poison.pct);
      c.currentHp = Math.max(0, c.currentHp - dmg);
      log.push({ round: state.round, text: `${c.name} takes ${dmg} poison damage!` });
      c.effects.poison.rounds -= 1;
      if (c.effects.poison.rounds <= 0) {
        delete c.effects.poison;
      }
    }
  }

  for (const c of state.combatants) {
    if (c.effects.warcry) {
      c.effects.warcry -= 1;
      if (c.effects.warcry <= 0) delete c.effects.warcry;
    }
    if (c.effects.bulwark) {
      c.effects.bulwark -= 1;
      if (c.effects.bulwark <= 0) delete c.effects.bulwark;
    }
  }

  state.order = computeOrder(state.combatants, rng);

  for (const c of state.combatants) {
    delete c.effects.firstStrike;
  }

  state.orderIndex = firstAliveIndex(state.order, state.combatants);
}

function advanceOrPassRound(state: EncounterState, rng: Rng, log: LogEntry[]): void {
  const nextIdx = nextAliveIndex(state, state.orderIndex);
  if (nextIdx === -1) {
    startNewRound(state, rng, log);
  } else {
    state.orderIndex = nextIdx;
  }
}

function applyAbility(
  actor: Combatant,
  ability: { name: string; power: number; cooldown: number; kind: string },
  target: Combatant,
  combatants: Combatant[],
  rng: Rng,
  log: LogEntry[],
  round: number
): void {
  switch (ability.kind) {
    case 'damage':
    case 'damage_first_strike':
    case 'damage_poison': {
      const raw = actor.stats.atk * ability.power * (100 / (100 + target.stats.def));
      const variance = 0.95 + rng.next() * 0.1;
      const atkBuffMult = actor.effects.warcry ? 1.25 : 1;
      const defensiveMult = target.effects.bulwark ? 0.5 : 1;
      const damage = Math.max(1, Math.round(raw * variance * atkBuffMult * defensiveMult));
      target.currentHp = Math.max(0, target.currentHp - damage);
      log.push({
        round,
        text: `${actor.name} used ${ability.name} on ${target.name} for ${damage} damage!`,
      });
      if (ability.kind === 'damage_poison') {
        target.effects.poison = { rounds: 3, pct: 0.06 };
      }
      if (ability.kind === 'damage_first_strike') {
        actor.effects.firstStrike = true;
      }
      break;
    }
    case 'self_heal_shield': {
      const maxHp = actor.stats.hp;
      const heal = Math.floor(maxHp * 0.15);
      actor.currentHp = Math.min(maxHp, actor.currentHp + heal);
      actor.effects.bulwark = 1;
      log.push({
        round,
        text: `${actor.name} used ${ability.name}, healing ${heal} HP and raising its guard!`,
      });
      break;
    }
    case 'team_buff_atk': {
      const allies = combatants.filter((c) => c.side === actor.side && c.currentHp > 0);
      for (const ally of allies) {
        ally.effects.warcry = 3;
      }
      log.push({ round, text: `${actor.name} used ${ability.name}, boosting the team's attack!` });
      break;
    }
    case 'heal_ally': {
      const maxHp = target.stats.hp;
      const heal = Math.floor(maxHp * 0.3);
      target.currentHp = Math.min(maxHp, target.currentHp + heal);
      log.push({
        round,
        text: `${actor.name} used ${ability.name} on ${target.name}, healing ${heal} HP!`,
      });
      break;
    }
    default:
      throw new Error(`Unknown ability kind: ${ability.kind}`);
  }
}

export function buildEnemy(species: MonsterSpecies, level: number, isBoss: boolean): Combatant {
  const rolls = { hp: 1, atk: 1, def: 1, spd: 1 };
  const levelMult = 1 + 0.1 * (level - 1);
  let stats: Stats = {
    hp: Math.floor(species.baseStats.hp * rolls.hp * levelMult),
    atk: Math.floor(species.baseStats.atk * rolls.atk * levelMult),
    def: Math.floor(species.baseStats.def * rolls.def * levelMult),
    spd: Math.floor(species.baseStats.spd * rolls.spd * levelMult),
  };
  if (isBoss) {
    stats = {
      ...stats,
      hp: Math.floor(stats.hp * 1.5),
      atk: Math.floor(stats.atk * 1.25),
    };
  }

  const abilities = [
    'basic_attack',
    species.signatureAbility,
    ...(species.abilityPool[0] ? [species.abilityPool[0]] : []),
  ];

  return {
    id: `enemy-${species.name}-${Math.random().toString(36).slice(2, 8)}`,
    side: 'enemy',
    name: species.name,
    emoji: species.emoji,
    level,
    stats,
    currentHp: stats.hp,
    abilities,
    cooldowns: {},
    effects: {},
  };
}

export function initEncounter(team: Combatant[], enemies: Combatant[], rng: Rng): EncounterState {
  const combatants = [...team, ...enemies];
  const order = computeOrder(combatants, rng);
  return { combatants, round: 1, order, orderIndex: 0 };
}

export function resolvePlayerAction(
  state: EncounterState,
  input: { actorId: string; abilityId: string; targetId: string },
  rng: Rng
): { state: EncounterState; log: LogEntry[] } {
  const newState = cloneState(state);
  const log: LogEntry[] = [];

  const actor = newState.combatants.find((c) => c.id === input.actorId);
  if (!actor) {
    throw new Error(`Unknown actor id: ${input.actorId}`);
  }
  if (actor.currentHp <= 0) {
    throw new Error(`${actor.name} has been defeated and cannot act`);
  }
  if (newState.order[newState.orderIndex] !== actor.id) {
    throw new Error(`It is not ${actor.name}'s turn`);
  }

  const ability = getAbility(input.abilityId);
  if (!actor.abilities.includes(input.abilityId)) {
    throw new Error(`${actor.name} does not know ability ${input.abilityId}`);
  }
  if ((actor.cooldowns[input.abilityId] ?? 0) > 0) {
    throw new Error(`${ability.name} is on cooldown`);
  }

  const target = newState.combatants.find((c) => c.id === input.targetId);
  if (!target) {
    throw new Error(`Unknown target id: ${input.targetId}`);
  }
  if (target.currentHp <= 0 && ability.kind.startsWith('damage')) {
    throw new Error(`${target.name} is already defeated`);
  }

  applyAbility(actor, ability, target, newState.combatants, rng, log, newState.round);
  actor.cooldowns[input.abilityId] = ability.cooldown;

  advanceOrPassRound(newState, rng, log);

  return { state: newState, log };
}

export function runEnemyTurnsUntilPlayer(
  state: EncounterState,
  rng: Rng
): { state: EncounterState; log: LogEntry[] } {
  const newState = cloneState(state);
  const log: LogEntry[] = [];

  // Safety bound to guarantee termination even in pathological states.
  const maxIterations = 1000;
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations += 1;

    const playersAlive = newState.combatants.some((c) => c.side === 'player' && c.currentHp > 0);
    const enemiesAlive = newState.combatants.some((c) => c.side === 'enemy' && c.currentHp > 0);
    if (!playersAlive || !enemiesAlive) break;

    const currentId = newState.order[newState.orderIndex];
    const current = newState.combatants.find((c) => c.id === currentId);
    if (!current || current.currentHp <= 0) {
      advanceOrPassRound(newState, rng, log);
      continue;
    }

    if (current.side === 'player') {
      break;
    }

    const playerTargets = newState.combatants.filter((c) => c.side === 'player' && c.currentHp > 0);
    if (playerTargets.length === 0) break;
    const weakestPlayer = playerTargets.reduce((a, b) => (a.currentHp <= b.currentHp ? a : b));

    let chosenId = 'basic_attack';
    let bestPower = -Infinity;
    for (const abId of current.abilities) {
      const ab = getAbility(abId);
      const cd = current.cooldowns[abId] ?? 0;
      if (cd <= 0 && ab.power > bestPower) {
        bestPower = ab.power;
        chosenId = abId;
      }
    }
    const ability = getAbility(chosenId);

    let chosenTarget: Combatant;
    if (ability.kind === 'heal_ally') {
      const allies = newState.combatants.filter((c) => c.side === current.side && c.currentHp > 0);
      chosenTarget = allies.reduce((a, b) => (a.currentHp / a.stats.hp <= b.currentHp / b.stats.hp ? a : b));
    } else if (ability.kind === 'self_heal_shield' || ability.kind === 'team_buff_atk') {
      chosenTarget = current;
    } else {
      chosenTarget = weakestPlayer;
    }

    applyAbility(current, ability, chosenTarget, newState.combatants, rng, log, newState.round);
    current.cooldowns[chosenId] = ability.cooldown;

    advanceOrPassRound(newState, rng, log);
  }

  return { state: newState, log };
}

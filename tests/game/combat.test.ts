import { describe, expect, it } from 'vitest';
import {
  buildEnemy,
  estimateDamageRange,
  initEncounter,
  resolvePlayerAction,
  runEnemyTurnsUntilPlayer,
} from '../../src/lib/game/combat';
import { createRng } from '../../src/lib/game/rng';
import type { Combatant, LogEntry, MonsterSpecies } from '../../src/lib/game/types';

function makePlayer(id: string, overrides: Partial<Combatant> = {}): Combatant {
  return {
    id,
    side: 'player',
    name: id,
    emoji: '🐲',
    level: 5,
    stats: { hp: 120, atk: 25, def: 12, spd: 15 },
    currentHp: 120,
    abilities: ['basic_attack', 'heavy_blow', 'venom_fang', 'war_cry', 'bulwark', 'mend'],
    cooldowns: {},
    effects: {},
    ...overrides,
  };
}

const weakSpecies: MonsterSpecies = {
  id: 'slime',
  name: 'Slime',
  emoji: '🟢',
  baseStats: { hp: 40, atk: 8, def: 5, spd: 6 },
  rarity: 1,
  minTier: 1,
  signatureAbility: 'basic_attack',
  abilityPool: ['heavy_blow'],
};

function weakestAliveEnemy(combatants: Combatant[]): Combatant {
  const enemies = combatants.filter((c) => c.side === 'enemy' && c.currentHp > 0);
  return enemies.reduce((a, b) => (a.currentHp <= b.currentHp ? a : b));
}

describe('estimateDamageRange', () => {
  it('returns null for non-damage ability kinds', () => {
    const actor = makePlayer('p1');
    const target = buildEnemy(weakSpecies, 1, false);
    expect(estimateDamageRange(actor, 'mend', target)).toBeNull();
    expect(estimateDamageRange(actor, 'bulwark', target)).toBeNull();
    expect(estimateDamageRange(actor, 'war_cry', target)).toBeNull();
  });

  it('bounds every actually-rolled damage roll for a damage ability', () => {
    const actor = makePlayer('p1');
    const target = buildEnemy(weakSpecies, 1, false);
    const range = estimateDamageRange(actor, 'heavy_blow', target);
    expect(range).not.toBeNull();
    expect(range!.min).toBeLessThanOrEqual(range!.max);

    // Roll the real formula many times via resolvePlayerAction and confirm every
    // actual damage dealt falls within [min, max].
    for (let seed = 0; seed < 30; seed++) {
      const rng = createRng(seed, 0);
      const team = [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')];
      const enemies = [buildEnemy(weakSpecies, 1, false)];
      let state = initEncounter(team, enemies, rng);
      while (state.combatants.find((c) => c.id === state.order[state.orderIndex])!.side !== 'player') {
        const r = runEnemyTurnsUntilPlayer(state, rng);
        state = r.state;
      }
      const actorId = state.order[state.orderIndex];
      const targetId = state.combatants.find((c) => c.side === 'enemy')!.id;
      const result = resolvePlayerAction(state, { actorId, abilityId: 'heavy_blow', targetId }, rng);
      const dealt = result.log.find((entry) => entry.text.includes('Heavy Blow'));
      expect(dealt).toBeDefined();
      const match = dealt!.text.match(/for (\d+) damage/);
      expect(match).not.toBeNull();
      const damage = Number(match![1]);
      expect(damage).toBeGreaterThanOrEqual(range!.min);
      expect(damage).toBeLessThanOrEqual(range!.max);
    }
  });

  it('halves the range when the target has an active bulwark guard', () => {
    const actor = makePlayer('p1');
    const target = buildEnemy(weakSpecies, 1, false);
    const guardedTarget = { ...target, effects: { bulwark: 1 } };
    const normal = estimateDamageRange(actor, 'heavy_blow', target)!;
    const guarded = estimateDamageRange(actor, 'heavy_blow', guardedTarget)!;
    expect(guarded.max).toBeLessThan(normal.max);
  });
});

describe('full encounter simulation', () => {
  it('terminates (one side reaches 0 total HP) within a bounded number of rounds', () => {
    const rng = createRng(2024, 0);
    const team = [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')];
    const enemies = [buildEnemy(weakSpecies, 1, false), buildEnemy(weakSpecies, 1, false)];

    let state = initEncounter(team, enemies, rng);
    let allLog: LogEntry[] = [];
    let safety = 0;

    while (safety < 2000) {
      safety += 1;
      const playersAlive = state.combatants.some((c) => c.side === 'player' && c.currentHp > 0);
      const enemiesAlive = state.combatants.some((c) => c.side === 'enemy' && c.currentHp > 0);
      if (!playersAlive || !enemiesAlive) break;

      const actorId = state.order[state.orderIndex];
      const actor = state.combatants.find((c) => c.id === actorId)!;

      if (actor.side === 'enemy') {
        const result = runEnemyTurnsUntilPlayer(state, rng);
        state = result.state;
        allLog = allLog.concat(result.log);
        continue;
      }

      const target = weakestAliveEnemy(state.combatants);
      const result = resolvePlayerAction(state, { actorId: actor.id, abilityId: 'basic_attack', targetId: target.id }, rng);
      state = result.state;
      allLog = allLog.concat(result.log);
    }

    const playersAlive = state.combatants.some((c) => c.side === 'player' && c.currentHp > 0);
    const enemiesAlive = state.combatants.some((c) => c.side === 'enemy' && c.currentHp > 0);

    expect(playersAlive && enemiesAlive).toBe(false); // one side wiped
    expect(state.round).toBeLessThan(50);
    expect(allLog.length).toBeGreaterThan(0);
  });
});

describe('effect and cooldown expiry', () => {
  it('expires poison, cooldowns, and warcry after their durations instead of persisting forever', () => {
    const rng = createRng(555, 0);
    const team = [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')];
    const enemies = [buildEnemy(weakSpecies, 1, false), buildEnemy(weakSpecies, 1, false)];
    let state = initEncounter(team, enemies, rng);

    // Force p1's turn if not already, by cycling enemy turns first.
    const advanceToPlayerTurn = () => {
      while (true) {
        const actorId = state.order[state.orderIndex];
        const actor = state.combatants.find((c) => c.id === actorId)!;
        if (actor.side === 'player') return actor;
        const result = runEnemyTurnsUntilPlayer(state, rng);
        state = result.state;
      }
    };

    const p1Turn1 = advanceToPlayerTurn();
    const enemyTarget = state.combatants.find((c) => c.side === 'enemy')!;

    // p1 casts venom_fang (poison) on an enemy.
    let result = resolvePlayerAction(
      state,
      { actorId: p1Turn1.id, abilityId: 'venom_fang', targetId: enemyTarget.id },
      rng
    );
    state = result.state;

    const poisoned = state.combatants.find((c) => c.id === enemyTarget.id)!;
    expect(poisoned.effects.poison).toBeDefined();
    expect(state.combatants.find((c) => c.id === p1Turn1.id)!.cooldowns['venom_fang']).toBe(3);

    // Cast war_cry from a player actor, then only heal (never attack) afterwards so the
    // encounter doesn't end before the buff/poison/cooldown durations have a chance to expire.
    let p2ActedWarcry = false;
    let castRound: number | null = null;
    let rounds = 0;
    while (rounds < 60) {
      rounds += 1;
      const playersAlive = state.combatants.some((c) => c.side === 'player' && c.currentHp > 0);
      const enemiesAlive = state.combatants.some((c) => c.side === 'enemy' && c.currentHp > 0);
      if (!playersAlive || !enemiesAlive) break;
      if (castRound !== null && state.round >= castRound + 5) break;

      const actorId = state.order[state.orderIndex];
      const actor = state.combatants.find((c) => c.id === actorId)!;

      if (actor.side === 'enemy') {
        const r = runEnemyTurnsUntilPlayer(state, rng);
        state = r.state;
        continue;
      }

      if (!p2ActedWarcry && (actor.cooldowns['war_cry'] ?? 0) === 0) {
        const target = weakestAliveEnemy(state.combatants);
        const r = resolvePlayerAction(state, { actorId: actor.id, abilityId: 'war_cry', targetId: target.id }, rng);
        state = r.state;
        p2ActedWarcry = true;
        castRound = state.round;
      } else {
        // Prefer a non-damaging ability so enemies are not defeated prematurely; only
        // fall back to a basic attack if every non-damaging option is on cooldown.
        const nonDamaging = ['mend', 'bulwark'].find((id) => (actor.cooldowns[id] ?? 0) === 0);
        if (nonDamaging) {
          const r = resolvePlayerAction(state, { actorId: actor.id, abilityId: nonDamaging, targetId: actor.id }, rng);
          state = r.state;
        } else {
          const target = weakestAliveEnemy(state.combatants);
          const r = resolvePlayerAction(state, { actorId: actor.id, abilityId: 'basic_attack', targetId: target.id }, rng);
          state = r.state;
        }
      }
    }

    // After many rounds, poison (3 rounds) and warcry (3 rounds) should have expired,
    // and the venom_fang cooldown (3 rounds) should have ticked back down to 0.
    const finalPoisonedEnemy = state.combatants.find((c) => c.id === enemyTarget.id);
    if (finalPoisonedEnemy && finalPoisonedEnemy.currentHp > 0) {
      expect(finalPoisonedEnemy.effects.poison).toBeUndefined();
    }
    const anyWarcryStillActive = state.combatants.some((c) => c.side === 'player' && c.effects.warcry);
    expect(anyWarcryStillActive).toBe(false);

    const p1Final = state.combatants.find((c) => c.id === p1Turn1.id)!;
    if (p1Final.currentHp > 0) {
      expect(p1Final.cooldowns['venom_fang'] ?? 0).toBe(0);
    }
  });
});

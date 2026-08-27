import type { createRng } from './rng';
import type { Combatant, EncounterState, LogEntry, MonsterSpecies } from './types';

export function buildEnemy(species: MonsterSpecies, level: number, isBoss: boolean): Combatant {
  throw new Error('not implemented — WP2');
}

export function initEncounter(
  team: Combatant[],
  enemies: Combatant[],
  rng: ReturnType<typeof createRng>
): EncounterState {
  throw new Error('not implemented — WP2');
}

export function resolvePlayerAction(
  state: EncounterState,
  input: { actorId: string; abilityId: string; targetId: string },
  rng: ReturnType<typeof createRng>
): { state: EncounterState; log: LogEntry[] } {
  throw new Error('not implemented — WP2');
}

export function runEnemyTurnsUntilPlayer(
  state: EncounterState,
  rng: ReturnType<typeof createRng>
): { state: EncounterState; log: LogEntry[] } {
  throw new Error('not implemented — WP2');
}

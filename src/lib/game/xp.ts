/**
 * XP/leveling system (v1, locked once WP3 lands per CLAUDE.md's "Game
 * design decisions" -- same status as the combat/catch formulas). Pure and
 * I/O-free like the rest of src/lib/game/*; the DB write (finishRun) lives
 * in src/server/actions/catch.ts.
 */

export const MAX_LEVEL = 20;

/** XP required to go from `level` to `level + 1`. Undefined/Infinity at MAX_LEVEL (nothing more to earn toward). */
export function xpToNext(level: number): number {
  if (level >= MAX_LEVEL) return Infinity;
  return 50 + 25 * (level - 1) ** 2;
}

/**
 * XP awarded for clearing one room. `roomLevel` is the enemy level for that
 * room (dungeon.enemyLevel for combat rooms, enemyLevel + 3 for the boss
 * room, matching buildEnemy's level formula). Rest rooms are not passed
 * through here -- callers should treat them as awarding 0.
 */
export function roomXp(roomLevel: number, isBoss: boolean): number {
  return Math.round(10 * (1 + 0.15 * roomLevel) * (isBoss ? 3 : 1));
}

/**
 * Applies a flat XP gain to a (level, xp) pair, resolving as many
 * level-ups as the gain covers (capped at MAX_LEVEL, remaining XP past the
 * cap is discarded rather than left dangling).
 */
export function applyXp(
  level: number,
  xp: number,
  gained: number
): { level: number; xp: number; levelsGained: number } {
  let newLevel = level;
  let newXp = xp + Math.max(0, gained);
  let levelsGained = 0;

  while (newLevel < MAX_LEVEL && newXp >= xpToNext(newLevel)) {
    newXp -= xpToNext(newLevel);
    newLevel += 1;
    levelsGained += 1;
  }

  if (newLevel >= MAX_LEVEL) {
    newLevel = MAX_LEVEL;
    newXp = 0;
  }

  return { level: newLevel, xp: newXp, levelsGained };
}

/** Display helper: current/needed/pct progress toward the next level. */
export function xpProgress(level: number, xp: number): { current: number; needed: number; pct: number } {
  if (level >= MAX_LEVEL) {
    return { current: 0, needed: 0, pct: 1 };
  }
  const needed = xpToNext(level);
  return { current: xp, needed, pct: Math.max(0, Math.min(1, xp / needed)) };
}

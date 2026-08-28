/**
 * Shared glue between the pure game engine (src/lib/game/**) and the DB rows
 * (src/server/repo/**), used by the run/combat/catch action bodies. Not a
 * repo module itself (no direct table ownership) — just business logic that
 * multiple action files need, kept out of repo/ to keep that layer pure
 * data-access.
 */
import type { Combatant, OwnedMonster, RunView } from '@/lib/game/types';
import { effectiveStats, power } from '@/lib/game/stats';
import { getItemById, getSpeciesById } from '@/server/repo/catalog';
import { getDungeonById } from '@/server/repo/catalog';
import { getEncounterForRoom } from '@/server/repo/encounter';
import { getMonsterRowsByIds, mapMonsterRow, type MonsterRow } from '@/server/repo/monster';
import type { DungeonRunRow } from '@/server/repo/run';

/** Build a player-side Combatant for a monster row, fetching species+item as needed. */
export async function buildPlayerCombatant(row: MonsterRow): Promise<Combatant> {
  const species = await getSpeciesById(row.species_id);
  const item = row.equipped_item_id ? await getItemById(row.equipped_item_id) : null;
  const owned = mapMonsterRow(row);
  const stats = effectiveStats(species, owned, item);
  return {
    id: row.id,
    side: 'player',
    name: species.name,
    emoji: species.emoji,
    level: row.level,
    stats,
    currentHp: row.current_hp ?? stats.hp,
    abilities: row.abilities ?? [],
    cooldowns: {},
    effects: {},
  };
}

export async function buildPlayerCombatants(rows: MonsterRow[]): Promise<Combatant[]> {
  return Promise.all(rows.map(buildPlayerCombatant));
}

/** Average `power(effectiveStats(...))` across a team of monster rows. */
export async function computeTeamPower(rows: MonsterRow[]): Promise<number> {
  const combatants = await buildPlayerCombatants(rows);
  const total = combatants.reduce((sum, c) => sum + power(c.stats), 0);
  return total / combatants.length;
}

export async function getMaxHpFor(row: MonsterRow): Promise<number> {
  const species = await getSpeciesById(row.species_id);
  const item = row.equipped_item_id ? await getItemById(row.equipped_item_id) : null;
  const owned = mapMonsterRow(row);
  return effectiveStats(species, owned, item).hp;
}

/** Assemble the full RunView for a run row. Does not perform authorization — callers must verify ownership first. */
export async function buildRunView(run: DungeonRunRow): Promise<RunView> {
  const dungeon = await getDungeonById(run.dungeon_id);
  const teamRows = await getMonsterRowsByIds(run.team_snapshot);
  const rowById = new Map(teamRows.map((r) => [r.id, r]));
  const team: OwnedMonster[] = run.team_snapshot
    .map((id) => rowById.get(id))
    .filter((r): r is MonsterRow => !!r)
    .map(mapMonsterRow);

  const encounterRow = await getEncounterForRoom(run.id, run.current_room_index);
  const encounter = encounterRow?.state ?? null;
  const log = encounterRow?.log ?? [];

  const lastIndex = dungeon.roomLayout.length - 1;
  const isCatchPending =
    run.status === 'in_progress' &&
    run.current_room_index === lastIndex &&
    dungeon.roomLayout[lastIndex] === 'boss' &&
    encounterRow?.status === 'won';

  let catchInfo: RunView['catchInfo'] = null;
  if (isCatchPending) {
    const { getCatchPreview } = await import('@/server/actions/catch');
    catchInfo = await getCatchPreview(run.id);
  }

  let result: RunView['result'] = null;
  if (run.status === 'completed' || run.status === 'failed') {
    let caughtMonster: OwnedMonster | null = null;
    if (run.caught_monster_id) {
      const rows = await getMonsterRowsByIds([run.caught_monster_id]);
      if (rows[0]) caughtMonster = mapMonsterRow(rows[0]);
    }
    result = {
      goldAwarded: run.gold_awarded,
      caughtMonster,
      catchChance: run.catch_chance,
      catchRoll: run.catch_roll,
      catchSucceeded: run.catch_succeeded,
    };
  }

  return {
    runId: run.id,
    dungeonId: run.dungeon_id,
    status: run.status,
    currentRoomIndex: run.current_room_index,
    roomLayout: dungeon.roomLayout,
    team,
    encounter,
    log,
    totalTurns: run.total_turns,
    totalExpectedTurns: run.total_expected_turns,
    catchInfo,
    result,
  };
}

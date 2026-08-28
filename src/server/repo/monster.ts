import { createAdminClient } from '@/lib/supabase/admin';
import { effectiveStats } from '@/lib/game/stats';
import type { Item, MonsterSpecies, OwnedMonster, StatRolls } from '@/lib/game/types';

export type MonsterRow = {
  id: string;
  owner_id: string;
  species_id: string;
  level: number;
  xp: number;
  stats: { rolls: StatRolls };
  abilities: string[];
  team_slot: 0 | 1 | 2 | null;
  current_hp: number | null;
  equipped_item_id: string | null;
  is_starter: boolean;
  healing_until: string | null;
  caught_at: string;
};

export function mapMonsterRow(row: MonsterRow): OwnedMonster {
  return {
    id: row.id,
    speciesId: row.species_id,
    level: row.level,
    xp: row.xp,
    rolls: row.stats.rolls,
    abilities: row.abilities ?? [],
    teamSlot: row.team_slot,
    currentHp: row.current_hp,
    equippedItemId: row.equipped_item_id,
    isStarter: row.is_starter,
    healingUntil: row.healing_until,
    caughtAt: row.caught_at,
  };
}

/** Roll a fresh StatRolls: each stat independently uniform in [0.90, 1.10], rounded to 3dp. */
export function rollStatMultipliers(randomFn: () => number): StatRolls {
  const roll = () => Math.round((0.9 + randomFn() * 0.2) * 1000) / 1000;
  return { hp: roll(), atk: roll(), def: roll(), spd: roll() };
}

/** Pick one entry from a pool deterministically/pseudo-randomly via randomFn. */
export function pickOneFrom<T>(pool: T[], randomFn: () => number): T {
  const idx = Math.min(pool.length - 1, Math.floor(randomFn() * pool.length));
  return pool[idx];
}

export function rollAbilities(species: MonsterSpecies, randomFn: () => number): string[] {
  return [species.signatureAbility, pickOneFrom(species.abilityPool, randomFn)];
}

/** Full max HP for a monster given its species, rolls/level, and equipped item. */
export function computeMaxHp(species: MonsterSpecies, monster: OwnedMonster, equippedItem: Item | null): number {
  return effectiveStats(species, monster, equippedItem).hp;
}

export async function getMonsterRow(id: string): Promise<MonsterRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('monsters').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`Failed to load monster ${id}: ${error.message}`);
  return (data as MonsterRow | null) ?? null;
}

export async function getMonsterRowsByIds(ids: string[]): Promise<MonsterRow[]> {
  if (ids.length === 0) return [];
  const admin = createAdminClient();
  const { data, error } = await admin.from('monsters').select('*').in('id', ids);
  if (error) throw new Error(`Failed to load monsters: ${error.message}`);
  return (data as MonsterRow[]) ?? [];
}

export async function getRosterRows(ownerId: string): Promise<MonsterRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('monsters').select('*').eq('owner_id', ownerId);
  if (error) throw new Error(`Failed to load roster: ${error.message}`);
  return (data as MonsterRow[]) ?? [];
}

export async function getTeamRows(ownerId: string): Promise<MonsterRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('monsters')
    .select('*')
    .eq('owner_id', ownerId)
    .not('team_slot', 'is', null)
    .order('team_slot', { ascending: true });
  if (error) throw new Error(`Failed to load team: ${error.message}`);
  return (data as MonsterRow[]) ?? [];
}

export async function insertMonster(input: {
  ownerId: string;
  speciesId: string;
  level: number;
  rolls: StatRolls;
  abilities: string[];
  teamSlot: 0 | 1 | 2 | null;
  currentHp: number;
  isStarter: boolean;
}): Promise<MonsterRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('monsters')
    .insert({
      owner_id: input.ownerId,
      species_id: input.speciesId,
      level: input.level,
      stats: { rolls: input.rolls },
      abilities: input.abilities,
      team_slot: input.teamSlot,
      current_hp: input.currentHp,
      equipped_item_id: null,
      is_starter: input.isStarter,
      healing_until: null,
    })
    .select('*')
    .single();
  if (error || !data) throw new Error(`Failed to insert monster: ${error?.message}`);
  return data as MonsterRow;
}

export async function updateMonster(
  id: string,
  patch: Partial<{
    team_slot: 0 | 1 | 2 | null;
    equipped_item_id: string | null;
    current_hp: number | null;
    healing_until: string | null;
    level: number;
    xp: number;
  }>
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('monsters').update(patch).eq('id', id);
  if (error) throw new Error(`Failed to update monster ${id}: ${error.message}`);
}

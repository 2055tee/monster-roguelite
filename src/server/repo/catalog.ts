import { createAdminClient } from '@/lib/supabase/admin';
import type { Dungeon, Item, MonsterSpecies, Stats } from '@/lib/game/types';

/**
 * Server-side (admin client) catalog reads for species / items / dungeons.
 * Distinct from src/server/repo/catalog-client.ts (owned by WP4, uses the
 * RLS-scoped client) — this file is for WP3's action bodies which need to
 * read catalog rows reliably regardless of RLS policy nuances, using the
 * service-role client that's already the authorization boundary here.
 */

type SpeciesRow = {
  id: string;
  name: string;
  emoji: string;
  base_stats: Stats;
  rarity: number;
  min_tier: number;
  signature_ability: string;
  ability_pool: string[];
};

type ItemRow = {
  id: string;
  name: string;
  category: 'equipment' | 'consumable';
  description: string;
  effect: Item['effect'];
  drop_weight: number;
};

type DungeonRow = {
  id: string;
  name: string;
  difficulty_tier: number;
  enemy_level: number;
  boss_species_id: string;
  base_catch_rate: number;
  gold_reward: number;
  enemy_species_ids: string[];
  room_layout: string[];
};

function mapSpecies(row: SpeciesRow): MonsterSpecies {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    baseStats: row.base_stats,
    rarity: row.rarity,
    minTier: row.min_tier,
    signatureAbility: row.signature_ability,
    abilityPool: row.ability_pool ?? [],
  };
}

function mapItem(row: ItemRow): Item {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    effect: row.effect,
    dropWeight: row.drop_weight,
  };
}

function mapDungeon(row: DungeonRow): Dungeon {
  return {
    id: row.id,
    name: row.name,
    difficultyTier: row.difficulty_tier,
    enemyLevel: row.enemy_level,
    bossSpeciesId: row.boss_species_id,
    baseCatchRate: Number(row.base_catch_rate),
    goldReward: row.gold_reward,
    enemySpeciesIds: row.enemy_species_ids ?? [],
    roomLayout: (row.room_layout ?? []) as Dungeon['roomLayout'],
  };
}

export async function getAllSpecies(): Promise<MonsterSpecies[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('monster_species').select('*');
  if (error) throw new Error(`Failed to load species catalog: ${error.message}`);
  return (data as SpeciesRow[]).map(mapSpecies);
}

export async function getSpeciesById(id: string): Promise<MonsterSpecies> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('monster_species').select('*').eq('id', id).single();
  if (error || !data) throw new Error(`Species not found: ${id}`);
  return mapSpecies(data as SpeciesRow);
}

export async function getSpeciesByName(name: string): Promise<MonsterSpecies> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('monster_species').select('*').eq('name', name).single();
  if (error || !data) throw new Error(`Species not found: ${name}`);
  return mapSpecies(data as SpeciesRow);
}

export async function getAllItems(): Promise<Item[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('items').select('*');
  if (error) throw new Error(`Failed to load item catalog: ${error.message}`);
  return (data as ItemRow[]).map(mapItem);
}

export async function getItemById(id: string): Promise<Item | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('items').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`Failed to load item: ${error.message}`);
  return data ? mapItem(data as ItemRow) : null;
}

export async function getItemByName(name: string): Promise<Item | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('items').select('*').eq('name', name).maybeSingle();
  if (error) throw new Error(`Failed to load item: ${error.message}`);
  return data ? mapItem(data as ItemRow) : null;
}

export async function getAllDungeons(): Promise<Dungeon[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('dungeons').select('*');
  if (error) throw new Error(`Failed to load dungeon catalog: ${error.message}`);
  return (data as DungeonRow[]).map(mapDungeon);
}

export async function getDungeonById(id: string): Promise<Dungeon> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('dungeons').select('*').eq('id', id).single();
  if (error || !data) throw new Error(`Dungeon not found: ${id}`);
  return mapDungeon(data as DungeonRow);
}

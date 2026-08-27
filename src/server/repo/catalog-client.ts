import { createClient } from '@/lib/supabase/server';
import type { Item, MonsterSpecies, Stats } from '@/lib/game/types';

/**
 * Read-only catalog lookups for WP4's UI needs.
 *
 * `HubView` (per the frozen contract in `src/lib/game/types.ts`) only carries
 * IDs (`speciesId`, `itemId`) — it does not embed species/item catalog data
 * (name/emoji/baseStats/description/effect). Rather than change the frozen
 * type or block on another work package, we read these two catalog tables
 * directly here. Both are intended to be publicly-readable reference/lookup
 * tables (no per-user data), so a direct server-side Supabase select is safe
 * without going through a server action.
 *
 * NOTE: table/column names are a pragmatic assumption (snake_case Postgres
 * convention: `monster_species` / `items`, matching the shape of
 * `MonsterSpecies`/`Item` in types.ts) since the DB migrations (WP-db) had
 * not landed at the time this was written. Every call is wrapped so a
 * missing table/column (e.g. before migrations land) degrades to an empty
 * lookup instead of crashing the page.
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

export async function getSpeciesCatalog(): Promise<Record<string, MonsterSpecies>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('monster_species').select('*');
    if (error || !data) return {};

    const map: Record<string, MonsterSpecies> = {};
    for (const row of data as SpeciesRow[]) {
      map[row.id] = {
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
    return map;
  } catch {
    return {};
  }
}

export async function getItemCatalog(): Promise<Record<string, Item>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.from('items').select('*');
    if (error || !data) return {};

    const map: Record<string, Item> = {};
    for (const row of data as ItemRow[]) {
      map[row.id] = {
        id: row.id,
        name: row.name,
        category: row.category,
        description: row.description,
        effect: row.effect,
        dropWeight: row.drop_weight,
      };
    }
    return map;
  } catch {
    return {};
  }
}

/** Fallback used whenever a species/item id has no catalog entry (yet). */
export function speciesFallback(speciesId: string): MonsterSpecies {
  return {
    id: speciesId,
    name: speciesId,
    emoji: '❓',
    baseStats: { hp: 0, atk: 0, def: 0, spd: 0 },
    rarity: 0,
    minTier: 0,
    signatureAbility: '',
    abilityPool: [],
  };
}

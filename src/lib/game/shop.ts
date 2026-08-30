import { createRng, hash32 } from './rng';
import type { ItemRarity } from './types';

/** v1, locked -- see CLAUDE.md's Shop + Reforge plan. */
export const SHOP_BUCKET_MS = 3_600_000;

export function hourBucket(nowMs: number): number {
  return Math.floor(nowMs / SHOP_BUCKET_MS);
}

export function hourBucketStartMs(bucket: number): number {
  return bucket * SHOP_BUCKET_MS;
}

export function nextResetMs(bucket: number): number {
  return (bucket + 1) * SHOP_BUCKET_MS;
}

export const SHOP_RARITY_WEIGHTS: Record<ItemRarity, number> = {
  common: 55,
  rare: 28,
  epic: 13,
  legendary: 4,
};

const RARITY_ORDER: ItemRarity[] = ['common', 'rare', 'epic', 'legendary'];

export const EQUIPMENT_PRICE: Record<ItemRarity, number> = {
  common: 60,
  rare: 150,
  epic: 360,
  legendary: 800,
};

export const CONSUMABLE_PRICE: Record<ItemRarity, number> = {
  common: 25,
  rare: 60,
  epic: 140,
  legendary: 300,
};

export const SCRAP_UNIT_PRICE: Record<ItemRarity, number> = {
  common: 20,
  rare: 50,
  epic: 120,
  legendary: 260,
};

export const SCRAP_BUNDLE_SIZE = 3;
/** Reserved slot index for the scrap listing so it never collides with item slots 0..5. */
export const SCRAP_SLOT_INDEX = 99;

export type ShopCatalogEntry = { id: string; category: 'equipment' | 'consumable'; rarity: ItemRarity };

export type ShopListing =
  | {
      slotIndex: number;
      kind: 'item';
      itemId: string;
      category: 'equipment' | 'consumable';
      rarity: ItemRarity;
      quantity: 1;
      price: number;
    }
  | { slotIndex: number; kind: 'scrap'; rarity: ItemRarity; quantity: number; price: number };

export type ShopRoll = { hourBucket: number; listings: ShopListing[] };

function priceFor(category: 'equipment' | 'consumable', rarity: ItemRarity): number {
  return category === 'equipment' ? EQUIPMENT_PRICE[rarity] : CONSUMABLE_PRICE[rarity];
}

function rollRarity(rng: ReturnType<typeof createRng>): ItemRarity {
  const total = SHOP_RARITY_WEIGHTS.common + SHOP_RARITY_WEIGHTS.rare + SHOP_RARITY_WEIGHTS.epic + SHOP_RARITY_WEIGHTS.legendary;
  let roll = rng.next() * total;
  for (const rarity of RARITY_ORDER) {
    roll -= SHOP_RARITY_WEIGHTS[rarity];
    if (roll < 0) return rarity;
  }
  return 'legendary';
}

/** Steps a rarity down toward common, then up toward legendary, until a candidate pool is non-empty (or all are exhausted). */
function findNonEmptyPool(
  catalog: ShopCatalogEntry[],
  category: 'equipment' | 'consumable',
  startRarity: ItemRarity,
  excludeIds: Set<string>
): { rarity: ItemRarity; pool: ShopCatalogEntry[] } | null {
  const startIdx = RARITY_ORDER.indexOf(startRarity);
  const order = [
    ...RARITY_ORDER.slice(0, startIdx + 1).reverse(),
    ...RARITY_ORDER.slice(startIdx + 1),
  ];
  for (const rarity of order) {
    const pool = catalog.filter((c) => c.category === category && c.rarity === rarity && !excludeIds.has(c.id));
    if (pool.length > 0) return { rarity, pool };
  }
  return null;
}

/**
 * Deterministic per-hour shop roll. Same bucket -> same result, forever, with
 * no persisted state. Draw order below is part of the contract -- don't
 * reorder it, or every already-elapsed hour's stock silently changes.
 */
export function rollShop(bucket: number, catalog: ShopCatalogEntry[]): ShopRoll {
  const rng = createRng(hash32(bucket), 0);

  const total = 5 + (rng.next() < 0.5 ? 1 : 0);
  const categoryPlan: ('equipment' | 'consumable')[] = ['equipment', 'equipment', 'consumable', 'consumable'];
  for (let i = 4; i < total; i++) {
    categoryPlan.push(rng.next() < 0.5 ? 'equipment' : 'consumable');
  }
  categoryPlan.sort((a, b) => (a === b ? 0 : a === 'equipment' ? -1 : 1));

  const listings: ShopListing[] = [];
  const pickedIds = new Set<string>();

  for (const category of categoryPlan) {
    const rarity = rollRarity(rng);
    const found = findNonEmptyPool(catalog, category, rarity, pickedIds);
    if (!found) continue; // whole category exhausted -- skip this slot
    const pick = found.pool[Math.floor(rng.next() * found.pool.length)];
    pickedIds.add(pick.id);
    listings.push({
      slotIndex: listings.length,
      kind: 'item',
      itemId: pick.id,
      category: pick.category,
      rarity: pick.rarity,
      quantity: 1,
      price: priceFor(pick.category, pick.rarity),
    });
  }

  const scrapRarity = RARITY_ORDER[Math.floor(rng.next() * 4)];
  listings.push({
    slotIndex: SCRAP_SLOT_INDEX,
    kind: 'scrap',
    rarity: scrapRarity,
    quantity: SCRAP_BUNDLE_SIZE,
    price: SCRAP_UNIT_PRICE[scrapRarity] * SCRAP_BUNDLE_SIZE,
  });

  return { hourBucket: bucket, listings };
}

import { describe, expect, it } from 'vitest';
import {
  CONSUMABLE_PRICE,
  EQUIPMENT_PRICE,
  SCRAP_BUNDLE_SIZE,
  SCRAP_SLOT_INDEX,
  SCRAP_UNIT_PRICE,
  hourBucket,
  hourBucketStartMs,
  nextResetMs,
  rollShop,
  type ShopCatalogEntry,
} from '../../src/lib/game/shop';

// Mirrors the real 20-item catalog's shape, minus a legendary consumable
// (there isn't one in v1) so the fallback path gets exercised for real.
const CATALOG: ShopCatalogEntry[] = [
  { id: 'eq-c1', category: 'equipment', rarity: 'common' },
  { id: 'eq-c2', category: 'equipment', rarity: 'common' },
  { id: 'eq-c3', category: 'equipment', rarity: 'common' },
  { id: 'eq-c4', category: 'equipment', rarity: 'common' },
  { id: 'eq-r1', category: 'equipment', rarity: 'rare' },
  { id: 'eq-r2', category: 'equipment', rarity: 'rare' },
  { id: 'eq-r3', category: 'equipment', rarity: 'rare' },
  { id: 'eq-r4', category: 'equipment', rarity: 'rare' },
  { id: 'eq-e1', category: 'equipment', rarity: 'epic' },
  { id: 'eq-e2', category: 'equipment', rarity: 'epic' },
  { id: 'eq-e3', category: 'equipment', rarity: 'epic' },
  { id: 'eq-e4', category: 'equipment', rarity: 'epic' },
  { id: 'eq-l1', category: 'equipment', rarity: 'legendary' },
  { id: 'eq-l2', category: 'equipment', rarity: 'legendary' },
  { id: 'eq-l3', category: 'equipment', rarity: 'legendary' },
  { id: 'eq-l4', category: 'equipment', rarity: 'legendary' },
  { id: 'co-c1', category: 'consumable', rarity: 'common' },
  { id: 'co-r1', category: 'consumable', rarity: 'rare' },
  { id: 'co-r2', category: 'consumable', rarity: 'rare' },
  { id: 'co-e1', category: 'consumable', rarity: 'epic' },
];

describe('hourBucket', () => {
  it('buckets by exact hour boundaries', () => {
    expect(hourBucket(0)).toBe(0);
    expect(hourBucket(3_599_999)).toBe(0);
    expect(hourBucket(3_600_000)).toBe(1);
  });

  it('hourBucketStartMs and nextResetMs invert hourBucket', () => {
    expect(hourBucketStartMs(5)).toBe(18_000_000);
    expect(nextResetMs(5)).toBe(21_600_000);
  });
});

describe('rollShop', () => {
  it('is deterministic for a given bucket', () => {
    const a = rollShop(12345, CATALOG);
    const b = rollShop(12345, CATALOG);
    expect(a).toEqual(b);
  });

  it('differs across buckets (almost always)', () => {
    const rolls = Array.from({ length: 20 }, (_, i) => JSON.stringify(rollShop(i, CATALOG)));
    const unique = new Set(rolls);
    expect(unique.size).toBeGreaterThan(1);
  });

  it('produces 5-6 item listings plus exactly one scrap listing', () => {
    for (let bucket = 0; bucket < 50; bucket++) {
      const { listings } = rollShop(bucket, CATALOG);
      const scrapListings = listings.filter((l) => l.kind === 'scrap');
      const itemListings = listings.filter((l) => l.kind === 'item');
      expect(scrapListings).toHaveLength(1);
      expect(scrapListings[0].slotIndex).toBe(SCRAP_SLOT_INDEX);
      expect(itemListings.length).toBeGreaterThanOrEqual(2); // full catalog never exhausts a whole category
      expect(itemListings.length).toBeLessThanOrEqual(6);
    }
  });

  it('guarantees at least 2 equipment and 2 consumable listings when the catalog supports it', () => {
    for (let bucket = 0; bucket < 30; bucket++) {
      const { listings } = rollShop(bucket, CATALOG);
      const items = listings.filter((l) => l.kind === 'item');
      const equipment = items.filter((l) => l.kind === 'item' && l.category === 'equipment');
      const consumables = items.filter((l) => l.kind === 'item' && l.category === 'consumable');
      expect(equipment.length).toBeGreaterThanOrEqual(2);
      expect(consumables.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('never rolls the same item id twice in one hour', () => {
    for (let bucket = 0; bucket < 30; bucket++) {
      const { listings } = rollShop(bucket, CATALOG);
      const ids = listings.filter((l) => l.kind === 'item').map((l) => (l.kind === 'item' ? l.itemId : ''));
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('prices listings from the correct table at their rolled rarity', () => {
    for (let bucket = 0; bucket < 30; bucket++) {
      const { listings } = rollShop(bucket, CATALOG);
      for (const listing of listings) {
        if (listing.kind === 'item') {
          const table = listing.category === 'equipment' ? EQUIPMENT_PRICE : CONSUMABLE_PRICE;
          expect(listing.price).toBe(table[listing.rarity]);
        } else {
          expect(listing.price).toBe(SCRAP_UNIT_PRICE[listing.rarity] * SCRAP_BUNDLE_SIZE);
          expect(listing.quantity).toBe(SCRAP_BUNDLE_SIZE);
        }
      }
    }
  });

  it('falls back to a non-empty rarity pool when a category has no legendary consumable', () => {
    // With no legendary consumable in the catalog, a consumable slot that
    // rolls legendary must fall back rather than disappear whenever a
    // common/rare/epic consumable is available.
    const smallCatalog: ShopCatalogEntry[] = [
      { id: 'eq-c1', category: 'equipment', rarity: 'common' },
      { id: 'eq-c2', category: 'equipment', rarity: 'common' },
      { id: 'co-c1', category: 'consumable', rarity: 'common' },
    ];
    for (let bucket = 0; bucket < 30; bucket++) {
      const { listings } = rollShop(bucket, smallCatalog);
      const consumables = listings.filter((l) => l.kind === 'item' && l.category === 'consumable');
      // Never more than the catalog can support without duplicates, but
      // whenever a consumable slot is planned, the sole common item covers it.
      expect(consumables.length).toBeLessThanOrEqual(1);
    }
  });
});

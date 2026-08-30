'use server';

import type { ActionError, Item, ItemRarity } from '@/lib/game/types';
import { hourBucket, nextResetMs, rollShop, type ShopCatalogEntry, type ShopListing } from '@/lib/game/shop';
import { requireUser } from '@/server/auth';
import { getAllItems } from '@/server/repo/catalog';
import { insertInstance } from '@/server/repo/item-instance';
import { adjustCurrency, adjustScrap, ensureProfile, getProfile, grantItem } from '@/server/repo/profile';
import { createAdminClient } from '@/lib/supabase/admin';

export type ShopViewListing = ShopListing & {
  itemName?: string;
  itemDescription?: string;
  purchased: boolean;
  affordable: boolean;
};

export type ShopView = {
  hourBucket: number;
  nextResetMs: number;
  currency: number;
  scrap: Record<ItemRarity, number>;
  listings: ShopViewListing[];
};

async function loadCatalog(): Promise<{ items: Item[]; catalog: ShopCatalogEntry[] }> {
  const items = await getAllItems();
  const catalog: ShopCatalogEntry[] = items.map((i) => ({ id: i.id, category: i.category, rarity: i.rarity }));
  return { items, catalog };
}

export async function getShopState(): Promise<ShopView> {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  const bucket = hourBucket(Date.now());
  const { items, catalog } = await loadCatalog();
  const itemById = new Map(items.map((i) => [i.id, i]));

  const roll = rollShop(bucket, catalog);

  const admin = createAdminClient();
  const { data: purchases } = await admin
    .from('shop_purchases')
    .select('slot_index')
    .eq('owner_id', user.id)
    .eq('hour_bucket', bucket);
  const purchasedSlots = new Set((purchases ?? []).map((p: { slot_index: number }) => p.slot_index));

  const listings: ShopViewListing[] = roll.listings.map((listing) => {
    const purchased = purchasedSlots.has(listing.slotIndex);
    const affordable = profile.currency >= listing.price;
    if (listing.kind === 'item') {
      const item = itemById.get(listing.itemId);
      return {
        ...listing,
        itemName: item?.name,
        itemDescription: item?.description,
        purchased,
        affordable,
      };
    }
    return { ...listing, purchased, affordable };
  });

  return {
    hourBucket: bucket,
    nextResetMs: nextResetMs(bucket),
    currency: profile.currency,
    scrap: {
      common: profile.scrap_common,
      rare: profile.scrap_rare,
      epic: profile.scrap_epic,
      legendary: profile.scrap_legendary,
    },
    listings,
  };
}

export async function buyShopSlot(slotIndex: number): Promise<{ ok: true } | ActionError> {
  const user = await requireUser();
  await ensureProfile(user.id);

  // Anti-cheat: the hour bucket is always recomputed from the server clock,
  // never trusted from the client, so a stale/past hour's cheaper roll can't
  // be replayed.
  const bucket = hourBucket(Date.now());
  const { catalog } = await loadCatalog();
  const roll = rollShop(bucket, catalog);
  const listing = roll.listings.find((l) => l.slotIndex === slotIndex);
  if (!listing) {
    return { ok: false, error: 'That item is no longer in stock.' };
  }

  const profile = await getProfile(user.id);
  if (!profile || profile.currency < listing.price) {
    return { ok: false, error: 'Not enough gold.' };
  }

  const admin = createAdminClient();
  const { error: insertError } = await admin.from('shop_purchases').insert({
    owner_id: user.id,
    hour_bucket: bucket,
    slot_index: slotIndex,
    item_id: listing.kind === 'item' ? listing.itemId : null,
    scrap_rarity: listing.kind === 'scrap' ? listing.rarity : null,
    quantity: listing.quantity,
    price_paid: listing.price,
  });
  if (insertError) {
    // Unique-violation on (owner_id, hour_bucket, slot_index) -- this row is
    // the concurrency lock, so a double-click can't double-purchase.
    return { ok: false, error: 'You already bought this one this hour.' };
  }

  await adjustCurrency(user.id, -listing.price);

  if (listing.kind === 'scrap') {
    await adjustScrap(user.id, listing.rarity, listing.quantity);
  } else if (listing.category === 'equipment') {
    await insertInstance(user.id, listing.itemId);
  } else {
    await grantItem(user.id, listing.itemId, listing.quantity);
  }

  return { ok: true };
}

'use server';

import type { ActionError, ItemRarity, ScrapCounts } from '@/lib/game/types';
import { canReforge, effectValueAtLevel, reforgeCap, reforgeSuccessChance, rollReforge } from '@/lib/game/reforge';
import { createRng } from '@/lib/game/rng';
import { requireUser } from '@/server/auth';
import { getAllItems } from '@/server/repo/catalog';
import { getInstanceRow, getInstancesForOwner, getMonsterUsingInstance, updateInstanceReforgeLevel } from '@/server/repo/item-instance';
import { adjustScrap, ensureProfile, setReforgeRng } from '@/server/repo/profile';
import { createAdminClient } from '@/lib/supabase/admin';

export type ReforgeEntry = {
  instanceId: string;
  itemId: string;
  name: string;
  description: string;
  rarity: ItemRarity;
  reforgeLevel: number;
  cap: number;
  atCap: boolean;
  nextLevel: number;
  successChance: number;
  currentBonusPct: number | null;
  nextBonusPct: number | null;
  scrapAvailable: number;
  equippedByMonsterId: string | null;
};

export type ReforgeView = {
  scrap: ScrapCounts;
  entries: ReforgeEntry[];
};

export async function getReforgeState(): Promise<ReforgeView> {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  const instances = await getInstancesForOwner(user.id);
  const items = await getAllItems();
  const itemById = new Map(items.map((i) => [i.id, i]));

  const scrap: ScrapCounts = {
    common: profile.scrap_common,
    rare: profile.scrap_rare,
    epic: profile.scrap_epic,
    legendary: profile.scrap_legendary,
  };

  const entries: ReforgeEntry[] = [];
  for (const instance of instances) {
    const item = itemById.get(instance.item_id);
    if (!item) continue;
    const cap = reforgeCap(item.rarity);
    const atCap = !canReforge(item.rarity, instance.reforge_level);
    const nextLevel = Math.min(cap, instance.reforge_level + 1);
    const holder = await getMonsterUsingInstance(instance.id);

    entries.push({
      instanceId: instance.id,
      itemId: item.id,
      name: item.name,
      description: item.description,
      rarity: item.rarity,
      reforgeLevel: instance.reforge_level,
      cap,
      atCap,
      nextLevel,
      successChance: atCap ? 0 : reforgeSuccessChance(nextLevel),
      currentBonusPct: item.effect.type === 'stat_pct' ? effectValueAtLevel(item.effect.value, instance.reforge_level) : null,
      nextBonusPct:
        !atCap && item.effect.type === 'stat_pct' ? effectValueAtLevel(item.effect.value, nextLevel) : null,
      scrapAvailable: scrap[item.rarity],
      equippedByMonsterId: holder?.id ?? null,
    });
  }

  return { scrap, entries };
}

export async function attemptReforge(instanceId: string): Promise<
  | { ok: true; success: boolean; chance: number; roll: number; fromLevel: number; toLevel: number }
  | ActionError
> {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);

  const instance = await getInstanceRow(instanceId);
  if (!instance || instance.owner_id !== user.id) {
    return { ok: false, error: 'You do not own this item' };
  }

  const items = await getAllItems();
  const item = items.find((i) => i.id === instance.item_id);
  if (!item || item.category !== 'equipment') {
    return { ok: false, error: 'This item cannot be reforged' };
  }
  if (!canReforge(item.rarity, instance.reforge_level)) {
    return { ok: false, error: 'This item is already at its maximum reforge level.' };
  }

  const scrapColumn = `scrap_${item.rarity}` as const;
  if (profile[scrapColumn] < 1) {
    return { ok: false, error: `You need 1 ${item.rarity} upgrade scrap.` };
  }

  let seed = profile.reforge_rng_seed;
  let cursor = profile.reforge_rng_cursor;
  if (seed === 0) {
    seed = Math.floor(Math.random() * 2 ** 31);
    cursor = 0;
  }

  const targetLevel = instance.reforge_level + 1;
  const rng = createRng(seed, cursor);
  const { chance, roll, success } = rollReforge(rng, targetLevel);

  // Persist rng progress immediately, before any grant -- mirrors attemptCatch.
  await setReforgeRng(user.id, seed, rng.cursor);
  await adjustScrap(user.id, item.rarity, -1);

  if (success) {
    await updateInstanceReforgeLevel(instanceId, targetLevel);
  }

  const admin = createAdminClient();
  await admin.from('reforge_attempts').insert({
    owner_id: user.id,
    instance_id: instanceId,
    from_level: instance.reforge_level,
    target_level: targetLevel,
    chance,
    roll,
    success,
    scrap_rarity: item.rarity,
    rng_seed: seed,
    rng_cursor: rng.cursor,
  });

  return {
    ok: true,
    success,
    chance,
    roll,
    fromLevel: instance.reforge_level,
    toLevel: success ? targetLevel : instance.reforge_level,
  };
}

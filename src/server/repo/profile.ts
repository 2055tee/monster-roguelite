import { createAdminClient } from '@/lib/supabase/admin';

export type ProfileRow = {
  id: string;
  username: string | null;
  currency: number;
  bootstrapped: boolean;
  created_at: string;
};

export async function getProfile(userId: string): Promise<ProfileRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw new Error(`Failed to load profile ${userId}: ${error.message}`);
  return (data as ProfileRow | null) ?? null;
}

/** Ensure a profile row exists for this user (WP1's trigger should normally have created it). */
export async function ensureProfile(userId: string): Promise<ProfileRow> {
  const existing = await getProfile(userId);
  if (existing) return existing;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('profiles')
    .upsert({ id: userId }, { onConflict: 'id' })
    .select('*')
    .single();
  if (error || !data) throw new Error(`Failed to create profile ${userId}: ${error?.message}`);
  return data as ProfileRow;
}

export async function setBootstrapped(userId: string, value: boolean): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('profiles').update({ bootstrapped: value }).eq('id', userId);
  if (error) throw new Error(`Failed to update bootstrapped flag: ${error.message}`);
}

export async function adjustCurrency(userId: string, delta: number): Promise<void> {
  const admin = createAdminClient();
  const profile = await getProfile(userId);
  if (!profile) throw new Error(`Profile not found: ${userId}`);
  const { error } = await admin
    .from('profiles')
    .update({ currency: profile.currency + delta })
    .eq('id', userId);
  if (error) throw new Error(`Failed to adjust currency: ${error.message}`);
}

export type InventoryRow = { owner_id: string; item_id: string; quantity: number };

export async function getInventoryRows(userId: string): Promise<InventoryRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('inventory').select('*').eq('owner_id', userId);
  if (error) throw new Error(`Failed to load inventory: ${error.message}`);
  return (data as InventoryRow[]) ?? [];
}

export async function getInventoryQuantity(userId: string, itemId: string): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('inventory')
    .select('quantity')
    .eq('owner_id', userId)
    .eq('item_id', itemId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load inventory row: ${error.message}`);
  return (data as { quantity: number } | null)?.quantity ?? 0;
}

export async function grantItem(userId: string, itemId: string, amount = 1): Promise<void> {
  const admin = createAdminClient();
  const current = await getInventoryQuantity(userId, itemId);
  if (current === 0) {
    const { error } = await admin.from('inventory').insert({ owner_id: userId, item_id: itemId, quantity: amount });
    if (error) throw new Error(`Failed to grant item: ${error.message}`);
  } else {
    const { error } = await admin
      .from('inventory')
      .update({ quantity: current + amount })
      .eq('owner_id', userId)
      .eq('item_id', itemId);
    if (error) throw new Error(`Failed to grant item: ${error.message}`);
  }
}

/** Decrement inventory quantity by 1, deleting the row if it hits 0. Throws if quantity is already 0. */
export async function consumeItem(userId: string, itemId: string, amount = 1): Promise<void> {
  const admin = createAdminClient();
  const current = await getInventoryQuantity(userId, itemId);
  if (current < amount) throw new Error(`Insufficient quantity of item ${itemId}`);
  if (current - amount <= 0) {
    const { error } = await admin.from('inventory').delete().eq('owner_id', userId).eq('item_id', itemId);
    if (error) throw new Error(`Failed to consume item: ${error.message}`);
  } else {
    const { error } = await admin
      .from('inventory')
      .update({ quantity: current - amount })
      .eq('owner_id', userId)
      .eq('item_id', itemId);
    if (error) throw new Error(`Failed to consume item: ${error.message}`);
  }
}

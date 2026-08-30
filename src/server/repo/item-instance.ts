import { createAdminClient } from '@/lib/supabase/admin';
import type { ItemInstance } from '@/lib/game/types';
import type { MonsterRow } from '@/server/repo/monster';

export type ItemInstanceRow = {
  id: string;
  owner_id: string;
  item_id: string;
  reforge_level: number;
  acquired_at: string;
};

export function mapItemInstanceRow(row: ItemInstanceRow): ItemInstance {
  return {
    id: row.id,
    itemId: row.item_id,
    reforgeLevel: row.reforge_level,
    acquiredAt: row.acquired_at,
  };
}

export async function getInstancesForOwner(ownerId: string): Promise<ItemInstanceRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('item_instances').select('*').eq('owner_id', ownerId);
  if (error) throw new Error(`Failed to load item instances: ${error.message}`);
  return (data as ItemInstanceRow[]) ?? [];
}

export async function getInstanceRow(id: string): Promise<ItemInstanceRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from('item_instances').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(`Failed to load item instance ${id}: ${error.message}`);
  return (data as ItemInstanceRow | null) ?? null;
}

export async function insertInstance(ownerId: string, itemId: string): Promise<ItemInstanceRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('item_instances')
    .insert({ owner_id: ownerId, item_id: itemId })
    .select('*')
    .single();
  if (error || !data) throw new Error(`Failed to create item instance: ${error?.message}`);
  return data as ItemInstanceRow;
}

export async function updateInstanceReforgeLevel(id: string, level: number): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('item_instances').update({ reforge_level: level }).eq('id', id);
  if (error) throw new Error(`Failed to update item instance ${id}: ${error.message}`);
}

/** Finds the (at most one) monster with this instance currently equipped. */
export async function getMonsterUsingInstance(instanceId: string): Promise<MonsterRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('monsters')
    .select('*')
    .eq('equipped_instance_id', instanceId)
    .maybeSingle();
  if (error) throw new Error(`Failed to look up monster for instance ${instanceId}: ${error.message}`);
  return (data as MonsterRow | null) ?? null;
}

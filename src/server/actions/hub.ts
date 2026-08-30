'use server';

import type { ActionResult, HubView, ItemInstance, OwnedMonster, ScrapCounts } from '@/lib/game/types';
import { effectiveStats } from '@/lib/game/stats';
import { requireUser } from '@/server/auth';
import { getAllDungeons, getItemById, getItemByName, getSpeciesByName } from '@/server/repo/catalog';
import {
  getInstanceRow,
  getInstancesForOwner,
  getMonsterUsingInstance,
  mapItemInstanceRow,
} from '@/server/repo/item-instance';
import {
  getMonsterRow,
  getRosterRows,
  insertMonster,
  mapMonsterRow,
  rollAbilities,
  rollStatMultipliers,
  updateMonster,
} from '@/server/repo/monster';
import {
  adjustCurrency,
  consumeItem,
  ensureProfile,
  getInventoryRows,
  getProfile,
  grantItem,
  setBootstrapped,
} from '@/server/repo/profile';
import { getInProgressRun } from '@/server/repo/run';
import { getMaxHpFor, resolveHealingForRows } from '@/server/game-bridge';

const STARTER_SPECIES_NAMES = ['Sprigling', 'Cinderpup', 'Pebblet'] as const;

export async function ensureBootstrap(): Promise<void> {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  if (profile.bootstrapped) return;

  for (let slot = 0; slot < STARTER_SPECIES_NAMES.length; slot++) {
    const species = await getSpeciesByName(STARTER_SPECIES_NAMES[slot]);
    const rolls = rollStatMultipliers(Math.random);
    const abilities = rollAbilities(species, Math.random);
    const draft: OwnedMonster = {
      id: 'draft',
      speciesId: species.id,
      level: 2,
      xp: 0,
      rolls,
      abilities,
      teamSlot: slot as 0 | 1 | 2,
      currentHp: null,
      equippedItemId: null,
      equippedInstanceId: null,
      isStarter: true,
      healingUntil: null,
      caughtAt: new Date().toISOString(),
    };
    const maxHp = effectiveStats(species, draft, null).hp;

    await insertMonster({
      ownerId: user.id,
      speciesId: species.id,
      level: 2,
      rolls,
      abilities,
      teamSlot: slot as 0 | 1 | 2,
      currentHp: maxHp,
      isStarter: true,
    });
  }

  const lureBait = await getItemByName('Lure Bait');
  if (lureBait) {
    await grantItem(user.id, lureBait.id, 1);
  }

  await setBootstrapped(user.id, true);
}

export async function getHubState(): Promise<HubView> {
  const user = await requireUser();
  const profile = await ensureProfile(user.id);
  const rosterRows = await resolveHealingForRows(await getRosterRows(user.id));
  const inventoryRows = await getInventoryRows(user.id);
  const instanceRows = await getInstancesForOwner(user.id);
  const dungeons = await getAllDungeons();
  const activeRun = await getInProgressRun(user.id);

  const roster = rosterRows.map(mapMonsterRow);
  const team: (OwnedMonster | null)[] = [null, null, null];
  for (const m of roster) {
    if (m.teamSlot !== null) team[m.teamSlot] = m;
  }

  const inventory = [];
  for (const row of inventoryRows) {
    const item = await getItemById(row.item_id);
    if (!item) continue;
    inventory.push({ itemId: item.id, name: item.name, category: item.category, quantity: row.quantity });
  }

  const equipment: ItemInstance[] = instanceRows.map(mapItemInstanceRow);
  const scrap: ScrapCounts = {
    common: profile.scrap_common,
    rare: profile.scrap_rare,
    epic: profile.scrap_epic,
    legendary: profile.scrap_legendary,
  };

  return {
    currency: profile.currency,
    scrap,
    team,
    roster,
    inventory,
    equipment,
    dungeons,
    activeRunId: activeRun?.id ?? null,
  };
}

export async function setTeamSlot(monsterId: string, slot: 0 | 1 | 2): Promise<ActionResult> {
  const user = await requireUser();
  const monster = await getMonsterRow(monsterId);
  if (!monster || monster.owner_id !== user.id) {
    return { ok: false, error: 'Monster not found' };
  }

  const rosterRows = await getRosterRows(user.id);
  const occupant = rosterRows.find((r) => r.team_slot === slot && r.id !== monsterId);
  if (occupant) {
    // Swap: the displaced monster takes the dragged monster's old slot
    // (bench, if it wasn't on the team) instead of always evicting to bench.
    await updateMonster(occupant.id, { team_slot: monster.team_slot });
  }

  await updateMonster(monsterId, { team_slot: slot });
  return { ok: true };
}

export async function equipItem(monsterId: string, instanceId: string | null): Promise<ActionResult> {
  const user = await requireUser();
  const monster = await getMonsterRow(monsterId);
  if (!monster || monster.owner_id !== user.id) {
    return { ok: false, error: 'Monster not found' };
  }

  if (instanceId === null) {
    await updateMonster(monsterId, { equipped_item_id: null, equipped_instance_id: null });
    return { ok: true };
  }

  const instance = await getInstanceRow(instanceId);
  if (!instance || instance.owner_id !== user.id) {
    return { ok: false, error: 'You do not own this item' };
  }
  const item = await getItemById(instance.item_id);
  if (!item || item.category !== 'equipment') {
    return { ok: false, error: 'Item is not equippable' };
  }

  // An instance is one physical copy -- unequip it from whichever other
  // monster (if any) currently has it, since it can only be worn by one.
  const otherHolder = await getMonsterUsingInstance(instanceId);
  if (otherHolder && otherHolder.id !== monsterId) {
    await updateMonster(otherHolder.id, { equipped_item_id: null, equipped_instance_id: null });
  }

  await updateMonster(monsterId, { equipped_item_id: item.id, equipped_instance_id: instanceId });
  return { ok: true };
}

export async function useElixir(monsterId: string): Promise<ActionResult> {
  const user = await requireUser();
  const monster = await getMonsterRow(monsterId);
  if (!monster || monster.owner_id !== user.id) {
    return { ok: false, error: 'Monster not found' };
  }

  const elixir = await getItemByName('Field Elixir');
  if (!elixir || elixir.effect.type !== 'instant_heal') {
    return { ok: false, error: 'Field Elixir is not available' };
  }
  const inventoryRows = await getInventoryRows(user.id);
  const owned = inventoryRows.find((r) => r.item_id === elixir.id && r.quantity > 0);
  if (!owned) {
    return { ok: false, error: 'You do not have a Field Elixir' };
  }

  const maxHp = await getMaxHpFor(monster);

  await updateMonster(monsterId, { healing_until: null, current_hp: maxHp });
  await consumeItem(user.id, elixir.id, 1);

  return { ok: true };
}

export async function skipHealing(monsterId: string): Promise<ActionResult> {
  const user = await requireUser();
  const monster = await getMonsterRow(monsterId);
  if (!monster || monster.owner_id !== user.id) {
    return { ok: false, error: 'Monster not found' };
  }
  if (!monster.healing_until || new Date(monster.healing_until).getTime() <= Date.now()) {
    return { ok: false, error: 'This monster is not currently healing' };
  }

  const remainingSeconds = (new Date(monster.healing_until).getTime() - Date.now()) / 1000;
  const cost = Math.max(5, Math.ceil(remainingSeconds / 10));

  const profile = await getProfile(user.id);
  if (!profile || profile.currency < cost) {
    return { ok: false, error: 'Not enough currency' };
  }

  const maxHp = await getMaxHpFor(monster);

  await adjustCurrency(user.id, -cost);
  await updateMonster(monsterId, { healing_until: null, current_hp: maxHp });

  return { ok: true };
}

import Link from 'next/link';

import { getHubState } from '@/server/actions/hub';
import { getItemCatalog, getSpeciesCatalog, speciesFallback } from '@/server/repo/catalog-client';
import { effectiveStats, power } from '@/lib/game/stats';
import type { Item, OwnedMonster } from '@/lib/game/types';
import { Panel } from '@/components/ui/Panel';
import { RosterCard } from '@/components/hub/RosterCard';
import { TeamSlotDropZone } from '@/components/hub/TeamSlotDropZone';

export default async function RosterPage() {
  let errorMessage: string | null = null;
  let hub: Awaited<ReturnType<typeof getHubState>> | null = null;

  try {
    hub = await getHubState();
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load roster';
  }

  if (!hub) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Panel title="Roster">
          <p className="text-sm text-slate-400">
            Unable to load your roster right now{errorMessage ? `: ${errorMessage}` : '.'}
          </p>
        </Panel>
      </div>
    );
  }

  const [speciesCatalog, itemCatalog] = await Promise.all([getSpeciesCatalog(), getItemCatalog()]);
  const lookupSpecies = (speciesId: string) => speciesCatalog[speciesId] ?? speciesFallback(speciesId);

  // Every owned equipment instance (one option per physical copy, not per
  // item type) so the equip preview can compute a real effectiveStats diff
  // -- including any reforge bonus -- before the user commits to a selection.
  const equipmentOptions = hub.equipment
    .map((instance) => {
      const item = itemCatalog[instance.itemId];
      return item ? { instanceId: instance.id, item, reforgeLevel: instance.reforgeLevel } : null;
    })
    .filter((o): o is NonNullable<typeof o> => !!o);
  const instanceById = new Map(hub.equipment.map((i) => [i.id, i]));

  function equippedFor(monster: OwnedMonster): { item: Item | null; reforgeLevel: number } {
    const instance = monster.equippedInstanceId ? instanceById.get(monster.equippedInstanceId) : undefined;
    const item = instance ? itemCatalog[instance.itemId] ?? null : null;
    return { item, reforgeLevel: instance?.reforgeLevel ?? 0 };
  }

  // Roster-wide max power, so every card's stat bar is comparable in length.
  const maxPower = hub.roster.reduce((max, monster) => {
    const species = speciesCatalog[monster.speciesId];
    if (!species) return max;
    const { item, reforgeLevel } = equippedFor(monster);
    const p = power(effectiveStats(species, monster, item, reforgeLevel));
    return Math.max(max, p);
  }, 0);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Roster</h1>
        <Link href="/hub" className="text-sm text-indigo-400 hover:underline">
          ← Back to Hub
        </Link>
      </div>

      {hub.roster.length === 0 ? (
        <Panel>
          <p className="text-sm text-slate-500">You don&apos;t own any monsters yet.</p>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[13rem_1fr]">
          <div className="flex flex-row gap-3 lg:sticky lg:top-6 lg:flex-col lg:self-start">
            {hub.team.map((monster, idx) => (
              <TeamSlotDropZone
                key={idx}
                slot={idx as 0 | 1 | 2}
                monster={monster}
                species={monster ? lookupSpecies(monster.speciesId) : null}
              />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {hub.roster.map((monster) => {
              const { item, reforgeLevel } = equippedFor(monster);
              return (
                <RosterCard
                  key={monster.id}
                  monster={monster}
                  species={lookupSpecies(monster.speciesId)}
                  equipmentOptions={equipmentOptions}
                  equippedItem={item}
                  equippedReforgeLevel={reforgeLevel}
                  maxPower={maxPower}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

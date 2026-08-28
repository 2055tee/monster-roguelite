import Link from 'next/link';

import { getHubState } from '@/server/actions/hub';
import { getItemCatalog, getSpeciesCatalog, speciesFallback } from '@/server/repo/catalog-client';
import { effectiveStats, power } from '@/lib/game/stats';
import { Panel } from '@/components/ui/Panel';
import { RosterCard } from '@/components/hub/RosterCard';

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

  const equipmentOptions = hub.inventory
    .filter((entry) => entry.category === 'equipment' && entry.quantity > 0)
    .map((entry) => ({ itemId: entry.itemId, name: entry.name }));

  // Roster-wide max power, so every card's stat bar is comparable in length.
  const maxPower = hub.roster.reduce((max, monster) => {
    const species = speciesCatalog[monster.speciesId];
    if (!species) return max;
    const equippedItem = monster.equippedItemId ? itemCatalog[monster.equippedItemId] ?? null : null;
    const p = power(effectiveStats(species, monster, equippedItem));
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hub.roster.map((monster) => (
            <RosterCard
              key={monster.id}
              monster={monster}
              species={lookupSpecies(monster.speciesId)}
              equipmentOptions={equipmentOptions}
              equippedItem={monster.equippedItemId ? itemCatalog[monster.equippedItemId] ?? null : null}
              maxPower={maxPower}
            />
          ))}
        </div>
      )}
    </div>
  );
}

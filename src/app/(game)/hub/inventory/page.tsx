import Link from 'next/link';

import { getHubState } from '@/server/actions/hub';
import { getItemCatalog, getSpeciesCatalog, speciesFallback } from '@/server/repo/catalog-client';
import { Panel } from '@/components/ui/Panel';
import { InventoryItemRow } from '@/components/hub/InventoryItemRow';
import { SkipHealingButton } from '@/components/hub/SkipHealingButton';
import { isHealingNow } from '@/components/hub/rarity';

export default async function InventoryPage() {
  let errorMessage: string | null = null;
  let hub: Awaited<ReturnType<typeof getHubState>> | null = null;

  try {
    hub = await getHubState();
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load inventory';
  }

  if (!hub) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Panel title="Inventory">
          <p className="text-sm text-slate-400">
            Unable to load your inventory right now{errorMessage ? `: ${errorMessage}` : '.'}
          </p>
        </Panel>
      </div>
    );
  }

  const [speciesCatalog, itemCatalog] = await Promise.all([getSpeciesCatalog(), getItemCatalog()]);
  const lookupSpecies = (speciesId: string) => speciesCatalog[speciesId] ?? speciesFallback(speciesId);

  const rosterOptions = hub.roster.map((m) => ({
    id: m.id,
    label: `${lookupSpecies(m.speciesId).emoji} ${lookupSpecies(m.speciesId).name} (Lv ${m.level})`,
  }));

  const equipment = hub.inventory.filter((entry) => entry.category === 'equipment');
  const consumables = hub.inventory.filter((entry) => entry.category === 'consumable');

  const healingMonsters = hub.roster.filter((m) => isHealingNow(m.healingUntil));

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Inventory</h1>
        <Link href="/hub" className="text-sm text-indigo-400 hover:underline">
          ← Back to Hub
        </Link>
      </div>

      {healingMonsters.length > 0 ? (
        <Panel title="Currently Healing">
          <div className="flex flex-col gap-2">
            {healingMonsters.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm text-slate-300">
                <span>
                  {lookupSpecies(m.speciesId).emoji} {lookupSpecies(m.speciesId).name} (Lv {m.level})
                </span>
                <SkipHealingButton monsterId={m.id} />
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <Panel title="Equipment">
        {equipment.length === 0 ? (
          <p className="text-sm text-slate-500">No equipment owned yet.</p>
        ) : (
          equipment.map((entry) => (
            <InventoryItemRow
              key={entry.itemId}
              entry={entry}
              catalogItem={itemCatalog[entry.itemId] ?? null}
              roster={rosterOptions}
            />
          ))
        )}
      </Panel>

      <Panel title="Consumables">
        {consumables.length === 0 ? (
          <p className="text-sm text-slate-500">No consumables owned yet.</p>
        ) : (
          consumables.map((entry) => (
            <InventoryItemRow
              key={entry.itemId}
              entry={entry}
              catalogItem={itemCatalog[entry.itemId] ?? null}
              roster={rosterOptions}
            />
          ))
        )}
      </Panel>
    </div>
  );
}

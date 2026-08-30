import Link from 'next/link';

import { ensureBootstrap, getHubState } from '@/server/actions/hub';
import { getItemCatalog, getSpeciesCatalog, speciesFallback } from '@/server/repo/catalog-client';
import { hourBucket, nextResetMs } from '@/lib/game/shop';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { HubNavButton } from '@/components/hub/HubNavButton';
import { ShopResetCountdown } from '@/components/hub/ShopResetCountdown';
import { TeamSlotCard } from '@/components/hub/TeamSlotCard';
import { isHealingNow } from '@/components/hub/rarity';

export default async function HubPage() {
  let errorMessage: string | null = null;
  let hub: Awaited<ReturnType<typeof getHubState>> | null = null;

  try {
    await ensureBootstrap();
    hub = await getHubState();
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load hub state';
  }

  if (!hub) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Panel title="Hub">
          <p className="text-sm text-slate-400">
            Unable to load your hub right now{errorMessage ? `: ${errorMessage}` : '.'}
          </p>
        </Panel>
      </div>
    );
  }

  const [speciesCatalog, itemCatalog] = await Promise.all([getSpeciesCatalog(), getItemCatalog()]);
  const lookupSpecies = (speciesId: string) => speciesCatalog[speciesId] ?? speciesFallback(speciesId);
  const instanceById = new Map(hub.equipment.map((i) => [i.id, i]));

  const readyTeamCount = hub.team.filter((m) => m && !isHealingNow(m.healingUntil)).length;
  const teamReady = readyTeamCount >= 3;
  const dungeonDisabled = Boolean(hub.activeRunId) || !teamReady;
  const dungeonDisabledReason = hub.activeRunId
    ? 'Finish or abandon your active run first.'
    : !teamReady
      ? 'Field 3 healthy, non-healing monsters to enter a dungeon.'
      : undefined;

  const totalScrap = hub.scrap.common + hub.scrap.rare + hub.scrap.epic + hub.scrap.legendary;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <h1 className="text-xl font-bold text-slate-100">Hub</h1>

      {hub.activeRunId ? (
        <Panel title="Run in progress">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-300">You have an active dungeon run.</p>
            <Link href={`/run/${hub.activeRunId}`}>
              <Button>Resume Run</Button>
            </Link>
          </div>
        </Panel>
      ) : null}

      <Panel title="Your Team">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {hub.team.map((monster, idx) => {
            const instance = monster?.equippedInstanceId ? instanceById.get(monster.equippedInstanceId) : undefined;
            const equippedItem = instance ? itemCatalog[instance.itemId] ?? null : null;
            return (
              <TeamSlotCard
                key={idx}
                slot={idx as 0 | 1 | 2}
                monster={monster}
                species={monster ? lookupSpecies(monster.speciesId) : null}
                equippedItem={equippedItem}
                equippedReforgeLevel={instance?.reforgeLevel ?? 0}
              />
            );
          })}
        </div>
        <div className="mt-3 flex gap-3 text-sm">
          <Link href="/hub/monsters" className="text-indigo-400 hover:underline">
            Manage Roster →
          </Link>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <HubNavButton
          href="/hub/dungeon"
          emoji="⚔️"
          label="Dungeon"
          subtitle={dungeonDisabled ? dungeonDisabledReason : 'Enter a run'}
          accentClass="border-rose-500 bg-rose-950/40 text-rose-200"
          disabled={dungeonDisabled}
          disabledReason={dungeonDisabledReason}
        />
        <HubNavButton
          href="/hub/inventory"
          emoji="🎒"
          label="Inventory"
          subtitle="Items & equipment"
          accentClass="border-slate-500 bg-slate-800/60 text-slate-200"
        />
        <HubNavButton
          href="/hub/shop"
          emoji="🏪"
          label="Shop"
          subtitle={<ShopResetCountdown nextResetMs={nextResetMs(hourBucket(Date.now()))} compact />}
          accentClass="border-amber-500 bg-amber-950/40 text-amber-200"
        />
        <HubNavButton
          href="/hub/reforge"
          emoji="🔨"
          label="Reforge"
          subtitle={totalScrap > 0 ? `${totalScrap} scrap` : 'Upgrade gear'}
          accentClass="border-violet-500 bg-violet-950/40 text-violet-200"
        />
      </div>
    </div>
  );
}

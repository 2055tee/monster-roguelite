import Link from 'next/link';

import { ensureBootstrap, getHubState } from '@/server/actions/hub';
import { getItemCatalog, getSpeciesCatalog, speciesFallback } from '@/server/repo/catalog-client';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { CurrencyBadge } from '@/components/hub/CurrencyBadge';
import { DungeonCard } from '@/components/hub/DungeonCard';
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

  const readyTeamCount = hub.team.filter((m) => m && !isHealingNow(m.healingUntil)).length;
  const teamReady = readyTeamCount >= 3;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Hub</h1>
        <CurrencyBadge amount={hub.currency} />
      </div>

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
          {hub.team.map((monster, idx) => (
            <TeamSlotCard
              key={idx}
              slot={idx as 0 | 1 | 2}
              monster={monster}
              species={monster ? lookupSpecies(monster.speciesId) : null}
              equippedItem={monster?.equippedItemId ? itemCatalog[monster.equippedItemId] ?? null : null}
            />
          ))}
        </div>
        <div className="mt-3 flex gap-3 text-sm">
          <Link href="/hub/monsters" className="text-indigo-400 hover:underline">
            Manage Roster →
          </Link>
          <Link href="/hub/inventory" className="text-indigo-400 hover:underline">
            Inventory →
          </Link>
        </div>
      </Panel>

      <Panel title="Dungeons">
        {hub.dungeons.length === 0 ? (
          <p className="text-sm text-slate-500">No dungeons available yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {hub.dungeons.map((dungeon) => {
              const disabled = Boolean(hub!.activeRunId) || !teamReady;
              const disabledReason = hub!.activeRunId
                ? 'Finish or abandon your active run first.'
                : !teamReady
                  ? 'Field 3 healthy, non-healing monsters to enter a dungeon.'
                  : undefined;

              return (
                <DungeonCard
                  key={dungeon.id}
                  dungeon={dungeon}
                  bossSpecies={lookupSpecies(dungeon.bossSpeciesId)}
                  disabled={disabled}
                  disabledReason={disabledReason}
                />
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

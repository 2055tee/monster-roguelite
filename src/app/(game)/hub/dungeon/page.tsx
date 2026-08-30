import Link from 'next/link';

import { getHubState } from '@/server/actions/hub';
import { getSpeciesCatalog, speciesFallback } from '@/server/repo/catalog-client';
import { Panel } from '@/components/ui/Panel';
import { DungeonCard } from '@/components/hub/DungeonCard';
import { isHealingNow } from '@/components/hub/rarity';

export default async function DungeonPage() {
  let errorMessage: string | null = null;
  let hub: Awaited<ReturnType<typeof getHubState>> | null = null;

  try {
    hub = await getHubState();
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load dungeons';
  }

  if (!hub) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Panel title="Dungeon">
          <p className="text-sm text-slate-400">
            Unable to load dungeons right now{errorMessage ? `: ${errorMessage}` : '.'}
          </p>
        </Panel>
      </div>
    );
  }

  const speciesCatalog = await getSpeciesCatalog();
  const lookupSpecies = (speciesId: string) => speciesCatalog[speciesId] ?? speciesFallback(speciesId);

  const readyTeamCount = hub.team.filter((m) => m && !isHealingNow(m.healingUntil)).length;
  const teamReady = readyTeamCount >= 3;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Dungeon</h1>
        <Link href="/hub" className="text-sm text-indigo-400 hover:underline">
          ← Back to Hub
        </Link>
      </div>

      <Panel title="Choose a Dungeon">
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

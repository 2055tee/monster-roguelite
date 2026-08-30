import Link from 'next/link';

import { getReforgeState } from '@/server/actions/reforge';
import { Panel } from '@/components/ui/Panel';
import { ReforgeCard } from '@/components/hub/ReforgeCard';
import { ScrapBalancePanel } from '@/components/hub/ScrapBalancePanel';

export default async function ReforgePage() {
  let errorMessage: string | null = null;
  let reforge: Awaited<ReturnType<typeof getReforgeState>> | null = null;

  try {
    reforge = await getReforgeState();
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load reforge';
  }

  if (!reforge) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Panel title="Reforge">
          <p className="text-sm text-slate-400">
            Unable to load reforge right now{errorMessage ? `: ${errorMessage}` : '.'}
          </p>
        </Panel>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Reforge</h1>
        <Link href="/hub" className="text-sm text-indigo-400 hover:underline">
          ← Back to Hub
        </Link>
      </div>

      <Panel title="Upgrade Scrap">
        <ScrapBalancePanel scrap={reforge.scrap} />
      </Panel>

      <Panel title="Your Equipment">
        {reforge.entries.length === 0 ? (
          <p className="text-sm text-slate-500">No equipment owned yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {reforge.entries.map((entry) => (
              <ReforgeCard key={entry.instanceId} entry={entry} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { speciesName } from './format';
import type { MonsterSpecies, OwnedMonster } from '@/lib/game/types';

type SummaryViewProps = {
  gold: number;
  healing: { monsterId: string; until: string }[];
  catchOutcome: { success: boolean; monster?: OwnedMonster } | null;
  team: OwnedMonster[];
  speciesCatalog: Record<string, MonsterSpecies>;
};

export function SummaryView({ gold, healing, catchOutcome, team, speciesCatalog }: SummaryViewProps) {
  const router = useRouter();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4">
      <Panel title="Run Complete">
        <p className="mb-2 text-lg font-semibold text-amber-300">🪙 {gold} gold earned</p>

        {catchOutcome && (
          <p className="mb-2 text-sm text-slate-300">
            {catchOutcome.success
              ? `Caught: ${catchOutcome.monster ? speciesName(catchOutcome.monster.speciesId, speciesCatalog) : 'a new monster'}!`
              : 'The boss broke free — no new monster this time.'}
          </p>
        )}

        {healing.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-xs font-semibold text-slate-400">Recovering:</p>
            <ul className="flex flex-col gap-1 text-xs text-slate-400">
              {healing.map((h) => {
                const monster = team.find((m) => m.id === h.monsterId);
                const label = monster ? speciesName(monster.speciesId, speciesCatalog) : 'Monster';
                return (
                  <li key={h.monsterId}>
                    {label} — until {new Date(h.until).toLocaleString()}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Panel>
      <Button onClick={() => router.push('/hub')}>Return to Hub</Button>
    </div>
  );
}

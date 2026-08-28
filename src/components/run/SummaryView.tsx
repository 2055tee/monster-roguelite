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
  xpAwarded: number;
  levelUps: { monsterId: string; from: number; to: number }[];
};

export function SummaryView({
  gold,
  healing,
  catchOutcome,
  team,
  speciesCatalog,
  xpAwarded,
  levelUps,
}: SummaryViewProps) {
  const router = useRouter();

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4">
      <Panel title="Run Complete">
        <p className="mb-2 text-lg font-semibold text-amber-300">🪙 {gold} gold earned</p>
        {xpAwarded > 0 && <p className="mb-2 text-sm text-emerald-300">✨ +{xpAwarded} XP for every team member</p>}
        {levelUps.length > 0 && (
          <ul className="mb-2 flex flex-col gap-0.5 text-sm text-emerald-200">
            {levelUps.map((lu) => {
              const monster = team.find((m) => m.id === lu.monsterId);
              const label = monster ? speciesName(monster.speciesId, speciesCatalog) : 'A monster';
              return (
                <li key={lu.monsterId}>
                  🎉 {label} reached Lv {lu.to}!
                </li>
              );
            })}
          </ul>
        )}

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

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { finishRun } from '@/server/actions/catch';
import { speciesName } from './format';
import type { MonsterSpecies, OwnedMonster } from '@/lib/game/types';

type DefeatViewProps = {
  runId: string;
  busy: boolean;
  runAction: <T>(fn: () => Promise<T>) => Promise<T | null>;
  team: OwnedMonster[];
  speciesCatalog: Record<string, MonsterSpecies>;
};

export function DefeatView({ runId, busy, runAction, team, speciesCatalog }: DefeatViewProps) {
  const router = useRouter();
  const [finished, setFinished] = useState(false);
  const [healing, setHealing] = useState<{ monsterId: string; until: string }[]>([]);
  const [xpAwarded, setXpAwarded] = useState(0);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    void (async () => {
      const result = await runAction(() => finishRun(runId));
      if (result) {
        setHealing(result.healing);
        setXpAwarded(result.xpAwarded);
      }
      setFinished(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4">
      <Panel title="Your Team Was Defeated">
        <p className="text-sm text-slate-300">
          Your monsters fought bravely but were overwhelmed. They&apos;ll need time to recover.
        </p>
        {finished && xpAwarded > 0 && (
          <p className="mt-2 text-sm text-amber-300">+{xpAwarded} XP from the rooms you cleared.</p>
        )}
        {finished && healing.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1 text-xs text-slate-400">
            {healing.map((h) => {
              const monster = team.find((m) => m.id === h.monsterId);
              const label = monster ? speciesName(monster.speciesId, speciesCatalog) : 'Monster';
              return (
                <li key={h.monsterId}>
                  {label} healing until {new Date(h.until).toLocaleString()}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
      <Button disabled={!finished || busy} onClick={() => router.push('/hub')}>
        Return to Hub
      </Button>
    </div>
  );
}

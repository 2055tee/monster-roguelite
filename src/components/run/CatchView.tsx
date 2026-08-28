'use client';

import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { attemptCatch, finishRun, getCatchPreview } from '@/server/actions/catch';
import { formatPct, speciesName } from './format';
import type { MonsterSpecies, OwnedMonster } from '@/lib/game/types';

type CatchPreview = {
  performance: number;
  baseChance: number;
  faintPenalty: number;
  availableLures: { itemId: string; name: string; bonus: number; quantity: number }[];
};

type CatchResult = { chance: number; roll: number; success: boolean; monster?: OwnedMonster };

type CatchViewProps = {
  runId: string;
  busy: boolean;
  runAction: <T>(fn: () => Promise<T>) => Promise<T | null>;
  onComplete: (
    finish: {
      gold: number;
      healing: { monsterId: string; until: string }[];
      xpAwarded: number;
      levelUps: { monsterId: string; from: number; to: number }[];
    },
    catchOutcome: CatchResult | null
  ) => void;
  speciesCatalog: Record<string, MonsterSpecies>;
};

export function CatchView({ runId, busy, runAction, onComplete, speciesCatalog }: CatchViewProps) {
  const [preview, setPreview] = useState<CatchPreview | null>(null);
  const [selectedLures, setSelectedLures] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<CatchResult | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    void (async () => {
      const p = await runAction(() => getCatchPreview(runId));
      if (p) setPreview(p);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleLure(itemId: string) {
    setSelectedLures((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  async function handleAttempt() {
    const outcome = await runAction(() => attemptCatch(runId, Array.from(selectedLures)));
    if (outcome) setResult(outcome);
  }

  async function handleFinish() {
    const finish = await runAction(() => finishRun(runId));
    if (finish) onComplete(finish, result);
  }

  if (!preview) {
    return (
      <div className="mx-auto w-full max-w-lg p-4 text-center text-sm text-slate-400">
        Preparing the catch attempt...
      </div>
    );
  }

  const estimatedChance = Math.max(
    0,
    Math.min(
      1,
      preview.baseChance * preview.performance -
        preview.faintPenalty +
        preview.availableLures
          .filter((l) => selectedLures.has(l.itemId))
          .reduce((sum, l) => sum + l.bonus, 0)
    )
  );

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4">
      <Panel title="Boss Defeated — Catch Attempt">
        <p className="mb-2 text-sm text-slate-300">
          Performance: ×{preview.performance.toFixed(2)}
          {preview.performance > 1 ? ' — cleared in fewer turns than expected!' : ''}
        </p>
        <p className="mb-1 text-xs text-slate-400">Base chance: {formatPct(preview.baseChance)}</p>
        {preview.faintPenalty > 0 && (
          <p className="mb-1 text-xs text-slate-400">
            Faint penalty: -{formatPct(preview.faintPenalty)}
          </p>
        )}
      </Panel>

      {!result && (
        <Panel title="Lures">
          {preview.availableLures.length === 0 ? (
            <p className="text-sm text-slate-400">No lures available.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {preview.availableLures.map((lure) => (
                <li key={lure.itemId} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    id={`lure-${lure.itemId}`}
                    disabled={lure.quantity <= 0 || busy}
                    checked={selectedLures.has(lure.itemId)}
                    onChange={() => toggleLure(lure.itemId)}
                  />
                  <label htmlFor={`lure-${lure.itemId}`} className="flex-1">
                    {lure.name} (+{formatPct(lure.bonus)}) × {lure.quantity}
                  </label>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm font-semibold text-amber-300">
            Estimated chance: {formatPct(estimatedChance)}
          </p>
          <Button className="mt-3" onClick={handleAttempt} disabled={busy}>
            Attempt Catch
          </Button>
        </Panel>
      )}

      {result && (
        <Panel title="Catch Result">
          {result.success ? (
            <p className="text-sm text-emerald-300">
              Success! You caught {result.monster ? speciesName(result.monster.speciesId, speciesCatalog) : 'the monster'}
              {result.monster ? ` (Lv${result.monster.level})` : ''}.
            </p>
          ) : (
            <p className="text-sm text-red-400">It broke free...</p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            Roll {result.roll.toFixed(2)} vs chance {formatPct(result.chance)}
          </p>
          <Button className="mt-3" onClick={handleFinish} disabled={busy}>
            Continue
          </Button>
        </Panel>
      )}
    </div>
  );
}

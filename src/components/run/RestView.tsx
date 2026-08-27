'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Panel } from '@/components/ui/Panel';
import { chooseRestOption } from '@/server/actions/run';
import { formatSpeciesName } from './format';
import type { OwnedMonster, RunView } from '@/lib/game/types';

type RestViewProps = {
  runId: string;
  team: OwnedMonster[];
  busy: boolean;
  runAction: <T>(fn: () => Promise<T>) => Promise<T | null>;
  onContinue: (view: RunView) => void;
};

export function RestView({ runId, team, busy, runAction, onContinue }: RestViewProps) {
  const [confirmChoice, setConfirmChoice] = useState<'heal' | 'chest' | null>(null);
  const [result, setResult] = useState<{ before: OwnedMonster[]; after: RunView } | null>(null);

  async function confirm() {
    if (!confirmChoice) return;
    const choice = confirmChoice;
    setConfirmChoice(null);
    const before = team;
    const after = await runAction(() => chooseRestOption(runId, choice));
    if (after) {
      setResult({ before, after });
    }
  }

  if (result) {
    const hpDiffs = result.after.team.map((m) => {
      const prior = result.before.find((p) => p.id === m.id);
      const before = prior?.currentHp ?? m.currentHp ?? 0;
      const after = m.currentHp ?? 0;
      return { monster: m, delta: after - before };
    });
    const anyHealed = hpDiffs.some((d) => d.delta > 0);

    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4">
        <Panel title="Rest Site Result">
          {anyHealed ? (
            <ul className="flex flex-col gap-1 text-sm">
              {hpDiffs.map(({ monster, delta }) => (
                <li key={monster.id}>
                  {formatSpeciesName(monster.speciesId)}: {delta > 0 ? `+${delta} HP` : 'no change'}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-300">You opened the chest and found something useful.</p>
          )}
        </Panel>
        <Button onClick={() => onContinue(result.after)}>Continue</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 p-4">
      <Panel title="Rest Site">
        <p className="mb-4 text-sm text-slate-300">Choose how your team spends this rest room.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            className="flex-1"
            disabled={busy}
            onClick={() => setConfirmChoice('heal')}
          >
            Heal Team (50% HP)
          </Button>
          <Button
            className="flex-1"
            variant="secondary"
            disabled={busy}
            onClick={() => setConfirmChoice('chest')}
          >
            Open Chest
          </Button>
        </div>
      </Panel>

      <Modal
        open={confirmChoice !== null}
        onClose={() => setConfirmChoice(null)}
        title="Confirm choice"
      >
        <p className="mb-4 text-sm text-slate-300">
          {confirmChoice === 'heal'
            ? 'Heal your whole team for 50% of their max HP?'
            : 'Open the chest for a chance at an item? (No healing.)'}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmChoice(null)}>
            Cancel
          </Button>
          <Button onClick={confirm} disabled={busy}>
            Confirm
          </Button>
        </div>
      </Modal>
    </div>
  );
}

'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { abandonRun, enterRoom } from '@/server/actions/run';
import { RoomBreadcrumb } from './RoomBreadcrumb';
import { CombatView } from './CombatView';
import { RestView } from './RestView';
import { CatchView } from './CatchView';
import { DefeatView } from './DefeatView';
import { SummaryView } from './SummaryView';
import type { OwnedMonster, RunView } from '@/lib/game/types';

type SummaryData = {
  gold: number;
  healing: { monsterId: string; until: string }[];
  catchOutcome: { success: boolean; monster?: OwnedMonster } | null;
};

type RunScreenProps = {
  runId: string;
  initialView: RunView | null;
  initialError: string | null;
};

export function RunScreen({ runId, initialView, initialError }: RunScreenProps) {
  const router = useRouter();
  const [view, setView] = useState<RunView | null>(initialView);
  const [error, setError] = useState<string | null>(initialError);
  const [busy, setBusy] = useState(false);
  const [showCatch, setShowCatch] = useState(false);
  const [summary, setSummary] = useState<SummaryData | null>(null);

  const runAction = useCallback(async function runAction<T>(fn: () => Promise<T>): Promise<T | null> {
    setBusy(true);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  async function handleAbandon() {
    if (!window.confirm('Abandon this run? Progress will be lost.')) return;
    await runAction(() => abandonRun(runId));
    router.push('/hub');
  }

  async function handleEnterRoom() {
    const result = await runAction(() => enterRoom(runId));
    if (result) setView(result);
  }

  async function handleRoomCleared() {
    if (!view) return;
    const isBossRoom = view.roomLayout[view.currentRoomIndex] === 'boss';
    if (isBossRoom) {
      setShowCatch(true);
    } else {
      const result = await runAction(() => enterRoom(runId));
      if (result) setView(result);
    }
  }

  function handleCatchComplete(
    finish: { gold: number; healing: { monsterId: string; until: string }[] },
    catchOutcome: { success: boolean; monster?: OwnedMonster } | null
  ) {
    setSummary({ gold: finish.gold, healing: finish.healing, catchOutcome });
    setShowCatch(false);
  }

  const abandonButton = (
    <div className="fixed right-4 top-4 z-40">
      <Button variant="danger" onClick={handleAbandon} disabled={busy}>
        Abandon Run
      </Button>
    </div>
  );

  if (!view) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-4 text-center">
        <p className="text-slate-300">{error ?? 'Loading run...'}</p>
        <Button onClick={() => router.push('/hub')}>Return to Hub</Button>
      </div>
    );
  }

  if (summary) {
    return (
      <SummaryView gold={summary.gold} healing={summary.healing} catchOutcome={summary.catchOutcome} />
    );
  }

  const encounter = view.encounter;
  const allPlayersDead =
    !!encounter && encounter.combatants.filter((c) => c.side === 'player').every((c) => c.currentHp <= 0);
  const isDefeat = view.status === 'failed' || allPlayersDead;

  return (
    <div className="relative flex min-h-screen flex-col">
      {abandonButton}
      <RoomBreadcrumb roomLayout={view.roomLayout} currentRoomIndex={view.currentRoomIndex} />

      {error && (
        <div className="mx-auto mt-3 w-full max-w-lg rounded-md border border-red-600 bg-red-950/60 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {isDefeat ? (
        <DefeatView runId={runId} busy={busy} runAction={runAction} />
      ) : showCatch ? (
        <CatchView runId={runId} busy={busy} runAction={runAction} onComplete={handleCatchComplete} />
      ) : view.status !== 'in_progress' ? (
        <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 p-8 text-center">
          <p className="text-slate-300">This run has already ended ({view.status}).</p>
          <Button onClick={() => router.push('/hub')}>Return to Hub</Button>
        </div>
      ) : encounter ? (
        <CombatView
          runId={runId}
          view={view}
          encounter={encounter}
          busy={busy}
          runAction={runAction}
          onView={setView}
          onRoomCleared={handleRoomCleared}
        />
      ) : view.roomLayout[view.currentRoomIndex] === 'rest' ? (
        <RestView runId={runId} team={view.team} busy={busy} runAction={runAction} onContinue={setView} />
      ) : (
        <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 p-8 text-center">
          <p className="text-slate-300">
            Room {view.currentRoomIndex + 1} of {view.roomLayout.length} —{' '}
            {view.roomLayout[view.currentRoomIndex] === 'boss' ? 'Boss ahead!' : 'Enemies ahead.'}
          </p>
          <Button onClick={handleEnterRoom} disabled={busy}>
            Enter Room
          </Button>
        </div>
      )}
    </div>
  );
}

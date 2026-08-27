'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { startRun } from '@/server/actions/run';

export function EnterDungeonButton({
  dungeonId,
  disabled,
  disabledReason,
}: {
  dungeonId: string;
  disabled: boolean;
  disabledReason?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      const result = await startRun(dungeonId);
      if ('runId' in result) {
        router.push(`/run/${result.runId}`);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start run');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button disabled={disabled || pending} onClick={handleClick} className="w-full">
        {pending ? 'Entering…' : 'Enter Dungeon'}
      </Button>
      {disabled && disabledReason ? (
        <p className="text-xs text-slate-500">{disabledReason}</p>
      ) : null}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

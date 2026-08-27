'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { setTeamSlot } from '@/server/actions/hub';

export function AssignSlotButtons({
  monsterId,
  currentSlot,
}: {
  monsterId: string;
  currentSlot: 0 | 1 | 2 | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<0 | 1 | 2 | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function assign(slot: 0 | 1 | 2) {
    setPending(slot);
    setError(null);
    try {
      const result = await setTeamSlot(monsterId, slot);
      if (!result.ok) {
        setError(result.error);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign slot');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        {([0, 1, 2] as const).map((slot) => (
          <Button
            key={slot}
            variant="secondary"
            className="px-2 py-1 text-xs"
            disabled={currentSlot === slot || pending !== null}
            onClick={() => assign(slot)}
          >
            {pending === slot ? '…' : `Slot ${slot}`}
          </Button>
        ))}
      </div>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { skipHealing } from '@/server/actions/hub';

export function SkipHealingButton({ monsterId }: { monsterId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setPending(true);
    setError(null);
    try {
      const result = await skipHealing(monsterId);
      if (!result.ok) {
        setError(result.error);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to skip healing');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button variant="secondary" className="px-2 py-1 text-xs" disabled={pending} onClick={handleClick}>
        {pending ? 'Skipping…' : 'Skip Healing (gold)'}
      </Button>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Ticks down a live countdown to `healingUntil` (ISO string). Refreshes the
 * server data automatically once healing completes. */
export function HealingCountdown({ healingUntil }: { healingUntil: string }) {
  const router = useRouter();
  const target = new Date(healingUntil).getTime();
  const [remaining, setRemaining] = useState(() => target - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const next = target - Date.now();
      setRemaining(next);
      if (next <= 0) {
        clearInterval(interval);
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [target, router]);

  if (remaining <= 0) {
    return <span className="text-xs font-semibold text-emerald-400">Available</span>;
  }

  return (
    <span className="text-xs text-sky-300">
      Healing… <span className="font-mono">{formatRemaining(remaining)}</span>
    </span>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function ShopResetCountdown({ nextResetMs, compact = false }: { nextResetMs: number; compact?: boolean }) {
  const router = useRouter();
  // Static placeholder until mount, so server- and first-client-render markup
  // match exactly (this codebase has had one unexplained hydration mismatch
  // before -- avoid adding a second source).
  const [label, setLabel] = useState('--:--');

  useEffect(() => {
    function tick() {
      const remaining = Math.max(0, nextResetMs - Date.now());
      if (remaining <= 0) {
        router.refresh();
        return;
      }
      const minutes = Math.floor(remaining / 60_000);
      const seconds = Math.floor((remaining % 60_000) / 1000);
      setLabel(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [nextResetMs, router]);

  return (
    <span className={compact ? 'text-xs text-slate-400' : 'text-sm text-slate-300'}>
      Restocks in <span className="font-semibold text-slate-100">{label}</span>
    </span>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { attemptReforge } from '@/server/actions/reforge';
import type { ReforgeEntry } from '@/server/actions/reforge';
import { ITEM_RARITY_BG, ITEM_RARITY_BORDER, ITEM_RARITY_FILL, ITEM_RARITY_LABEL, ITEM_RARITY_TEXT, SCRAP_EMOJI } from './itemRarity';

function chanceColor(chance: number): string {
  if (chance >= 0.8) return 'text-emerald-400';
  if (chance >= 0.5) return 'text-amber-400';
  return 'text-rose-400';
}

function pct(value: number): string {
  return `${value >= 0 ? '+' : ''}${Math.round(value * 100)}%`;
}

export function ReforgeCard({ entry }: { entry: ReforgeEntry }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [banner, setBanner] = useState<{ success: boolean; toLevel: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleReforge() {
    setPending(true);
    setError(null);
    setBanner(null);
    try {
      const result = await attemptReforge(entry.instanceId);
      if (!result.ok) {
        setError(result.error);
      } else {
        setBanner({ success: result.success, toLevel: result.toLevel });
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reforge failed');
    } finally {
      setPending(false);
    }
  }

  const insufficientScrap = entry.scrapAvailable < 1;
  const disabled = pending || entry.atCap || insufficientScrap;

  return (
    <div
      className={`flex flex-col gap-2 rounded-md border p-3 ${ITEM_RARITY_BORDER[entry.rarity]} ${ITEM_RARITY_BG[entry.rarity]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-100">
            {entry.name} {entry.reforgeLevel > 0 ? `+${entry.reforgeLevel}` : ''}
          </p>
          <p className={`text-xs font-semibold ${ITEM_RARITY_TEXT[entry.rarity]}`}>
            {ITEM_RARITY_LABEL[entry.rarity]} · {entry.equippedByMonsterId ? 'Equipped' : 'Unequipped'}
          </p>
        </div>
        <span className="whitespace-nowrap text-xs text-slate-400">
          {entry.reforgeLevel} / {entry.cap}
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-950">
        <div
          className={`h-full ${ITEM_RARITY_FILL[entry.rarity]}`}
          style={{ width: `${(entry.reforgeLevel / entry.cap) * 100}%` }}
        />
      </div>

      {entry.currentBonusPct !== null && (
        <p className="text-xs text-slate-400">
          Bonus: <span className="font-semibold text-slate-200">{pct(entry.currentBonusPct)}</span>
          {!entry.atCap && entry.nextBonusPct !== null && (
            <span className="text-emerald-400"> → {pct(entry.nextBonusPct)}</span>
          )}
        </p>
      )}

      {entry.atCap ? (
        <p className="text-xs font-semibold text-amber-300">MAX level reached</p>
      ) : (
        <p className="text-xs text-slate-400">
          Success chance:{' '}
          <span className={`font-semibold ${chanceColor(entry.successChance)}`}>
            {Math.round(entry.successChance * 100)}%
          </span>{' '}
          · Cost: 1× {SCRAP_EMOJI[entry.rarity]} {ITEM_RARITY_LABEL[entry.rarity]} (you have {entry.scrapAvailable})
        </p>
      )}

      {banner && (
        <p className={`text-xs font-semibold ${banner.success ? 'text-emerald-400' : 'text-slate-300'}`}>
          {banner.success
            ? `✨ Reforged to +${banner.toLevel}!`
            : 'The reforge failed. Your item is unchanged. (-1 scrap)'}
        </p>
      )}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}

      <Button onClick={handleReforge} disabled={disabled} className="mt-1 w-full text-xs">
        {entry.atCap ? 'MAX' : insufficientScrap ? 'Not enough scrap' : `Reforge to +${entry.nextLevel}`}
      </Button>
    </div>
  );
}

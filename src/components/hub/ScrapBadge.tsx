import type { ScrapCounts } from '@/lib/game/types';
import { SCRAP_EMOJI } from './itemRarity';

const TIERS = ['common', 'rare', 'epic', 'legendary'] as const;

export function ScrapBadge({ scrap }: { scrap: ScrapCounts }) {
  const nonZero = TIERS.filter((t) => scrap[t] > 0);
  if (nonZero.length === 0) return null;

  return (
    <span className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200">
      {nonZero.map((tier) => (
        <span key={tier}>
          {SCRAP_EMOJI[tier]}
          {scrap[tier]}
        </span>
      ))}
    </span>
  );
}

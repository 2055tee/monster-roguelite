import type { ScrapCounts } from '@/lib/game/types';
import { ITEM_RARITY_BG, ITEM_RARITY_BORDER, ITEM_RARITY_LABEL, ITEM_RARITY_TEXT, SCRAP_EMOJI } from './itemRarity';

const TIERS = ['common', 'rare', 'epic', 'legendary'] as const;

export function ScrapBalancePanel({ scrap }: { scrap: ScrapCounts }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {TIERS.map((rarity) => (
        <div
          key={rarity}
          className={`flex flex-col items-center gap-1 rounded-md border p-3 ${ITEM_RARITY_BORDER[rarity]} ${ITEM_RARITY_BG[rarity]}`}
        >
          <span className="text-2xl leading-none">{SCRAP_EMOJI[rarity]}</span>
          <span className="text-lg font-bold text-slate-100">{scrap[rarity]}</span>
          <span className={`text-xs font-semibold ${ITEM_RARITY_TEXT[rarity]}`}>{ITEM_RARITY_LABEL[rarity]}</span>
        </div>
      ))}
    </div>
  );
}

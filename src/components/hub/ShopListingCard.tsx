'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { buyShopSlot } from '@/server/actions/shop';
import type { ShopViewListing } from '@/server/actions/shop';
import { ITEM_RARITY_BG, ITEM_RARITY_BORDER, ITEM_RARITY_LABEL, ITEM_RARITY_TEXT, SCRAP_EMOJI } from './itemRarity';

const CATEGORY_EMOJI = { equipment: '⚔️', consumable: '🧪' } as const;

export function ShopListingCard({ listing }: { listing: ShopViewListing }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emoji = listing.kind === 'scrap' ? SCRAP_EMOJI[listing.rarity] : CATEGORY_EMOJI[listing.category];
  const name = listing.kind === 'scrap' ? `${ITEM_RARITY_LABEL[listing.rarity]} Upgrade Scrap` : listing.itemName ?? 'Unknown item';
  const description =
    listing.kind === 'scrap'
      ? `Reforge material for ${listing.rarity} equipment.`
      : listing.itemDescription ?? '';

  async function handleBuy() {
    setPending(true);
    setError(null);
    try {
      const result = await buyShopSlot(listing.slotIndex);
      if (!result.ok) {
        setError(result.error);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Purchase failed');
    } finally {
      setPending(false);
    }
  }

  const disabled = pending || listing.purchased || !listing.affordable;
  const buttonLabel = listing.purchased ? 'Owned this hour' : !listing.affordable ? 'Not enough gold' : 'Buy';

  return (
    <div
      className={`flex flex-col gap-2 rounded-md border p-3 ${ITEM_RARITY_BORDER[listing.rarity]} ${ITEM_RARITY_BG[listing.rarity]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className="text-2xl leading-none">{emoji}</span>
          <div>
            <p className="text-sm font-semibold text-slate-100">
              {name}
              {listing.kind === 'scrap' ? ` ×${listing.quantity}` : ''}
            </p>
            <p className={`text-xs font-semibold ${ITEM_RARITY_TEXT[listing.rarity]}`}>
              {ITEM_RARITY_LABEL[listing.rarity]}
            </p>
          </div>
        </div>
        <span className="whitespace-nowrap text-sm font-semibold text-amber-300">🪙 {listing.price}</span>
      </div>
      {description ? <p className="text-xs text-slate-400">{description}</p> : null}
      <Button onClick={handleBuy} disabled={disabled} className="mt-1 w-full text-xs">
        {buttonLabel}
      </Button>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

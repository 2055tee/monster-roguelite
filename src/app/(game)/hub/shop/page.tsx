import Link from 'next/link';

import { getShopState } from '@/server/actions/shop';
import { Panel } from '@/components/ui/Panel';
import { ShopListingCard } from '@/components/hub/ShopListingCard';
import { ShopResetCountdown } from '@/components/hub/ShopResetCountdown';

export default async function ShopPage() {
  let errorMessage: string | null = null;
  let shop: Awaited<ReturnType<typeof getShopState>> | null = null;

  try {
    shop = await getShopState();
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : 'Failed to load shop';
  }

  if (!shop) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Panel title="Shop">
          <p className="text-sm text-slate-400">
            Unable to load the shop right now{errorMessage ? `: ${errorMessage}` : '.'}
          </p>
        </Panel>
      </div>
    );
  }

  const equipmentListings = shop.listings.filter((l) => l.kind === 'item' && l.category === 'equipment');
  const consumableListings = shop.listings.filter((l) => l.kind === 'item' && l.category === 'consumable');
  const scrapListing = shop.listings.find((l) => l.kind === 'scrap');

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Shop</h1>
          <ShopResetCountdown nextResetMs={shop.nextResetMs} />
        </div>
        <Link href="/hub" className="text-sm text-indigo-400 hover:underline">
          ← Back to Hub
        </Link>
      </div>

      <Panel className="border-indigo-800/60">
        <p className="mb-3 text-sm font-semibold text-indigo-300">⚔️ Equipment</p>
        {equipmentListings.length === 0 ? (
          <p className="text-sm text-slate-500">No equipment in stock this hour.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {equipmentListings.map((listing) => (
              <ShopListingCard key={listing.slotIndex} listing={listing} />
            ))}
          </div>
        )}
      </Panel>

      <Panel className="border-emerald-800/60">
        <p className="mb-3 text-sm font-semibold text-emerald-300">🧪 Consumables</p>
        {consumableListings.length === 0 ? (
          <p className="text-sm text-slate-500">No consumables in stock this hour.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {consumableListings.map((listing) => (
              <ShopListingCard key={listing.slotIndex} listing={listing} />
            ))}
          </div>
        )}
      </Panel>

      {scrapListing && (
        <Panel className="border-amber-800/60">
          <p className="mb-3 text-sm font-semibold text-amber-300">🔩 Upgrade Scrap</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ShopListingCard listing={scrapListing} />
          </div>
        </Panel>
      )}
    </div>
  );
}

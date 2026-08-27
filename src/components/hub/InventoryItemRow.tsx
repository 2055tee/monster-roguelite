import type { Item } from '@/lib/game/types';
import { UseElixirControl } from './UseElixirControl';

type InventoryEntry = { itemId: string; name: string; category: string; quantity: number };

const ELIXIR_ID_HINT = /elixir/i;

export function InventoryItemRow({
  entry,
  catalogItem,
  roster,
}: {
  entry: InventoryEntry;
  catalogItem: Item | null;
  roster: { id: string; label: string }[];
}) {
  const isFieldElixir =
    catalogItem?.effect.type === 'instant_heal' || ELIXIR_ID_HINT.test(entry.itemId) || ELIXIR_ID_HINT.test(entry.name);

  return (
    <div className="flex flex-col gap-2 border-b border-slate-800 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-slate-100">
          {entry.name} <span className="text-xs text-slate-500">×{entry.quantity}</span>
        </p>
        {catalogItem?.description ? (
          <p className="text-xs text-slate-400">{catalogItem.description}</p>
        ) : null}
      </div>

      {entry.category === 'consumable' && entry.quantity > 0 && isFieldElixir ? (
        <UseElixirControl monsters={roster} />
      ) : null}
    </div>
  );
}

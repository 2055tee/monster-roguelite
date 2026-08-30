import type { Item, ItemInstance } from '@/lib/game/types';
import { effectValueAtLevel } from '@/lib/game/reforge';
import { ITEM_RARITY_BG, ITEM_RARITY_BORDER, ITEM_RARITY_LABEL, ITEM_RARITY_TEXT } from './itemRarity';

export function EquipmentInstanceRow({
  instance,
  item,
  equippedByName,
}: {
  instance: ItemInstance;
  item: Item | null;
  equippedByName: string | null;
}) {
  if (!item) return null;

  const effectLine =
    item.effect.type === 'stat_pct'
      ? `+${Math.round(effectValueAtLevel(item.effect.value, instance.reforgeLevel) * 100)}% ${item.effect.stat.toUpperCase()}`
      : item.description;

  return (
    <div
      className={`flex flex-col gap-1 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between ${ITEM_RARITY_BORDER[item.rarity]} ${ITEM_RARITY_BG[item.rarity]}`}
    >
      <div>
        <p className="text-sm font-medium text-slate-100">
          {item.name}
          {instance.reforgeLevel > 0 ? ` +${instance.reforgeLevel}` : ''}{' '}
          <span className={`text-xs font-semibold ${ITEM_RARITY_TEXT[item.rarity]}`}>
            {ITEM_RARITY_LABEL[item.rarity]}
          </span>
        </p>
        <p className="text-xs text-slate-400">{effectLine}</p>
      </div>
      <p className="text-xs text-slate-500">{equippedByName ? `Equipped by ${equippedByName}` : 'Unequipped'}</p>
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { equipItem } from '@/server/actions/hub';
import type { Item } from '@/lib/game/types';
import { ITEM_RARITY_LABEL } from './itemRarity';

export type EquipOption = { instanceId: string; item: Item; reforgeLevel: number };

export function EquipSelect({
  monsterId,
  equippedInstanceId,
  options,
  onPreviewChange,
}: {
  monsterId: string;
  equippedInstanceId: string | null;
  options: EquipOption[];
  /** Fired synchronously (before the server commit resolves) with the newly
   * picked instance id, so a parent can show a stat-change preview immediately.
   * Reverted back to the currently-equipped id if the commit fails. */
  onPreviewChange?: (instanceId: string | null) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value === '' ? null : e.target.value;
    onPreviewChange?.(value);
    setPending(true);
    setError(null);
    try {
      const result = await equipItem(monsterId, value);
      if (!result.ok) {
        setError(result.error);
        onPreviewChange?.(equippedInstanceId);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to equip item');
      onPreviewChange?.(equippedInstanceId);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        defaultValue={equippedInstanceId ?? ''}
        onChange={handleChange}
        disabled={pending}
        className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-indigo-500"
      >
        <option value="">None</option>
        {options.map(({ instanceId, item, reforgeLevel }) => (
          <option key={instanceId} value={instanceId}>
            {item.name}
            {reforgeLevel > 0 ? ` +${reforgeLevel}` : ''} ({ITEM_RARITY_LABEL[item.rarity]})
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

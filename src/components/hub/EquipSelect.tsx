'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { equipItem } from '@/server/actions/hub';
import type { Item } from '@/lib/game/types';

export function EquipSelect({
  monsterId,
  equippedItemId,
  options,
  onPreviewChange,
}: {
  monsterId: string;
  equippedItemId: string | null;
  options: Item[];
  /** Fired synchronously (before the server commit resolves) with the newly
   * picked item id, so a parent can show a stat-change preview immediately.
   * Reverted back to the currently-equipped id if the commit fails. */
  onPreviewChange?: (itemId: string | null) => void;
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
        onPreviewChange?.(equippedItemId);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to equip item');
      onPreviewChange?.(equippedItemId);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        defaultValue={equippedItemId ?? ''}
        onChange={handleChange}
        disabled={pending}
        className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-indigo-500"
      >
        <option value="">None</option>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

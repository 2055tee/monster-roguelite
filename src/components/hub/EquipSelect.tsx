'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { equipItem } from '@/server/actions/hub';

type EquipmentOption = { itemId: string; name: string };

export function EquipSelect({
  monsterId,
  equippedItemId,
  options,
}: {
  monsterId: string;
  equippedItemId: string | null;
  options: EquipmentOption[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value === '' ? null : e.target.value;
    setPending(true);
    setError(null);
    try {
      const result = await equipItem(monsterId, value);
      if (!result.ok) {
        setError(result.error);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to equip item');
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
        {options.map((opt) => (
          <option key={opt.itemId} value={opt.itemId}>
            {opt.name}
          </option>
        ))}
      </select>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

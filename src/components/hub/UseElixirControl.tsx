'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
// Aliased on import: eslint-plugin-react-hooks treats any `useXxx` identifier
// as a hook by naming convention, and `useElixir` (a server action, not a
// hook) would otherwise trip the rules-of-hooks lint rule below.
import { useElixir as callUseElixir } from '@/server/actions/hub';

type MonsterOption = { id: string; label: string };

export function UseElixirControl({ monsters }: { monsters: MonsterOption[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState(monsters[0]?.id ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (monsters.length === 0) {
    return <p className="text-xs text-slate-500">No monsters to use this on.</p>;
  }

  async function handleUse() {
    if (!selected) return;
    setPending(true);
    setError(null);
    try {
      const result = await callUseElixir(selected);
      if (!result.ok) {
        setError(result.error);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to use item');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={pending}
          className="rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-indigo-500"
        >
          {monsters.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
        <Button variant="secondary" className="px-2 py-1 text-xs" disabled={pending} onClick={handleUse}>
          {pending ? 'Using…' : 'Use'}
        </Button>
      </div>
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

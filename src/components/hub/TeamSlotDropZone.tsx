'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { setTeamSlot } from '@/server/actions/hub';
import type { MonsterSpecies, OwnedMonster } from '@/lib/game/types';
import { Card } from '@/components/ui/Card';
import { XpBar } from '@/components/ui/XpBar';

const DRAG_MIME = 'application/x-monster-id';

export function TeamSlotDropZone({
  slot,
  monster,
  species,
}: {
  slot: 0 | 1 | 2;
  monster: OwnedMonster | null;
  species: MonsterSpecies | null;
}) {
  const router = useRouter();
  const [dragOver, setDragOver] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const monsterId = e.dataTransfer.getData(DRAG_MIME);
    if (!monsterId || monsterId === monster?.id) return;
    setPending(true);
    setError(null);
    try {
      const result = await setTeamSlot(monsterId, slot);
      if (!result.ok) {
        setError(result.error);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign slot');
    } finally {
      setPending(false);
    }
  }

  return (
    <Card
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`flex min-h-[110px] flex-col gap-1 border-2 border-dashed transition-colors ${
        dragOver ? 'border-indigo-400 bg-indigo-950/30' : 'border-slate-700'
      } ${pending ? 'opacity-60' : ''}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Slot {slot}</p>
      {monster && species ? (
        <>
          <span className="text-sm font-semibold text-slate-100">
            {species.emoji} {species.name}
          </span>
          <XpBar level={monster.level} xp={monster.xp} />
        </>
      ) : (
        <p className="flex flex-1 items-center justify-center text-center text-xs text-slate-500">
          Drag a monster here
        </p>
      )}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </Card>
  );
}

export { DRAG_MIME };

'use client';

import { useState } from 'react';

import type { Item, MonsterSpecies, OwnedMonster } from '@/lib/game/types';
import { effectiveStats } from '@/lib/game/stats';
import { Card } from '@/components/ui/Card';
import { StatSegmentBar } from '@/components/ui/StatSegmentBar';
import { XpBar } from '@/components/ui/XpBar';
import { HealingCountdown } from './HealingCountdown';
import { MonsterDetailModal } from './MonsterDetailModal';
import { isHealingNow, rarityColorClass, rarityLabel } from './rarity';
import { DRAG_MIME } from './TeamSlotDropZone';

export function RosterCard({
  monster,
  species,
  equipmentOptions,
  equippedItem,
  maxPower,
}: {
  monster: OwnedMonster;
  species: MonsterSpecies | null;
  equipmentOptions: Item[];
  equippedItem: Item | null;
  /** Roster-wide max power, so this card's stat bar length is comparable to every other card's. */
  maxPower?: number;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const label = rarityLabel(monster.rolls);
  const isHealing = isHealingNow(monster.healingUntil);
  const stats = species ? effectiveStats(species, monster, equippedItem) : null;

  return (
    <>
      <Card
        role="button"
        tabIndex={0}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(DRAG_MIME, monster.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onClick={() => setDetailOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setDetailOpen(true);
          }
        }}
        className="flex cursor-grab flex-col gap-2 outline-none transition-colors hover:border-indigo-500 focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 active:cursor-grabbing"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-100">
            {species?.emoji ?? '❓'} {species?.name ?? monster.speciesId}
          </span>
          <span className={`text-xs font-semibold ${rarityColorClass(label)}`}>{label}</span>
        </div>

        <XpBar level={monster.level} xp={monster.xp} />

        {stats && <StatSegmentBar stats={stats} maxPower={maxPower} />}

        <div className="flex items-center justify-between text-xs text-slate-300">
          <span>{monster.teamSlot !== null ? `Team slot ${monster.teamSlot}` : 'Bench'}</span>
          <span>Item: {equippedItem?.name ?? 'None'}</span>
        </div>

        {isHealing ? <HealingCountdown healingUntil={monster.healingUntil as string} /> : null}

        <p className="mt-1 text-center text-[11px] text-slate-500">Click for details, or drag onto a team slot →</p>
      </Card>

      <MonsterDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        monster={monster}
        species={species}
        equippedItem={equippedItem}
        equipmentOptions={equipmentOptions}
      />
    </>
  );
}

import type { Item, MonsterSpecies, OwnedMonster } from '@/lib/game/types';
import { effectiveStats } from '@/lib/game/stats';
import { Card } from '@/components/ui/Card';
import { StatSegmentBar } from '@/components/ui/StatSegmentBar';
import { XpBar } from '@/components/ui/XpBar';
import { AssignSlotButtons } from './AssignSlotButtons';
import { EquipSelect } from './EquipSelect';
import { HealingCountdown } from './HealingCountdown';
import { isHealingNow, rarityColorClass, rarityLabel } from './rarity';

export function RosterCard({
  monster,
  species,
  equipmentOptions,
  equippedItem,
  maxPower,
}: {
  monster: OwnedMonster;
  species: MonsterSpecies | null;
  equipmentOptions: { itemId: string; name: string }[];
  equippedItem: Item | null;
  /** Roster-wide max power, so this card's stat bar length is comparable to every other card's. */
  maxPower?: number;
}) {
  const label = rarityLabel(monster.rolls);
  const isHealing = isHealingNow(monster.healingUntil);
  const stats = species ? effectiveStats(species, monster, equippedItem) : null;

  return (
    <Card className="flex flex-col gap-2">
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

      <div className="flex flex-col gap-2 border-t border-slate-700 pt-2">
        <AssignSlotButtons monsterId={monster.id} currentSlot={monster.teamSlot} />
        <EquipSelect
          monsterId={monster.id}
          equippedItemId={monster.equippedItemId}
          options={equipmentOptions}
        />
      </div>
    </Card>
  );
}

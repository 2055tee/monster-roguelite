import type { Item, MonsterSpecies, OwnedMonster } from '@/lib/game/types';
import { Card } from '@/components/ui/Card';
import { AssignSlotButtons } from './AssignSlotButtons';
import { EquipSelect } from './EquipSelect';
import { HealingCountdown } from './HealingCountdown';
import { formatRoll, isHealingNow, rarityColorClass, rarityLabel } from './rarity';

export function RosterCard({
  monster,
  species,
  equipmentOptions,
  equippedItem,
}: {
  monster: OwnedMonster;
  species: MonsterSpecies | null;
  equipmentOptions: { itemId: string; name: string }[];
  equippedItem: Item | null;
}) {
  const label = rarityLabel(monster.rolls);
  const isHealing = isHealingNow(monster.healingUntil);

  return (
    <Card className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-100">
          {species?.emoji ?? '❓'} {species?.name ?? monster.speciesId}
        </span>
        <span className={`text-xs font-semibold ${rarityColorClass(label)}`}>{label}</span>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
        <span>Lv {monster.level}</span>
        <span>HP {formatRoll(monster.rolls.hp)}</span>
        <span>ATK {formatRoll(monster.rolls.atk)}</span>
        <span>DEF {formatRoll(monster.rolls.def)}</span>
        <span>SPD {formatRoll(monster.rolls.spd)}</span>
      </div>

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

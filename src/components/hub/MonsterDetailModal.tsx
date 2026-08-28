import { getAbility } from '@/lib/game/abilities';
import { effectiveStats } from '@/lib/game/stats';
import { power } from '@/lib/game/stats';
import type { Item, MonsterSpecies, OwnedMonster, Stats } from '@/lib/game/types';
import { Modal } from '@/components/ui/Modal';
import { XpBar } from '@/components/ui/XpBar';
import { AssignSlotButtons } from './AssignSlotButtons';
import { EquipSelect } from './EquipSelect';
import { formatRoll, isHealingNow, rarityColorClass, rarityLabel } from './rarity';

const STAT_ORDER: { key: keyof Stats; label: string }[] = [
  { key: 'hp', label: 'HP' },
  { key: 'atk', label: 'ATK' },
  { key: 'def', label: 'DEF' },
  { key: 'spd', label: 'SPD' },
];

export function MonsterDetailModal({
  open,
  onClose,
  monster,
  species,
  equippedItem,
  equipmentOptions,
}: {
  open: boolean;
  onClose: () => void;
  monster: OwnedMonster;
  species: MonsterSpecies | null;
  equippedItem: Item | null;
  equipmentOptions: { itemId: string; name: string }[];
}) {
  const label = rarityLabel(monster.rolls);
  const isHealing = isHealingNow(monster.healingUntil);
  const preItem = species ? effectiveStats(species, monster, null) : null;
  const final = species ? effectiveStats(species, monster, equippedItem) : null;
  const abilityIds = ['basic_attack', ...monster.abilities];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span>
          {species?.emoji ?? '❓'} {species?.name ?? monster.speciesId}{' '}
          <span className={`text-xs font-semibold ${rarityColorClass(label)}`}>{label}</span>
        </span>
      }
    >
      <div className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto pr-1">
        <XpBar level={monster.level} xp={monster.xp} />

        {preItem && final && (
          <div>
            <p className="mb-1 text-xs font-semibold text-slate-400">Stat breakdown</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead>
                  <tr className="text-slate-500">
                    <th className="py-1 pr-2 font-medium">Stat</th>
                    <th className="py-1 pr-2 font-medium">Base</th>
                    <th className="py-1 pr-2 font-medium">Roll</th>
                    <th className="py-1 pr-2 font-medium">Pre-item</th>
                    <th className="py-1 pr-2 font-medium">Item</th>
                    <th className="py-1 pr-2 font-medium">Final</th>
                  </tr>
                </thead>
                <tbody>
                  {STAT_ORDER.map(({ key, label: statLabel }) => {
                    const itemAffectsThis =
                      equippedItem?.effect.type === 'stat_pct' && equippedItem.effect.stat === key;
                    return (
                      <tr key={key} className="border-t border-slate-800">
                        <td className="py-1 pr-2 font-medium text-slate-200">{statLabel}</td>
                        <td className="py-1 pr-2">{species?.baseStats[key] ?? '—'}</td>
                        <td className="py-1 pr-2">{formatRoll(monster.rolls[key])}</td>
                        <td className="py-1 pr-2">{preItem[key]}</td>
                        <td className="py-1 pr-2">
                          {itemAffectsThis && equippedItem?.effect.type === 'stat_pct'
                            ? `${equippedItem.effect.value >= 0 ? '+' : ''}${Math.round(equippedItem.effect.value * 100)}%`
                            : '—'}
                        </td>
                        <td className="py-1 pr-2 font-semibold text-slate-100">{final[key]}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Power: <span className="font-semibold text-slate-200">{Math.round(power(final))}</span>
            </p>
          </div>
        )}

        <div>
          <p className="mb-1 text-xs font-semibold text-slate-400">Abilities</p>
          <ul className="flex flex-col gap-1 text-xs text-slate-300">
            {abilityIds.map((abilityId) => {
              const ability = getAbility(abilityId);
              return (
                <li key={abilityId} className="rounded-md border border-slate-700 bg-slate-800/40 p-2">
                  <span className="font-semibold text-slate-100">{ability.name}</span>{' '}
                  <span className="text-slate-500">
                    (CD {ability.cooldown === 0 ? 'none' : ability.cooldown})
                  </span>
                  <p className="mt-0.5 text-slate-400">{ability.description}</p>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
          <span>Slot: {monster.teamSlot !== null ? `Team slot ${monster.teamSlot}` : 'Bench'}</span>
          <span>{monster.isStarter ? 'Starter' : 'Caught'}</span>
          <span className="col-span-2">Caught: {new Date(monster.caughtAt).toLocaleString()}</span>
        </div>

        {isHealing && (
          <p className="text-xs text-amber-300">
            Healing until {new Date(monster.healingUntil as string).toLocaleString()}
          </p>
        )}

        <div className="flex flex-col gap-2 border-t border-slate-700 pt-3">
          <p className="text-xs font-semibold text-slate-400">Team slot</p>
          <AssignSlotButtons monsterId={monster.id} currentSlot={monster.teamSlot} />
          <p className="mt-1 text-xs font-semibold text-slate-400">Equipped item</p>
          <EquipSelect monsterId={monster.id} equippedItemId={monster.equippedItemId} options={equipmentOptions} />
        </div>
      </div>
    </Modal>
  );
}

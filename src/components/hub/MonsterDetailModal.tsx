'use client';

import { useState } from 'react';

import Image from 'next/image';

import { getAbility } from '@/lib/game/abilities';
import { effectValueAtLevel } from '@/lib/game/reforge';
import { effectiveStats, power } from '@/lib/game/stats';
import { speciesArtUrl } from '@/lib/game/species-art';
import type { Item, MonsterSpecies, OwnedMonster, Stats } from '@/lib/game/types';
import { ElementBadge } from '@/components/shared/ElementBadge';
import { SpeciesIcon } from '@/components/shared/SpeciesIcon';
import { Modal } from '@/components/ui/Modal';
import { XpBar } from '@/components/ui/XpBar';
import { AssignSlotButtons } from './AssignSlotButtons';
import { EquipSelect, type EquipOption } from './EquipSelect';
import { ITEM_RARITY_TEXT } from './itemRarity';
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
  equippedReforgeLevel,
  equipmentOptions,
}: {
  open: boolean;
  onClose: () => void;
  monster: OwnedMonster;
  species: MonsterSpecies | null;
  equippedItem: Item | null;
  equippedReforgeLevel: number;
  equipmentOptions: EquipOption[];
}) {
  const [previewInstanceId, setPreviewInstanceId] = useState<string | null>(monster.equippedInstanceId);

  const label = rarityLabel(monster.rolls);
  const isHealing = isHealingNow(monster.healingUntil);
  const preItem = species ? effectiveStats(species, monster, null) : null;
  const final = species ? effectiveStats(species, monster, equippedItem, equippedReforgeLevel) : null;

  const previewOption = previewInstanceId
    ? equipmentOptions.find((o) => o.instanceId === previewInstanceId) ?? null
    : null;
  const isPreviewingChange = previewInstanceId !== monster.equippedInstanceId;
  const previewStats =
    isPreviewingChange && species
      ? effectiveStats(species, monster, previewOption?.item ?? null, previewOption?.reforgeLevel ?? 0)
      : null;

  const abilityIds = ['basic_attack', ...monster.abilities];
  const artUrl = species ? speciesArtUrl(species.name) : null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="inline-flex items-center gap-1.5">
          <SpeciesIcon name={species?.name ?? ''} emoji={species?.emoji ?? '❓'} size={26} />
          {species?.name ?? monster.speciesId}{' '}
          <span className={`text-xs font-semibold ${rarityColorClass(label)}`}>{label}</span>
          {species && <ElementBadge element={species.element} compact />}
        </span>
      }
    >
      <div className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto pr-1">
        {artUrl && (
          <div className="relative mx-auto aspect-video w-full max-w-sm overflow-hidden rounded-lg border border-slate-700">
            <Image src={artUrl} alt={species?.name ?? ''} fill className="object-cover" />
          </div>
        )}
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
                    const delta = previewStats ? previewStats[key] - final[key] : 0;
                    return (
                      <tr
                        key={key}
                        className={`border-t border-slate-800 ${delta !== 0 ? 'bg-indigo-950/30' : ''}`}
                      >
                        <td className="py-1 pr-2 font-medium text-slate-200">{statLabel}</td>
                        <td className="py-1 pr-2">{species?.baseStats[key] ?? '—'}</td>
                        <td className="py-1 pr-2">{formatRoll(monster.rolls[key])}</td>
                        <td className="py-1 pr-2">{preItem[key]}</td>
                        <td className="py-1 pr-2">
                          {itemAffectsThis && equippedItem?.effect.type === 'stat_pct'
                            ? (() => {
                                const effectiveValue = effectValueAtLevel(equippedItem.effect.value, equippedReforgeLevel);
                                return `${effectiveValue >= 0 ? '+' : ''}${Math.round(effectiveValue * 100)}%`;
                              })()
                            : '—'}
                        </td>
                        <td className="py-1 pr-2 font-semibold text-slate-100">
                          {previewStats ? previewStats[key] : final[key]}
                          {delta !== 0 && (
                            <span className={delta > 0 ? 'ml-1 text-emerald-400' : 'ml-1 text-red-400'}>
                              ({delta > 0 ? '+' : ''}
                              {delta})
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Power:{' '}
              <span className="font-semibold text-slate-200">
                {Math.round(power(previewStats ?? final))}
              </span>
              {previewStats && (
                <span
                  className={
                    Math.round(power(previewStats)) - Math.round(power(final)) >= 0
                      ? 'ml-1 text-emerald-400'
                      : 'ml-1 text-red-400'
                  }
                >
                  ({Math.round(power(previewStats)) - Math.round(power(final)) >= 0 ? '+' : ''}
                  {Math.round(power(previewStats)) - Math.round(power(final))})
                </span>
              )}
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
          <p className="mt-1 text-xs font-semibold text-slate-400">
            Equipped item
            {equippedItem && (
              <span className={`ml-1 font-normal ${ITEM_RARITY_TEXT[equippedItem.rarity]}`}>
                {equippedItem.name}
                {equippedReforgeLevel > 0 ? ` +${equippedReforgeLevel}` : ''}
              </span>
            )}
          </p>
          <EquipSelect
            monsterId={monster.id}
            equippedInstanceId={monster.equippedInstanceId}
            options={equipmentOptions}
            onPreviewChange={setPreviewInstanceId}
          />
        </div>
      </div>
    </Modal>
  );
}

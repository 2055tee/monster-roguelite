import type { StatRolls } from '@/lib/game/types';

export type RarityLabel = 'Common' | 'Uncommon' | 'Rare' | 'Prime';

const RARITY_COLORS: Record<RarityLabel, string> = {
  Common: 'text-slate-300',
  Uncommon: 'text-emerald-400',
  Rare: 'text-sky-400',
  Prime: 'text-amber-400',
};

export function rollsMean(rolls: StatRolls): number {
  return (rolls.hp + rolls.atk + rolls.def + rolls.spd) / 4;
}

export function rarityLabel(rolls: StatRolls): RarityLabel {
  const mean = rollsMean(rolls);
  if (mean > 1.08) return 'Prime';
  if (mean > 1.05) return 'Rare';
  if (mean >= 0.95) return 'Uncommon';
  return 'Common';
}

export function rarityColorClass(label: RarityLabel): string {
  return RARITY_COLORS[label];
}

export function formatRoll(value: number): string {
  return `×${value.toFixed(2)}`;
}

/** Whether a monster's healing cooldown (ISO timestamp) is still active. */
export function isHealingNow(healingUntil: string | null): boolean {
  return healingUntil !== null && new Date(healingUntil).getTime() > Date.now();
}


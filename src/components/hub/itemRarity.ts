import type { ItemRarity } from '@/lib/game/types';

/** Item/equipment rarity color coding -- separate from `rarity.ts`, which is monster-roll rarity (a different concept). */
export const ITEM_RARITY_TEXT: Record<ItemRarity, string> = {
  common: 'text-slate-300',
  rare: 'text-sky-300',
  epic: 'text-fuchsia-300',
  legendary: 'text-amber-300',
};

export const ITEM_RARITY_BORDER: Record<ItemRarity, string> = {
  common: 'border-slate-600',
  rare: 'border-sky-500',
  epic: 'border-fuchsia-500',
  legendary: 'border-amber-500',
};

export const ITEM_RARITY_BG: Record<ItemRarity, string> = {
  common: 'bg-slate-800/60',
  rare: 'bg-sky-950/40',
  epic: 'bg-fuchsia-950/40',
  legendary: 'bg-amber-950/40',
};

export const ITEM_RARITY_LABEL: Record<ItemRarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

export const SCRAP_EMOJI: Record<ItemRarity, string> = {
  common: '🔩',
  rare: '⚙️',
  epic: '💠',
  legendary: '🌟',
};

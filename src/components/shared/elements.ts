import type { Element } from '@/lib/game/types';

/** v1, locked -- see GAME_DESIGN.md §4. Separate from itemRarity.ts (an unrelated concept). */
export const ELEMENT_EMOJI: Record<Element, string> = {
  fire: '🔥',
  nature: '🍃',
  earth: '🪨',
  electric: '⚡',
  water: '💧',
  normal: '⚪',
  light: '✨',
  dark: '🌑',
};

export const ELEMENT_LABEL: Record<Element, string> = {
  fire: 'Fire',
  nature: 'Nature',
  earth: 'Earth',
  electric: 'Electric',
  water: 'Water',
  normal: 'Normal',
  light: 'Light',
  dark: 'Dark',
};

export const ELEMENT_TEXT: Record<Element, string> = {
  fire: 'text-red-400',
  nature: 'text-emerald-400',
  earth: 'text-orange-400',
  electric: 'text-yellow-300',
  water: 'text-sky-400',
  normal: 'text-slate-400',
  light: 'text-amber-200',
  dark: 'text-violet-400',
};

export const ELEMENT_BORDER: Record<Element, string> = {
  fire: 'border-red-500',
  nature: 'border-emerald-500',
  earth: 'border-orange-500',
  electric: 'border-yellow-400',
  water: 'border-sky-500',
  normal: 'border-slate-500',
  light: 'border-amber-300',
  dark: 'border-violet-500',
};

export const ELEMENT_BG: Record<Element, string> = {
  fire: 'bg-red-950/40',
  nature: 'bg-emerald-950/40',
  earth: 'bg-orange-950/40',
  electric: 'bg-yellow-950/30',
  water: 'bg-sky-950/40',
  normal: 'bg-slate-800/60',
  light: 'bg-amber-950/30',
  dark: 'bg-violet-950/40',
};

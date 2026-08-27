import type { RoomType } from './types';

export const ABILITY_IDS = [
  'basic_attack',
  'heavy_blow',
  'swift_strike',
  'venom_fang',
  'bulwark',
  'war_cry',
  'mend',
] as const;

export const ROOM_LAYOUT_DEFAULT: RoomType[] = ['combat', 'combat', 'rest', 'combat', 'rest', 'boss'];

export const CATCH_CHANCE_FLOOR = 0.1;
export const CATCH_CHANCE_CEILING = 0.9;

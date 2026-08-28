// Typed, offline reference to the content seeded by
// supabase/migrations/005_seed_content_v5.sql — kept in sync manually.
// Mirrors the frozen types in src/lib/game/types.ts (do not edit that file).
//
// IDs here match the UUIDs generated in the `monster-roguelite` Supabase
// project (nxzzgzozzdejhimbfcmm) at the time this migration was applied.
// They are provided so other packages/tests have a stable, typed reference
// without needing a live DB connection. If migration 005 is ever re-run
// against a fresh project, these ids will need to be regenerated to match.

import type { Dungeon, Item, MonsterSpecies } from './types';

export const SPECIES_IDS = {
  Sprigling: '2c77a082-0f4c-404a-8ac0-9c75eef45cde',
  Cinderpup: '3335bfc4-1e97-45e6-bc2d-c37581e9cd58',
  Pebblet: 'e7899e6d-4d68-4d53-bb87-4200e0970613',
  Zaplet: '8007114d-69fc-469e-994a-707c7e1470d1',
  Thornmaw: 'b94386f7-5678-4cc7-be8a-e207a251f027',
  Emberfang: 'e65873af-a0aa-47ee-ae58-9132ca9fb466',
  Glacierhorn: '45b3db25-084e-4934-a8f1-382b0b326c70',
  Voidmaw: '18a6f344-0348-469c-8371-67157ed1eca1',
} as const;

export const ITEM_IDS = {
  'Minor Charm': '24617607-69e6-4e30-9d64-0b061b9c7851',
  'Guard Plate': 'a8a0c997-deb0-47ca-8f8b-8158e28ef7d3',
  'Swift Band': '7ffb38c8-5edb-4428-8ff0-c483923e6109',
  'Vital Locket': '259c14d9-fcd8-409e-915d-1ca1b21c495b',
  'Lure Bait': 'f7b9f7ad-ffa3-4848-949b-840174e1525b',
  'Prime Lure': 'fd374698-da3b-4c33-a0b2-5f5e3b2b7f74',
  'Field Elixir': '55b73150-2761-4d54-bad5-3cde2e18b1a2',
} as const;

export const DUNGEON_IDS = {
  'Verdant Hollow': '01bb4ac5-bc1d-45ff-99db-b1f72d77d2dc',
  'Emberfall Cave': 'ef36df69-faa0-4e42-ba73-4f231331b5c6',
  'Frostspire Ruins': '2d4ab1f1-d158-4ea2-bf12-7fa179530cf2',
  'Voidmaw Depths': '962a40f7-d912-40e5-b168-0aa00efa1024',
} as const;

const DEFAULT_ROOM_LAYOUT: Dungeon['roomLayout'] = [
  'combat',
  'combat',
  'rest',
  'combat',
  'rest',
  'boss',
];

export const SEED_SPECIES: MonsterSpecies[] = [
  {
    id: SPECIES_IDS.Sprigling,
    name: 'Sprigling',
    emoji: '🌱',
    baseStats: { hp: 45, atk: 11, def: 9, spd: 10 },
    rarity: 1,
    minTier: 1,
    signatureAbility: 'mend',
    abilityPool: ['heavy_blow', 'bulwark', 'swift_strike'],
  },
  {
    id: SPECIES_IDS.Cinderpup,
    name: 'Cinderpup',
    emoji: '🔥',
    baseStats: { hp: 42, atk: 14, def: 7, spd: 12 },
    rarity: 1,
    minTier: 1,
    signatureAbility: 'heavy_blow',
    abilityPool: ['swift_strike', 'war_cry', 'venom_fang'],
  },
  {
    id: SPECIES_IDS.Pebblet,
    name: 'Pebblet',
    emoji: '🪨',
    baseStats: { hp: 55, atk: 10, def: 14, spd: 6 },
    rarity: 1,
    minTier: 1,
    signatureAbility: 'bulwark',
    abilityPool: ['heavy_blow', 'mend', 'war_cry'],
  },
  {
    id: SPECIES_IDS.Zaplet,
    name: 'Zaplet',
    emoji: '⚡',
    baseStats: { hp: 38, atk: 13, def: 6, spd: 16 },
    rarity: 1,
    minTier: 1,
    signatureAbility: 'swift_strike',
    abilityPool: ['heavy_blow', 'venom_fang', 'war_cry'],
  },
  {
    id: SPECIES_IDS.Thornmaw,
    name: 'Thornmaw',
    emoji: '🪲',
    baseStats: { hp: 70, atk: 16, def: 12, spd: 11 },
    rarity: 2,
    minTier: 1,
    signatureAbility: 'venom_fang',
    abilityPool: ['heavy_blow', 'bulwark', 'war_cry'],
  },
  {
    id: SPECIES_IDS.Emberfang,
    name: 'Emberfang',
    emoji: '🐺',
    baseStats: { hp: 88, atk: 22, def: 14, spd: 15 },
    rarity: 3,
    minTier: 2,
    signatureAbility: 'war_cry',
    abilityPool: ['heavy_blow', 'swift_strike', 'venom_fang'],
  },
  {
    id: SPECIES_IDS.Glacierhorn,
    name: 'Glacierhorn',
    emoji: '🦬',
    baseStats: { hp: 120, atk: 28, def: 22, spd: 12 },
    rarity: 4,
    minTier: 3,
    signatureAbility: 'bulwark',
    abilityPool: ['heavy_blow', 'mend', 'war_cry'],
  },
  {
    id: SPECIES_IDS.Voidmaw,
    name: 'Voidmaw',
    emoji: '🕳️',
    baseStats: { hp: 150, atk: 38, def: 26, spd: 20 },
    rarity: 5,
    minTier: 4,
    signatureAbility: 'heavy_blow',
    abilityPool: ['venom_fang', 'swift_strike', 'war_cry'],
  },
];

export const SEED_ITEMS: Item[] = [
  {
    id: ITEM_IDS['Minor Charm'],
    name: 'Minor Charm',
    category: 'equipment',
    description: '+10% ATK',
    effect: { type: 'stat_pct', stat: 'atk', value: 0.1 },
    dropWeight: 22,
  },
  {
    id: ITEM_IDS['Guard Plate'],
    name: 'Guard Plate',
    category: 'equipment',
    description: '+15% DEF',
    effect: { type: 'stat_pct', stat: 'def', value: 0.15 },
    dropWeight: 18,
  },
  {
    id: ITEM_IDS['Swift Band'],
    name: 'Swift Band',
    category: 'equipment',
    description: '+15% SPD',
    effect: { type: 'stat_pct', stat: 'spd', value: 0.15 },
    dropWeight: 15,
  },
  {
    id: ITEM_IDS['Vital Locket'],
    name: 'Vital Locket',
    category: 'equipment',
    description: '+12% max HP',
    effect: { type: 'stat_pct', stat: 'hp', value: 0.12 },
    dropWeight: 15,
  },
  {
    id: ITEM_IDS['Lure Bait'],
    name: 'Lure Bait',
    category: 'consumable',
    description: '+15pp catch chance',
    effect: { type: 'catch_bonus', value: 0.15 },
    dropWeight: 18,
  },
  {
    id: ITEM_IDS['Prime Lure'],
    name: 'Prime Lure',
    category: 'consumable',
    description: '+30pp catch chance',
    effect: { type: 'catch_bonus', value: 0.3 },
    dropWeight: 9,
  },
  {
    id: ITEM_IDS['Field Elixir'],
    name: 'Field Elixir',
    category: 'consumable',
    description: 'Instantly finishes healing on one monster',
    effect: { type: 'instant_heal' },
    dropWeight: 3,
  },
];

export const SEED_DUNGEONS: Dungeon[] = [
  {
    id: DUNGEON_IDS['Verdant Hollow'],
    name: 'Verdant Hollow',
    difficultyTier: 1,
    enemyLevel: 1,
    bossSpeciesId: SPECIES_IDS.Thornmaw,
    baseCatchRate: 0.6,
    goldReward: 20,
    enemySpeciesIds: [
      SPECIES_IDS.Sprigling,
      SPECIES_IDS.Cinderpup,
      SPECIES_IDS.Pebblet,
      SPECIES_IDS.Zaplet,
    ],
    roomLayout: DEFAULT_ROOM_LAYOUT,
    enemiesPerRoom: 1,
  },
  {
    id: DUNGEON_IDS['Emberfall Cave'],
    name: 'Emberfall Cave',
    difficultyTier: 2,
    enemyLevel: 8,
    bossSpeciesId: SPECIES_IDS.Emberfang,
    baseCatchRate: 0.5,
    goldReward: 45,
    enemySpeciesIds: [
      SPECIES_IDS.Sprigling,
      SPECIES_IDS.Cinderpup,
      SPECIES_IDS.Pebblet,
      SPECIES_IDS.Zaplet,
    ],
    roomLayout: DEFAULT_ROOM_LAYOUT,
    enemiesPerRoom: 2,
  },
  {
    id: DUNGEON_IDS['Frostspire Ruins'],
    name: 'Frostspire Ruins',
    difficultyTier: 3,
    enemyLevel: 15,
    bossSpeciesId: SPECIES_IDS.Glacierhorn,
    baseCatchRate: 0.4,
    goldReward: 80,
    enemySpeciesIds: [SPECIES_IDS.Thornmaw, SPECIES_IDS.Emberfang],
    roomLayout: DEFAULT_ROOM_LAYOUT,
    enemiesPerRoom: 2,
  },
  {
    id: DUNGEON_IDS['Voidmaw Depths'],
    name: 'Voidmaw Depths',
    difficultyTier: 4,
    enemyLevel: 24,
    bossSpeciesId: SPECIES_IDS.Voidmaw,
    baseCatchRate: 0.3,
    goldReward: 140,
    enemySpeciesIds: [SPECIES_IDS.Thornmaw, SPECIES_IDS.Emberfang],
    roomLayout: DEFAULT_ROOM_LAYOUT,
    enemiesPerRoom: 2,
  },
];

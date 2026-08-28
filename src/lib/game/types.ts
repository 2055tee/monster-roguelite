export type Stats = { hp: number; atk: number; def: number; spd: number };
export type StatRolls = { hp: number; atk: number; def: number; spd: number };

export type MonsterSpecies = {
  id: string;
  name: string;
  emoji: string;
  baseStats: Stats;
  rarity: number;
  minTier: number;
  signatureAbility: string;
  abilityPool: string[];
};

export type OwnedMonster = {
  id: string;
  speciesId: string;
  level: number;
  rolls: StatRolls;
  abilities: string[];
  teamSlot: 0 | 1 | 2 | null;
  currentHp: number | null;
  equippedItemId: string | null;
  isStarter: boolean;
  healingUntil: string | null;
  caughtAt: string;
};

export type ItemEffect =
  | { type: 'stat_pct'; stat: keyof Stats; value: number }
  | { type: 'catch_bonus'; value: number }
  | { type: 'instant_heal' };

export type Item = {
  id: string;
  name: string;
  category: 'equipment' | 'consumable';
  description: string;
  effect: ItemEffect;
  dropWeight: number;
};

export type Dungeon = {
  id: string;
  name: string;
  difficultyTier: number;
  enemyLevel: number;
  bossSpeciesId: string;
  baseCatchRate: number;
  goldReward: number;
  enemySpeciesIds: string[];
  roomLayout: RoomType[];
  enemiesPerRoom: number;
};

export type RoomType = 'combat' | 'rest' | 'boss';

export type Combatant = {
  id: string;
  side: 'player' | 'enemy';
  name: string;
  emoji: string;
  level: number;
  stats: Stats;
  currentHp: number;
  abilities: string[];
  cooldowns: Record<string, number>;
  effects: {
    poison?: { rounds: number; pct: number };
    warcry?: number;
    bulwark?: number;
    firstStrike?: boolean;
  };
};

export type EncounterState = {
  combatants: Combatant[];
  round: number;
  order: string[];
  orderIndex: number;
};

export type LogEntry = { round: number; text: string };

export type DungeonRunStatus = 'in_progress' | 'completed' | 'failed' | 'abandoned';

export type RunView = {
  runId: string;
  dungeonId: string;
  status: DungeonRunStatus;
  currentRoomIndex: number;
  roomLayout: RoomType[];
  team: OwnedMonster[];
  encounter: EncounterState | null;
  log: LogEntry[];
  totalTurns: number;
  totalExpectedTurns: number;
  catchInfo: {
    performance: number;
    baseChance: number;
    faintPenalty: number;
    availableLures: { itemId: string; name: string; bonus: number; quantity: number }[];
  } | null;
  result: {
    goldAwarded: number;
    caughtMonster: OwnedMonster | null;
    catchChance: number | null;
    catchRoll: number | null;
    catchSucceeded: boolean | null;
  } | null;
};

export type HubView = {
  currency: number;
  team: (OwnedMonster | null)[];
  roster: OwnedMonster[];
  inventory: { itemId: string; name: string; category: string; quantity: number }[];
  dungeons: Dungeon[];
  activeRunId: string | null;
};

export type ActionResult = { ok: true } | { ok: false; error: string };
export type ActionError = { ok: false; error: string };

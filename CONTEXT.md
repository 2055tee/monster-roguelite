# Monster Roguelite — Design Context

## Project purpose
Solo dev portfolio project. Originally designed as a multiplayer board game
(monster-catching + battle-phase, bid-based turn order, rarity system), now
being redesigned as a **single-player roguelite** for a web build, intended
as a fullstack portfolio piece. A more polished Steam version may follow
later if the concept proves out — not in scope for now.

Target stack (from broader learning plan, not yet locked to this project):
Next.js + TypeScript + Tailwind (frontend), FastAPI + SQLAlchemy + Alembic
(backend), PostgreSQL, deploy via Vercel + Railway/Render.

## Core loop
1. Player starts with an account and **3 starter monsters**.
2. Each round, player picks a **difficulty** and dives into a **dungeon**.
3. A dungeon is a sequence of rooms: **combat rooms** and **rest rooms**.
4. Rest room: player chooses between opening a **chest** (items) or
   **healing** their monsters — a real tradeoff each time, not free.
5. Combat rooms: **turn-based** battles (mechanics not yet designed).
6. On completing the dungeon, player gets a **chance to catch** the
   dungeon's monster. Catch chance is performance-based (see below) and
   can be boosted with one-time consumable items.
7. Caught monsters have **unique rolled stats and abilities** (not fixed
   per species — rarity/individual variance is a core feature).
8. **No permadeath.** Team persists across runs. Injured monsters need to
   heal before their next dungeon run.

## Performance / catch-chance system
- Performance is measured **per combat room**, based on turns taken to
  clear that room.
- Baseline "expected" pace is derived from **average player team power
  vs. boss power** for that dungeon — a single ratio computed once per
  dungeon run, applied uniformly as the expected pace across all combat
  rooms in that dungeon (including the boss room). This is the
  intentionally simple v1 approach — a per-room-power version was
  considered but deferred as unnecessary complexity for now.
- Player power = **average** of the 3 team monsters' power (not sum).
  Chosen deliberately so fielding fewer/weaker filler monsters doesn't
  disproportionately tank the score, and to keep it simple for v1.
- Catch chance should NOT default to 100% — it scales with how well the
  player performed (turns taken vs. expected pace). Needs a floor (not
  0%) and a ceiling design decision still pending.
- Open: exact formula turning "turns vs. expected pace" into an actual
  probability. Not yet specified — needs to be designed before this
  system can be implemented.

## Difficulty
- Higher difficulty = higher-level enemies AND higher-level/rarer
  catchable monster pool.
- Number of difficulty tiers and exact scaling curve: **not yet defined**.

## Healing system
- Healing time scales with the level of the monster.
- Starter monsters: little to no healing time (flat ~5 seconds, or
  effectively instant) — deliberately kept near-zero so a first-time
  player (e.g. a recruiter demoing the portfolio build) isn't blocked
  waiting on cooldowns early on.
- Higher-level/rarer caught monsters: longer healing times.
- Default healing mode is **real-time cooldown**, with an option to
  **spend in-game currency to skip/speed up** healing.
- Design note: real-time cooldowns are fine for the intended live-service
  pacing, but should be tuned short for the portfolio/demo build
  specifically so a single play session isn't blocked by waiting.

## Items
Two categories:
- **Equipment** — passive, presumably persistent/reusable across runs
  (not consumed on use). Exact effects not yet defined.
- **One-time consumables** — used per-attempt, primarily to boost catch
  chance (analogous to Pokéball-style catch items). Exact effects not
  yet defined.
- Chests found in rest rooms are a source of items (exact drop logic
  not yet defined).

## Monster stats/abilities
- Each caught monster gets **unique rolled stats and abilities** rather
  than being identical to others of its species/type.
- Amount of randomness/variance: not yet decided (design tension noted:
  too much variance risks making rerolling/min-maxing the real game;
  too little makes the "unique" rolls feel like flavor text only).

## Explicitly deferred / not yet designed
These were flagged during design discussion as still open — do not
assume answers, ask or propose options when work touches these:
1. **Turn-based combat mechanics** — abilities, damage formulas, how
   "power" is calculated from a monster's stats. This is the last major
   undefined core system and blocks a lot of the above (power ratio,
   performance scoring) from being concretely implementable.
2. Exact turns-taken-to-catch-chance formula.
3. Number and scaling curve of difficulty tiers.
4. Specific effects of equipment vs. consumable items.
5. Chest reward/drop logic in rest rooms.
6. Monster stat/ability roll variance and generation rules.

## Carried-over design critique (from original board game, still relevant)
- Avoid **stacked randomness** — multiple layered random systems
  compounding unpredictably. Worth checking new systems (catch chance +
  item boosts + stat rolls + difficulty scaling) don't stack into
  something that feels unfair.
- Avoid cognitively taxing conditions for the player (e.g. the original
  design's prime-number capture condition was flagged as too mentally
  taxing and was dropped).

## Build sequencing suggestion (from planning discussion, not committed)
A possible order: static UI shell → client-side dungeon/catching logic →
backend + persistence → combat implementation → polish/deploy. Not a firm
plan — reconsider once combat mechanics are designed, since that system
is currently the biggest blocker to a working vertical slice.
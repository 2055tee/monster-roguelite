# Monster Roguelite

Solo-dev portfolio web game: single-player monster-catching roguelite. Next.js 15/16 App Router + TypeScript + Tailwind v4 frontend, Supabase (Postgres + Auth) backend, deployed to Vercel.

**Live:** https://monster-roguelite.vercel.app
**Repo:** https://github.com/2055tee/monster-roguelite (git-linked to Vercel; pushes to `master` auto-deploy)
**Demo login:** `demo@monsterroguelite.dev` / `DemoPass123!` (rotate this password before sharing the link publicly)

See `CONTEXT.md` for the original design brief.

## Status / where to pick up next

The Shop + Reforge + Hub navigation redesign project (see "Shipped: Shop + Reforge + Hub navigation redesign" below) and the 8-element type system (see "Shipped: Elemental type system" below) are both complete, committed, pushed to `master`, and live on production. Nothing is currently in progress. Candidate next steps (none started, none requested yet — check with the user before picking one):
- Playtest and balance Emberfall Cave / Frostspire Ruins / Voidmaw Depths (tiers 2–4) the same way Verdant Hollow was (see "Verdant Hollow balance"). Now that elements exist, note the type matchups those bosses' element creates against the starter team's elements (Sprigling=nature, Pebblet=earth, Thornmaw=dark) when balancing.
- Repro the minified React #418 hydration warning on run→hub navigation in dev mode (see "Known non-blocking issues").
- Rotate the demo account password before sharing the live link publicly (see Demo login above).
- Consider fixing `Panel`'s `title` prop type (currently silently unusable with `ReactNode` despite its declared type — see WP11's note) if another page needs a colored/rich panel title.

## Architecture

- All game-state writes are server-authoritative: Next.js server actions (`src/server/actions/*.ts`) use a service-role Supabase client (`src/lib/supabase/admin.ts`). Clients can only `SELECT` their own rows via RLS, never write directly. **This is the core anti-cheat property — don't weaken it.** Every action calls `requireUser()` (`src/server/auth.ts`) and manually verifies row ownership; RLS does not protect writes since the service-role key bypasses it entirely, so the action code itself is the authorization boundary.
- Game-engine logic (`src/lib/game/*.ts`, excluding `types.ts`/`constants.ts`/`seed-data.ts`) is pure and I/O-free, unit-tested with vitest (69 tests). Safe to extend — run `npm test` after changes.
- `src/server/game-bridge.ts` glues the pure engine to DB rows for the action layer (building `Combatant`s from monster rows, computing team power, assembling `RunView`).
- RNG is deterministic and persisted: each `dungeon_runs` row has `rng_seed` + `rng_cursor`; every roll (enemy picks, chest drops, catch rolls, stat rolls on catch) advances and persists the cursor, so a run's outcome is reproducible and auditable.
- Vercel function region is pinned to `sin1` (Singapore, via `vercel.json`) to match Supabase's `ap-southeast-1` region — this was previously defaulting to `iad1` (US East) and added a full trans-Pacific round trip to every server action's DB calls. The action layer still makes several sequential (non-`Promise.all`'d) DB calls per action (e.g. `submitCombatAction`); parallelizing those would further reduce latency but hasn't been done.

## Testing

- `npm test` — unit tests for the pure game engine (fast, no I/O).
- `npx tsc --noEmit` — typecheck.
- `npx tsx --env-file=.env.local tests/loop.ts` — integration test against the **live** Supabase project. Drives bootstrap → start run → combat → rest → boss → catch → finish, plus double-start rejection, run-abandon, XP-award/level-up/idempotency, item-instance/equip/reforge (WP10), shop-purchase (WP11), reforge-attempt (WP12), and scrap-award (WP13) checks (73 assertions). This bypasses `requireUser()`'s `next/headers` dependency by calling the same repo/game-bridge layer the actions delegate to, with a resolved user id passed in directly — see the file's header comment for why.
- Run both before every deploy. `npm test` is at 69 unit tests (up from 59) as of the elements system; `tests/loop.ts` is at 73 assertions (unaffected by elements, which is a client/combat-formula-only change with no new server action) as of WP13; both green as of the last commit.

## Game design decisions (v1, load-bearing — not placeholders)

- **Stats**: hp/atk/def/spd. `effectiveStat = floor(base * rollMultiplier * (1 + 0.10*(level-1)))`, roll multipliers uniform `[0.90,1.10]` per stat, rolled once at catch/starter-grant and immutable after. `power(stats) = hp/5 + atk*2 + def*1.5 + spd`.
- **Rarity label** (cosmetic, derived from mean of the 4 rolls): `<0.95` Common, `0.95–1.05` Uncommon, `1.05–1.08` Rare, `>1.08` Prime.
- **Abilities**: every monster = Basic Attack + species signature + 1 rolled from a 3-ability pool. 7 abilities total: `basic_attack, heavy_blow, swift_strike, venom_fang, bulwark, war_cry, mend` — see `src/lib/game/abilities.ts` for power/cooldown/effect values and player-facing descriptions, shown in `CombatView.tsx`'s dedicated description box (not a hover tooltip — those were hard to see) below the ability buttons, which stay visible with the pending one ring-highlighted even mid target-selection. Damage-kind abilities also show an estimated damage range on their button (`estimateDamageRange` in `combat.ts`), computed against the weakest-HP alive enemy.
- **Damage formula**: `raw = atk * abilityPower * (100/(100+def))`, `variance = 0.95+rng()*0.10`, modified by War Cry (+25% atk) / Bulwark (-50% incoming) — see `src/lib/game/combat.ts`.
- **Turn order**: per-round, spd descending, seeded-rng tiebreak, Swift Strike grants next-round priority.
- **Catch chance**: `chance = clamp(baseCatchRate * performance - 0.10*faintCount + consumableBonus, 0.10, 0.90)`, `performance = clamp(expectedTurns/actualTurns, 0.5, 1.5)`, `expectedTurnsPerRoom = clamp(round(6/(teamPower/bossPower)), 3, 15)`, `totalExpected = expectedTurnsPerRoom * 4` (computed once at run start).
- **Difficulty**: 4 fixed dungeons (Verdant Hollow/Emberfall Cave/Frostspire Ruins/Voidmaw Depths), tiers 1–4, fixed 6-room layout `[combat,combat,rest,combat,rest,boss]` for all. Each dungeon has an `enemyLevel` (room mobs) and `enemiesPerRoom` (mobs per combat room); the boss is always `enemyLevel + 3`. Verdant Hollow (Tier 1) is tuned to `enemyLevel: 0`, `enemiesPerRoom: 1` specifically so it's reliably winnable by a fresh level-2 starter team — see "Verdant Hollow balance" below for why and how this was arrived at. The other three dungeons keep the original `enemiesPerRoom: 2` and their original (untouched) enemy levels, and haven't been separately verified for winnability — they're intended to be harder progression content, not guaranteed-clearable.
- **Items**: 16 equipment across 4 stat lines (ATK/DEF/HP/SPD) × 4 rarities (common/rare/epic/legendary), max 1 equipped per monster; 4 consumables (3 catch-chance lures, 1 instant-heal "Field Elixir"). Exact table in `src/lib/game/seed-data.ts` / the `items` DB table (`rarity` column). Equipment is **per-copy** — each owned copy is a row in `item_instances` with its own `reforge_level`, not a quantity in `inventory` (see Reforge below); consumables stay quantity-stacked in `inventory`. **Field Elixir only works in the hub** (`useFieldElixir` in `src/server/actions/hub.ts`) — it skips the out-of-combat healing timer, but has no mid-run use. There is no consumable or mechanic that heals a team between combat rooms other than the Mend/Bulwark abilities and rest-room "Heal Team" choices.
- **Chests**: 1 guaranteed item per chest, weighted drop table (`items.drop_weight` column); equipment rolls create an `item_instances` row via `insertInstance`, not `grantItem`.
- **Healing**: real-time cooldown = `level * 5` seconds, skippable by spending currency (`cost = max(5, ceil(remainingSeconds/10))`). Starters are level 2 (~10s heal) so a demo playthrough is never blocked. `resolveHealingForRow(s)` (`src/server/game-bridge.ts`) heals a monster on read if its timer has elapsed (or, defensively, if it's below max HP with no timer at all) — see "Bugs fixed" below for why this exists.
- **No permadeath.** Fainted monsters just go into a longer healing state. A fainted ally cannot be targeted by Mend mid-combat (by design — `CombatView.tsx`'s `renderRow` only wires click targets for non-dead combatants); recovery only happens via the healing-timer mechanic.
- **Reforge** (v1, locked — see "Shipped: Shop + Reforge..." below for the full spec): equipment can be upgraded `+1` at a time, up to a cap by rarity (`common 6, rare 9, epic 12, legendary 15`), each level multiplying the item's effect value by `1 + 0.05*level`. Costs 1 upgrade scrap of the item's own rarity per attempt; success chance to reach `+N` is `(100-5N)/100`. On failure the scrap is consumed and the item's level is unchanged — no downgrade, ever. `src/lib/game/reforge.ts`; server action `src/server/actions/reforge.ts`; UI at `/hub/reforge`.
- **Upgrade scrap**: 4 tiers (common/rare/epic/legendary) stored as int columns on `profiles`. Sources: a full dungeon clear (1-3 units, tier odds skew rarer at higher dungeon tiers — `src/lib/game/scrap.ts`) and the hourly shop.
- **Shop**: a single global stock shared by every player, deterministically re-rolled every real-world hour (`hourBucket = floor(Date.now()/3_600_000)`, no cron job / no persisted stock row — `rollShop` in `src/lib/game/shop.ts` is a pure function of the bucket). 5-6 equipment/consumable listings plus 1 scrap listing per hour; each slot buyable once per hour per player. Server action `src/server/actions/shop.ts`; UI at `/hub/shop`.
- **Elements** (v1, locked — see "Shipped: Elemental type system" below for the full spec): 8 elements — a 5-way core cycle (Fire→Nature→Earth→Electric→Water→Fire) plus Normal (no advantage/disadvantage either direction) and a Light/Dark mutual rivalry (bonus only against each other, neutral vs everything else). Advantage `×1.25`, disadvantage `×0.80`, neutral `×1.00`, folded into the existing damage formula as `typeMult` (`src/lib/game/elements.ts`, `combat.ts`). Every `MonsterSpecies` and `Combatant` carries a required `element` field; current 8 species map to `Sprigling=nature, Cinderpup=fire, Pebblet=earth, Zaplet=electric, Thornmaw=dark, Emberfang=fire, Glacierhorn=earth, Voidmaw=dark` (Light and Normal unused, reserved for future species). See `GAME_DESIGN.md` §4 for the full engine-agnostic spec (written for a possible future Roblox port).

## Data model

See `supabase/migrations/002_game_systems_v2.sql` through `011_species_element_v11.sql` for the authoritative schema (source-controlled copies of what's live on the Supabase project, id `nxzzgzozzdejhimbfcmm`, region `ap-southeast-1`). Migrations 008-010 (item rarity, `item_instances`, scrap/shop/reforge columns and tables) shipped with the Shop + Reforge project — see that section below for exact SQL. Migration 011 (`monster_species.element`) shipped with the Elemental type system — see that section below. Frozen TypeScript types mirroring this: `src/lib/game/types.ts` (don't modify without updating every consumer). `src/lib/supabase/database.types.ts` is generated from the live schema — regenerate after any migration.

## Verdant Hollow balance (why it's tuned the way it is)

A full isolated playthrough at the original tuning (`enemyLevel: 3`, `enemiesPerRoom: 2`, matching the other 3 dungeons) reliably lost — first attempt wiped in room 2, because losing one monster in room 1 (enemies routinely dealt 50%+ of a starter's max HP in a single hit) turned every subsequent room into an effective 2-vs-1 or worse for the remaining team, with no rest room between rooms 1 and 2 to recover.

Fixed in two steps, both applied as **data changes only** — no combat formula, ability balance, or room-layout changes, since those are documented as locked v1 designs:
1. `enemiesPerRoom` 2 → 1 for Verdant Hollow (migration 006, plus `enemyLevel` 3 → 1) — cuts the "lose one monster, get ganged up on" spiral, since a single enemy can only act once per round regardless of team size.
2. `enemyLevel` 1 → 0 — a further nudge after a full playthrough at step 1's tuning got the team to the boss in great shape but still lost right at the end (boss down to 17/136 HP). Since boss level is `enemyLevel + 3`, this single knob also softens the boss (level 4 → 3, ~136 HP → ~126, its Heavy Blow one-shot ~44 → ~42 damage) on top of the two regular combat rooms.

**Verified winnable end-to-end** at the current tuning: a clean, isolated playthrough (no shortcuts, no artificially weakened boss) went hub → dungeon → all 4 combat rooms → both rest rooms → boss defeated → caught → finish, with gold and the caught monster correctly reflected back in the hub/roster. Team took zero damage through rooms 1, 2, and 4; the boss fight itself was a real, close fight (final blow landed with the boss at 3 HP, one surviving monster on the player's side) — genuinely winnable, not trivial.

If Verdant Hollow ever needs re-balancing again (e.g. after other changes), the levers to reach for, in order of surgical-ness: `enemies_per_room` and `enemy_level` on the `dungeons` table (or `src/lib/game/seed-data.ts`, which must be updated in lockstep — `catalog.ts` reads from the DB at runtime, seed-data.ts is just the source of truth for re-seeding) before touching shared formulas that would affect all 4 dungeons.

## Bugs fixed (worth knowing about if they resurface)

- **P0 combat 500**: every damage-dealing combat action failed with a 500, because `resolvePlayerAction` (`src/lib/game/combat.ts`) checks `actor.abilities.includes(input.abilityId)`, but `Combatant.abilities` (built in `game-bridge.ts`'s `buildPlayerCombatant` and `combat.ts`'s `buildEnemy`) never included `'basic_attack'` — it was only prepended client-side in `CombatView.tsx` for the button list. Fixed by always including `'basic_attack'` at `Combatant` construction. If this class of bug recurs, check that anything the UI treats as "always available" is actually present in the underlying data the server validates against.
- **Fainted-monster softlock**: a monster whose healing timer had elapsed (or was never set despite being below max HP) stayed fainted forever — `skipHealing`/`useElixir` both require an *active* (future) `healing_until`, and nothing else ever restored `current_hp`. Fixed with `resolveHealingForRow(s)` in `game-bridge.ts`, called from `getHubState` (`hub.ts`) and `startRun`'s team-readiness check (`run.ts`) — heals a monster on read if it's below max HP and its timer is null or in the past.
- **Demo login broken**: `demo@monsterroguelite.dev` (hardcoded in `src/app/login/page.tsx`) didn't exist in Supabase Auth. Created via `auth.admin.createUser` with `email_confirm: true`.
- **Hub roster HP display**: `TeamSlotCard.tsx`'s `approxMaxHp` was missing the level-scaling term from `stats.ts`'s `effectiveStats` — fixed to match (still doesn't account for an equipped item's HP modifier, a known minor gap).
- **Header currency badge**: was a hardcoded static `🪙 —` placeholder in `src/app/(game)/layout.tsx`, never wired to real data. Fixed by calling `ensureProfile` and rendering `CurrencyBadge`.
- **Chest contents hidden**: opening a rest-room chest showed a generic "found something useful" instead of the actual item. `chooseRestOption` (`src/server/actions/run.ts`) now returns `{ view, grantedItem }` and `RestView.tsx` displays the item's real name/category.
- **UUIDs shown instead of species names**: `formatSpeciesName()` (`src/components/run/format.ts`) assumed `speciesId` was a readable slug like `flame_pup`; species ids are actually DB UUIDs, so it was title-casing UUID fragments (e.g. "B94386f7 5678 4cc7..." instead of "Thornmaw") on the catch result, run-complete summary, defeat screen, and rest-room heal list. Fixed with `speciesName(speciesId, catalog)`, a real catalog lookup threaded down from the run page's `getSpeciesCatalog()` call (`speciesCatalog` prop through `RunScreen` → `CatchView`/`RestView`/`SummaryView`/`DefeatView`); `formatSpeciesName` is now only a last-resort fallback for an id with no catalog entry. The two "Recovering:" lists only had `monsterId`, not `speciesId`, so `SummaryView`/`DefeatView` also take the run's `team` snapshot to resolve `monsterId → speciesId → name`.

## Shipped: Roster/Battle UI overhaul + XP system

Planned by an Opus pass, confirmed with the user, implemented by Sonnet one work-package at a time. All 8 work packages are complete and verified live on production (see WP8 below for the final end-to-end pass). Full plan/history kept in this section for reference.

**User-confirmed decisions:**
- Roster "5 stats" = the 4 base stats (HP/ATK/DEF/SPD) as colored segments inside one bar, with total bar length = POWER.
- XP design below ships as proposed, including fainted monsters getting full XP and the healing-cooldown cap.
- Drag-and-drop team slots: **both** DnD and the existing Slot 0/1/2 buttons stay (buttons move into a monster-detail modal as the touch/keyboard fallback — HTML5 DnD doesn't work on touchscreens at all).
- Dragging onto an occupied slot **swaps** the two monsters (not evict-to-bench like today's button behavior).

**XP design (v1, locked — WP3 shipped it, same status as the other formulas in this file):**
- New pure module `src/lib/game/xp.ts`: `MAX_LEVEL = 20`, `xpToNext(level) = 50 + 25 * (level-1)^2` (L2→3=75, L3→4=150, L4→5=275...).
- Earned per **cleared** room (read from `combat_encounters` rows with `status='won'` for the run), awarded in full to every monster in `team_snapshot`: `roomXp(roomLevel, isBoss) = round(10 * (1 + 0.15*roomLevel) * (isBoss ? 3 : 1))`, rest rooms award 0, and a full clear (`run.status === 'completed'`) multiplies the summed total by 1.5. Fainted monsters still get full XP (no permadeath philosophy). Abandoned runs award 0 (no `finishRun` call).
- Applied server-side in `finishRun` (`src/server/actions/catch.ts`) before the existing healing-timer loop: loop level-ups while `xp >= xpToNext(level)`, add the max-HP delta to `current_hp` so leveling doesn't look like fresh damage, then let the healing loop run with the new level.
- Healing cooldown formula changes from `level * 5` to `min(level, 12) * 5` seconds (caps at 60s) so leveling doesn't make healing punishingly slow.
- New DB columns (migration 007): `monsters.xp int not null default 0`, `dungeon_runs.xp_awarded int not null default 0`.

**Work packages** (each: `npx tsc --noEmit` → `npm test` → `tests/loop.ts` where noted → commit+push → live Playwright verify → update this file):
1. ✅ **Turn-order sidebar** (`TurnOrderPanel.tsx`, isolated, no DB) — shows the rest of the current round exactly (`encounter.order` from `orderIndex`), plus a dimmed "next round (est.)" list predicted without the engine's RNG tiebreak (sorted by spd, first-strikers first, ties broken by id — labeled as an estimate since it can't be exact without consuming the real seed). Player = green (`border-emerald-500`), enemy = red (`border-red-500`), current actor ring-highlighted. `CombatView.tsx` restructured to a `lg:grid-cols-[13rem_1fr]` layout, sidebar sticky on desktop, horizontal-scroll strip on mobile.
2. ✅ **XP data layer + pure engine** — migration 007 (`monsters.xp`, `dungeon_runs.xp_awarded`), `src/lib/game/xp.ts` (`xpToNext`, `roomXp`, `applyXp`, `xpProgress`), 14 new tests in `tests/game/xp.test.ts`. `OwnedMonster` gained `xp: number` (frozen-type change — updated every consumer: `mapMonsterRow`, the starter/catch draft literals in `hub.ts`/`catch.ts`, and two test fixtures). `updateMonster`'s patch type widened with `level`/`xp`. Nothing awards or reads XP yet — that's WP3.
3. ✅ **Award XP on run finish** — `finishRun` (`src/server/actions/catch.ts`) now sums `roomXp` over every `combat_encounters` row with `status='won'` for the run (via new `getEncountersForRun`), applies `applyXp` per team monster (adding the max-HP delta on a level-up so it doesn't read as fresh damage), persists `level`/`xp`/`xp_awarded`, and uses the new `min(level,12)*5` healing-cooldown cap. Returns `{ gold, healing, xpAwarded, levelUps }`; surfaced in `SummaryView` ("✨ +111 XP", "🎉 X reached Lv N!") and `DefeatView` ("+N XP from the rooms you cleared"). **XP design is now locked** (see above) — confirmed live: a full Verdant Hollow clear awards exactly 111 XP as documented, taking a fresh Lv2 starter to Lv3 with 36xp remainder. `tests/loop.ts` mirrors the new logic (`finishRunDirect`) with assertions for the award, the level-up, persistence, and double-finish idempotency (50 total assertions, up from 45).
4. ✅ **Roster stat model + new `RosterCard` layout** — `RosterCard` now computes real `effectiveStats` (species + item already flowed into it) instead of showing raw roll multipliers: line 1 name+rarity, line 2 `XpBar.tsx` (Lv + XP progress, "MAX" at the level cap), line 3 `StatSegmentBar.tsx` (one bar per monster, 4 colored segments sized by each stat's *contribution to power* — HP `bg-red-500`, ATK `bg-amber-500`, DEF `bg-sky-500`, SPD `bg-emerald-500` — total bar length scaled against a roster-wide max power computed once in `hub/monsters/page.tsx` so cards are comparable, numeric legend below). Also closed `TeamSlotCard.approxMaxHp`'s last gap (the equipped item's stat modifier) by threading `itemCatalog` into `hub/page.tsx` and switching both `TeamSlotCard` and `RosterCard` to call the real `effectiveStats` directly — no more hand-rolled approximation anywhere in the hub UI.
5. ✅ **Monster detail modal** — `RosterCard` is now a client component (`'use client'`) and the whole card is a click/Enter/Space-activatable trigger (`role="button"`, focus ring) that opens `MonsterDetailModal.tsx`: full stat breakdown table (base → roll multiplier → pre-item effective stat → item modifier → final, computed by calling the real `effectiveStats` twice — with and without the equipped item — rather than re-deriving the arithmetic), power total, every ability (including the always-available `basic_attack`, prepended the same way `CombatView` does) with name/cooldown/description, equipped item, team slot, starter/caught status, caught date, healing countdown. `AssignSlotButtons`/`EquipSelect` moved out of the card grid into the modal, which also closes the "nested interactive elements" problem the card-as-button approach would otherwise have hit. `Modal.tsx` gained Esc-to-close and backdrop-click-to-close (now `'use client'` itself, since it needs a keydown listener).
6. ✅ **Equip preview with affected-stat highlight** — `EquipSelect.tsx` now takes full `Item[]` (not `{itemId,name}[]`) and an optional `onPreviewChange?: (itemId: string | null) => void`, fired synchronously in `handleChange` before the async `equipItem(...)` call resolves (and reverted back to the currently-equipped id if the server call errors). Native `<select>` doesn't support real hover-preview reliably cross-browser, so the preview fires on selection, not mouse-hover — the change is visible immediately, before the server commit lands. `MonsterDetailModal.tsx` holds the `previewItemId` state, computes `previewStats` via `effectiveStats(species, monster, previewItem)` only when it differs from the committed item, and the stat-breakdown table's Final column shows the delta inline (`+21` emerald / `-5` red) per stat plus a Power total delta, with the changed row(s) tinted (`bg-indigo-950/30`). `hub/monsters/page.tsx`'s `equipmentOptions` now maps inventory entries through `itemCatalog` to full `Item` objects instead of `{itemId,name}`, so all three consumers (`RosterCard`, `MonsterDetailModal`, `EquipSelect`) share one real `Item` shape. Client-only change — no server action or DB changes; `equipItem` (`hub.ts`) untouched.
7. ✅ **Drag-and-drop team slots** — `TeamSlotDropZone.tsx` (new) renders the 3 team slots as a left-side panel on `hub/monsters/page.tsx` (`grid-cols-[13rem_1fr]`, sticky on desktop, horizontal strip on mobile — same pattern as WP1's `TurnOrderPanel`), each a dashed-border drop target showing the occupant's name/XP bar or "Drag a monster here". `RosterCard.tsx` is now `draggable`, setting the monster id on `dataTransfer` (custom MIME `application/x-monster-id`, exported as `DRAG_MIME`) in `onDragStart`; drag and the existing click-to-open-modal coexist fine since `dragstart` doesn't fire `click`. `setTeamSlot` (`src/server/actions/hub.ts`) changed from evict-to-bench to **swap**: the displaced occupant now takes the dragged monster's *previous* `team_slot` (bench/`null` if it wasn't on the team) instead of always going to bench — this also changes the existing modal Slot 0/1/2 buttons' behavior identically, which is intended (one semantic, two input methods). Verified live: dispatched a real `dragstart`→`dragover`→`drop` `DragEvent` sequence via JS (native `left_click_drag` mouse simulation doesn't trigger HTML5 DnD's browser-level drag protocol, so this was necessary to actually exercise the drop handler) — dragging a benched monster onto an occupied slot correctly swapped it in and sent the previous occupant to the bench, no console errors.
8. ✅ **Docs + full live verification pass** — this section rewritten to reflect the finished state. A full live playthrough on production re-verified the whole feature set working together (not just isolated per-WP spot-checks): roster page (3-slot drop panel + card grid + detail modal), equip preview (Vital Locket: `+12%` shown, HP 91→101, Power 90→92), the combat turn-order sidebar updating correctly turn-by-turn through a full real Verdant Hollow clear, and the XP/level-up flow (real unforced boss fight, `SummaryView` showed `+111 XP for every team member` / `Thornmaw reached Lv 4!`, hub afterward correctly showed currency 100→120 and the new levels/XP persisted). No bugs found.

## Shipped: Shop + Reforge + Hub navigation redesign (WP9–WP15)

Planned by an Opus pass, confirmed with the user, implemented by Sonnet one work package at a time — same process as the WP1–WP8 project above. All 7 work packages are complete and verified live (see WP15 below for the final end-to-end pass). Full plan/history kept in this section for reference, same as the WP1-8 section above. Pushed to the remote and live in production.

**Work packages:**
9. ✅ Schema (migrations 008–010), item rarity + 20-item catalog (16 equipment across 4 archetypes × 4 rarities + 4 consumables), pure engine (`reforge.ts`, `shop.ts`, `scrap.ts`, `hash32` in `rng.ts`) + 22 new unit tests (59 total, up from 37). No UI/gameplay change yet. Item rarity table deviates from the original Opus draft per user instruction: each of the 4 existing equipment archetypes (Minor Charm/Guard Plate/Swift Band/Vital Locket) now has a Rare/Epic/Legendary variant instead of 4 unrelated new items being added — see the "Locked design decisions" table above for the final 16-item list, drop weights, and real DB UUIDs (recorded in `seed-data.ts`'s `ITEM_IDS`).
10. ✅ Item-instance cutover — equipment moved from quantity-stacked `inventory` to per-copy `item_instances` with a `reforge_level` (migration 009's backfill converted every existing owned copy to a +0 instance and pointed `monsters.equipped_instance_id` at the right one; verified live on the demo account — 6 real equipment instances appeared correctly with equipped/unequipped status). New `src/server/repo/item-instance.ts`. `game-bridge.ts`'s new `getEquippedContext(row)` is the single point resolving `equipped_instance_id → item_instances → items` — `buildPlayerCombatant`/`getMaxHpFor`/`computeTeamPower` all route through it, so reforge bonuses reach combat automatically. `hub.ts`'s `equipItem` now takes an instance id (unequips the instance from any other monster first, since one instance = one physical copy). `run.ts`'s chest branch creates an instance instead of `grantItem` when the roll lands on equipment. `profile.ts`'s `grantItem` now throws if given an equipment item id (enforces the equipment-goes-through-instances invariant). UI: `EquipSelect`/`RosterCard`/`MonsterDetailModal`/`TeamSlotCard` all thread `reforgeLevel` into `effectiveStats`; new `src/components/hub/itemRarity.ts` (rarity color tokens, separate from `rarity.ts`'s monster-roll rarity) and `EquipmentInstanceRow.tsx` (per-instance rows on the inventory page, replacing the old quantity-based equipment list). `tests/loop.ts` extended with an item-instance section (insert, equip, reforge-to-+6, exact-stat-value check) — 56 assertions total, up from 49, all green against the live project.
11. ✅ Shop server actions (`src/server/actions/shop.ts`: `getShopState`, `buyShopSlot`) + `/hub/shop` page (`ShopListingCard.tsx`, `ShopResetCountdown.tsx`). Verified live on the demo account: gold went 120→95 buying a 25g Lure Bait, slot correctly flipped to "Owned this hour" and disabled, countdown showed the real time-to-next-hour. `tests/loop.ts` extended with a `buyShopSlotDirect` mirror (gold decrement, correct grant per listing kind, duplicate-slot rejection, exactly one `shop_purchases` row) — 62 assertions total, up from 56. Note: `Panel`'s `title` prop can't actually take a `ReactNode` despite its declared type (it's intersected with `HTMLAttributes<HTMLDivElement>`, whose own `title: string` wins) — the shop page works around this with a plain heading `<p>` inside the panel body instead of passing colored JSX through `title`; worth fixing `Panel`'s type properly if this recurs elsewhere.
12. ✅ Reforge server action (`src/server/actions/reforge.ts`: `getReforgeState`, `attemptReforge`) + `/hub/reforge` page (`ReforgeCard.tsx`, `ScrapBalancePanel.tsx`). Verified live (with scrap manually granted via SQL, since dungeon scrap drops are WP13 — reverted after): reforging a Minor Charm from +0 showed the chance ladder (95%→90%), the "✨ Reforged to +1!" banner, progress bar fill, and bonus updating +10%→+11%, scrap balance decrementing 10→9. `tests/loop.ts` extended with `attemptReforgeDirect` (scrap consumed regardless of outcome, level only advances on success, at-cap rejection consumes nothing, audit row written) — 68 assertions total, up from 62.
13. ✅ Scrap drops wired into `finishRun` (`catch.ts`) — full clears only, rolled off the run's own `rng_seed`/`rng_cursor` (same cursor XP already advances past, persisted in the same `updateRun` call as `completed_at` so the existing idempotency guard also protects scrap), applied via `adjustScrap` per non-zero tier. `SummaryView.tsx` shows a rarity-colored scrap line beside the XP line (hidden when all-zero); `DefeatView.tsx` notes scrap only drops on a full clear. New global `ScrapBadge.tsx` next to `CurrencyBadge` in `layout.tsx` (same `ensureProfile` call, no extra query) — verified live rendering `🔩3 ⚙️1` on the demo account. `tests/loop.ts` extended: full clear awards 1-3 total scrap and persists the exact breakdown on the run row and profile, idempotent on double-finish (73 assertions total, up from 68). Note: comparing DB-round-tripped jsonb objects via `JSON.stringify` is unreliable (key-order artifacts caused two false failures) — compare field-by-field instead (see `scrapEquals` helper in `tests/loop.ts`).
14. ✅ Hub 4-button nav redesign — `hub/page.tsx` is now a landing page (run-in-progress panel + team panel + `HubNavButton.tsx` grid, `grid-cols-2 sm:grid-cols-4`), duplicate `CurrencyBadge` removed (already global in the layout). New `/hub/dungeon` page holds the dungeon grid moved out unchanged (same `DungeonCard`, same disabled/reason logic). Verified live: all 4 buttons render with correct colors/subtitles, Shop subtitle shows a live-ticking countdown, Dungeon routes to `/hub/dungeon` with the 4 dungeon cards and a working back-link.
15. ✅ Docs rewrite (this section → "Shipped") + full live end-to-end verification pass. Real playthrough on the demo account, no shortcuts: hub → `/hub/dungeon` → Verdant Hollow → all 4 combat rooms fought turn-by-turn (one monster fainted mid-run, run continued per the no-permadeath design) → both rest rooms (heal) → boss defeated → catch succeeded (Thornmaw caught) → `finishRun` awarded 20 gold, 111 XP, a level-up, **and `🔩 +2 Common · 💠 +1 Epic` scrap** on the summary screen exactly as WP13 designed. Then: shop purchase (Minor Charm, 60g, gold 115→55, slot flipped to "Owned this hour"), reforged it twice using the earned common scrap (+0→+1→+2, both attempts succeeded at 95%/90%, bonus 10%→11% shown live, scrap 2→0), verified the exact same +11% bonus in the monster detail modal's stat table, then swapped that monster onto the team and started a second run — its ability-damage estimates in the live `CombatView` reflected the boosted ATK, confirming the reforge bonus really does reach combat via `getEquippedContext`, not just the hub display. Also confirmed (via hard navigation) that `CurrencyBadge`/`ScrapBadge` show correct live values — a stale header after client-side `router.push` is a pre-existing Next.js layout-caching quirk, not a WP13 regression (documented below). Final counts: `npx tsc --noEmit` clean, `npm test` 59/59, `tests/loop.ts` 73/73 against the live project.

### User-confirmed decisions
- Reforge failure: **scrap consumed, item stays at its current level** — no downgrade, no destruction (matches the game's no-permadeath philosophy).
- Item rarity: each of the 4 existing equipment archetypes gets a variant at **all 4 rarities** — 16 equipment items total, stat bonus scaling up per rarity (table below; this overrides the Opus-authored version of this table, which only added 4 unrelated new items instead of tiering the existing 4 — the table below is the one to build from).
- Autonomy: implement continuously without stopping for confirmation between work packages; if a session runs low on room to keep going, stop cleanly and leave this checklist accurate so the next session can resume immediately.

### Why the current data model has to change
`items` is a catalog of **types** (`id/name/category/description/effect/drop_weight`), `inventory` is `(owner_id, item_id, quantity)`, and `monsters.equipped_item_id` points at a catalog row. There's no per-copy identity anywhere, so "this Guard Plate is +4 and that one is +0" is unrepresentable today. Reforge requires a per-copy `item_instances` table for **equipment only** — consumables stay quantity-stacked in `inventory` (fungible, not reforgeable). There's also no rarity/quality field on `items` at all yet.

### Locked design decisions (v1 — same status as the combat/catch/XP formulas above)

**Item rarity & the 16-item equipment catalog.** Each of the 4 existing stat-line archetypes now exists at all 4 rarities, with the original item becoming that line's Common tier:

| Item | Stat line | Rarity | Effect | drop_weight |
|---|---|---|---|---|
| Minor Charm | ATK | common | +10% ATK | 22 |
| Charm of Force | ATK | rare | +18% ATK | 9 |
| Charm of Conquest | ATK | epic | +28% ATK | 4 |
| Charm of Ascendance | ATK | legendary | +40% ATK | 1 |
| Guard Plate | DEF | common | +15% DEF | 18 |
| Bastion Plate | DEF | rare | +24% DEF | 8 |
| Aegis Plate | DEF | epic | +36% DEF | 3 |
| Sovereign Plate | DEF | legendary | +50% DEF | 1 |
| Swift Band | SPD | common | +15% SPD | 15 |
| Gale Band | SPD | rare | +24% SPD | 7 |
| Tempest Band | SPD | epic | +36% SPD | 3 |
| Zephyr Band | SPD | legendary | +50% SPD | 1 |
| Vital Locket | HP | common | +12% HP | 15 |
| Locket of Vigor | HP | rare | +20% HP | 7 |
| Locket of Vitality | HP | epic | +30% HP | 3 |
| Locket of Eternity | HP | legendary | +42% HP | 1 |
| Lure Bait | (consumable) | common | +15pp catch | 18 |
| Prime Lure | (consumable) | rare | +30pp catch | 9 |
| Field Elixir | (consumable) | rare | instant heal | 3 |
| Grand Lure (new) | (consumable) | epic | +45pp catch | 2 |

Chest drop-table total weight goes 100 → 150 (existing items' relative odds dilute by a third — intentional and accepted). No legendary consumable exists in v1 — the shop's rarity-fallback rule (below) handles an empty pool by stepping down a tier, then skipping the slot if the whole category is exhausted.

Migration `008_item_rarity_v8.sql`:
```sql
alter table public.items
  add column rarity text not null default 'common'
  check (rarity in ('common','rare','epic','legendary'));

-- existing 7 rows: Minor Charm/Guard Plate/Swift Band/Vital Locket/Lure Bait stay 'common' default;
update public.items set rarity = 'rare' where name in ('Prime Lure','Field Elixir');

insert into public.items (name, category, description, effect, drop_weight, rarity) values
  ('Charm of Force',      'equipment', '+18% ATK', '{"type":"stat_pct","stat":"atk","value":0.18}', 9, 'rare'),
  ('Charm of Conquest',   'equipment', '+28% ATK', '{"type":"stat_pct","stat":"atk","value":0.28}', 4, 'epic'),
  ('Charm of Ascendance', 'equipment', '+40% ATK', '{"type":"stat_pct","stat":"atk","value":0.40}', 1, 'legendary'),
  ('Bastion Plate',       'equipment', '+24% DEF', '{"type":"stat_pct","stat":"def","value":0.24}', 8, 'rare'),
  ('Aegis Plate',         'equipment', '+36% DEF', '{"type":"stat_pct","stat":"def","value":0.36}', 3, 'epic'),
  ('Sovereign Plate',     'equipment', '+50% DEF', '{"type":"stat_pct","stat":"def","value":0.50}', 1, 'legendary'),
  ('Gale Band',           'equipment', '+24% SPD', '{"type":"stat_pct","stat":"spd","value":0.24}', 7, 'rare'),
  ('Tempest Band',        'equipment', '+36% SPD', '{"type":"stat_pct","stat":"spd","value":0.36}', 3, 'epic'),
  ('Zephyr Band',         'equipment', '+50% SPD', '{"type":"stat_pct","stat":"spd","value":0.50}', 1, 'legendary'),
  ('Locket of Vigor',     'equipment', '+20% HP',  '{"type":"stat_pct","stat":"hp","value":0.20}',  7, 'rare'),
  ('Locket of Vitality',  'equipment', '+30% HP',  '{"type":"stat_pct","stat":"hp","value":0.30}',  3, 'epic'),
  ('Locket of Eternity',  'equipment', '+42% HP',  '{"type":"stat_pct","stat":"hp","value":0.42}',  1, 'legendary'),
  ('Grand Lure',          'consumable','+45pp catch chance', '{"type":"catch_bonus","value":0.45}', 2, 'epic')
on conflict (name) do update set
  category = excluded.category, description = excluded.description,
  effect = excluded.effect, drop_weight = excluded.drop_weight, rarity = excluded.rarity;
```

**Reforge.**
- Caps by item rarity: `common 6, rare 9, epic 12, legendary 15`.
- Bonus: each level multiplies the item's effect value by `1 + 0.05 * level`. E.g. Minor Charm (+10% ATK) at +6 → `0.10 * 1.30 = 0.13` → +13% ATK. Locket of Eternity (+42% HP) at +15 → `0.42 * 1.75 = 0.735` → +73.5% max HP.
- Cost: **1 upgrade scrap of the item's own rarity tier** per attempt, exact match, no substitution. No gold cost.
- Success chance to reach `+N`: `(100 - 5N) / 100` — +1 → 95%, +10 → 50%, +15 → 25%.
- **On failure: scrap consumed, item stays at exactly its current level.** Never downgrades, never breaks.
- Equipped items reforge in place; combat stats update immediately, no re-equip needed.
- Consumables are not reforgeable. No sell/salvage-for-scrap mechanic in v1.

**Upgrade scrap.**
- 4 tiers matching item rarity, stored as 4 int columns on `profiles` (mirrors the existing `currency` column — no new table, no join on every hub read): `scrap_common`, `scrap_rare`, `scrap_epic`, `scrap_legendary`.
- Sources: dungeon clears (WP13) and the hourly shop (WP11).
- Emoji: common 🔩, rare ⚙️, epic 💠, legendary 🌟.

**Shop.**
- **Global, not per-player** — every player sees the same stock in the same real-world hour, derived purely from `hourBucket = floor(Date.now() / 3_600_000)`. No cron job, no `shop_stock` table — stock is a pure function of the bucket, recomputed on every read.
- Stock: `5 + (rng() < 0.5 ? 1 : 0)` item listings, guaranteed ≥2 equipment and ≥2 consumables, remaining slots coin-flipped between the two. **Plus exactly 1 scrap listing**, separate from the 5–6 (so 6–7 rows total).
- Rarity weights per listing: `common 55, rare 28, epic 13, legendary 4`.
- Scrap listing: tier uniform 1/4 across all four tiers (no progression gating — legendary scrap can appear hour 1), bundle of **3 scrap**, buyable once per hour per player.
- Per-player purchase state: each slot buyable **once per hour per player** (`shop_purchases` PK `(owner_id, hour_bucket, slot_index)`).
- Prices (gold): equipment common/rare/epic/legendary = **60/150/360/800**; consumable = **25/60/140/300**; scrap per unit = **20/50/120/260** (× 3 for the bundle).
- Unpurchased stock vanishes on reset (nothing persists/carries over). Duplicates across different hours are fine; no duplicate item id within one hour's roll.

**RNG approach** (three different needs, three different answers — matches the project's existing auditability property):
1. **Shop roll** — pure hash of the hour bucket, `createRng(hash32(hourBucket), 0)`, no persisted cursor. More auditable than a cursor would be: the whole hour's stock is reproducible from one public integer forever, no DB state. Server always recomputes the bucket from `Date.now()` and ignores any client-supplied bucket.
2. **Reforge roll** — persisted seed + cursor on `profiles` (`reforge_rng_seed bigint`, `reforge_rng_cursor int`), advanced/persisted per attempt exactly like `dungeon_runs.rng_seed/rng_cursor`. A reforge attempt is a real gamble that permanently changes an item — same class of event as a catch roll, same auditability guarantee. Every attempt also logged to `reforge_attempts` (seed/cursor/chance/roll/result).
3. **Scrap drop roll** — rolled inside `finishRun` off the run's own `rng_seed`/`rng_cursor`. Zero new RNG state.

### WP9 — Schema, item rarity, pure engine (no UI, no gameplay wiring)

Migrations (apply via `mcp__supabase__apply_migration`, commit source-controlled copies to `supabase/migrations/`):
- `008_item_rarity_v8.sql` — items.rarity + the 16-item equipment catalog + Grand Lure (SQL above).
- `009_item_instances_v9.sql`:
```sql
create table public.item_instances (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  reforge_level int not null default 0 check (reforge_level >= 0 and reforge_level <= 15),
  acquired_at timestamptz not null default now()
);
create index item_instances_owner_idx on public.item_instances(owner_id);
alter table public.item_instances enable row level security;
create policy "item instances select own" on public.item_instances
  for select using (auth.uid() = owner_id);

alter table public.monsters
  add column equipped_instance_id uuid references public.item_instances(id) on delete set null;

-- Backfill: one instance per owned copy of every equipment item, at +0.
insert into public.item_instances (owner_id, item_id)
select inv.owner_id, inv.item_id
from public.inventory inv
join public.items i on i.id = inv.item_id
cross join generate_series(1, inv.quantity)
where i.category = 'equipment';

update public.monsters m
set equipped_instance_id = (
  select ii.id from public.item_instances ii
  where ii.owner_id = m.owner_id and ii.item_id = m.equipped_item_id
  order by ii.acquired_at limit 1
)
where m.equipped_item_id is not null;

delete from public.inventory inv
using public.items i
where i.id = inv.item_id and i.category = 'equipment';
```
- `010_shop_scrap_reforge_v10.sql`:
```sql
alter table public.profiles add column scrap_common     int not null default 0;
alter table public.profiles add column scrap_rare       int not null default 0;
alter table public.profiles add column scrap_epic       int not null default 0;
alter table public.profiles add column scrap_legendary  int not null default 0;
alter table public.profiles add column reforge_rng_seed   bigint not null default 0;
alter table public.profiles add column reforge_rng_cursor int    not null default 0;

alter table public.dungeon_runs add column scrap_awarded jsonb not null default '{}';

create table public.shop_purchases (
  owner_id    uuid not null references auth.users(id) on delete cascade,
  hour_bucket bigint not null,
  slot_index  int not null,
  item_id     uuid references public.items(id),
  scrap_rarity text check (scrap_rarity in ('common','rare','epic','legendary')),
  quantity    int not null default 1,
  price_paid  int not null,
  purchased_at timestamptz not null default now(),
  primary key (owner_id, hour_bucket, slot_index)
);
alter table public.shop_purchases enable row level security;
create policy "shop purchases select own" on public.shop_purchases
  for select using (auth.uid() = owner_id);

create table public.reforge_attempts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  instance_id uuid not null references public.item_instances(id) on delete cascade,
  from_level int not null,
  target_level int not null,
  chance numeric not null,
  roll numeric not null,
  success boolean not null,
  scrap_rarity text not null,
  rng_seed bigint not null,
  rng_cursor int not null,
  created_at timestamptz not null default now()
);
alter table public.reforge_attempts enable row level security;
create policy "reforge attempts select own" on public.reforge_attempts
  for select using (auth.uid() = owner_id);
```
Then regenerate `src/lib/supabase/database.types.ts` (`mcp__supabase__generate_typescript_types`).

Type changes (`src/lib/game/types.ts`, frozen-type change — update every consumer, same handling as WP2's `OwnedMonster.xp`):
```ts
export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type ScrapCounts = Record<ItemRarity, number>;
// Item gains required field: rarity: ItemRarity;
export type ItemInstance = { id: string; itemId: string; reforgeLevel: number; acquiredAt: string };
// OwnedMonster gains: equippedInstanceId: string | null;
// HubView gains: scrap: ScrapCounts; equipment: ItemInstance[];  (inventory becomes consumables-only)
```
Update: `mapItem` in `catalog.ts` + `catalog-client.ts`, `SEED_ITEMS`/`ITEM_IDS` in `seed-data.ts` (add `rarity` to all 20 items — read the new UUIDs back from the live DB after migration), `mapMonsterRow`, the draft `OwnedMonster` literals in `hub.ts`/`catch.ts`, test fixtures in `tests/game/items-stats.test.ts`.

Pure engine additions:
- `src/lib/game/rng.ts` — `hash32(n: number): number` (splitmix32 finalizer), `createRng` untouched.
- `src/lib/game/items.ts` — `reforgeBonusMultiplier(level) = 1 + 0.05*level`; `applyEquipmentModifier(base, item, reforgeLevel = 0)` uses `item.effect.value * reforgeBonusMultiplier(reforgeLevel)`.
- `src/lib/game/stats.ts` — `effectiveStats(species, monster, equippedItem, reforgeLevel = 0)`.
- New `src/lib/game/reforge.ts`: `REFORGE_CAP: Record<ItemRarity, number> = {common:6, rare:9, epic:12, legendary:15}`; `reforgeCap`, `reforgeSuccessChance(target) = clamp((100-5*target)/100, 0.05, 1)`, `canReforge(rarity, currentLevel)`, `rollReforge(rng, targetLevel)`, `effectValueAtLevel(baseValue, level)`.
- New `src/lib/game/shop.ts`: `SHOP_BUCKET_MS=3_600_000`; `hourBucket(nowMs)`, `hourBucketStartMs(bucket)`, `nextResetMs(bucket)`; `SHOP_RARITY_WEIGHTS={common:55,rare:28,epic:13,legendary:4}`; `EQUIPMENT_PRICE`/`CONSUMABLE_PRICE`/`SCRAP_UNIT_PRICE` per the tables above; `SCRAP_BUNDLE_SIZE=3`; `SCRAP_SLOT_INDEX=99`; `rollShop(bucket, catalog)` — deterministic algorithm, **don't reorder the RNG draw sequence**: (1) `rng=createRng(hash32(bucket),0)`; (2) `total = 5 + (rng.next()<0.5?1:0)`; (3) category plan `['equipment','equipment','consumable','consumable']` + coin-flip per remaining slot; (4) per slot roll rarity from weights, candidate pool = catalog matching category+rarity minus already-picked ids, step rarity down-then-up if empty, skip slot if category exhausted; (5) `pick = pool[floor(rng.next()*pool.length)]`, price from the item's actual rolled rarity; (6) scrap slot last, tier `floor(rng.next()*4)`, qty 3.
- New `src/lib/game/scrap.ts`: `SCRAP_TIER_WEIGHTS_BY_DUNGEON_TIER: Record<number, Record<ItemRarity,number>> = {1:{common:85,rare:13,epic:2,legendary:0}, 2:{common:65,rare:27,epic:7,legendary:1}, 3:{common:45,rare:35,epic:17,legendary:3}, 4:{common:25,rare:38,epic:29,legendary:8}}`; `rollScrapDrop(rng, difficultyTier)` — quantity `1 + floor(rng.next()*3)` (uniform 1/2/3), each unit's tier rolled independently from the tier's weight table, unknown tiers clamp to 1..4.

Tests: `tests/game/reforge.test.ts`, `tests/game/shop.test.ts`, `tests/game/scrap.test.ts`, additions to `tests/game/items-stats.test.ts` — success-chance/cap values, `effectValueAtLevel`, `rollShop` determinism (same bucket → same result, different bucket → different), zone minimums, no duplicate ids, price correctness, `hourBucket` boundary values, `rollScrapDrop` totals/tier-4-legendary-rate-over-10k-seeds/tier-1-never-legendary.

Exit criteria: `npx tsc --noEmit`, `npm test` green. No user-visible change except rarity existing in the DB.

### WP10 — Item-instance cutover

New `src/server/repo/item-instance.ts` (`mapItemInstanceRow`, `getInstancesForOwner`, `getInstanceRow`, `insertInstance`, `updateInstanceReforgeLevel`, `getMonsterUsingInstance`). `src/server/repo/profile.ts`: `grantItem` throws if called with an equipment item (equipment must go through `insertInstance`); add scrap/reforge-rng fields to `ProfileRow`; `adjustScrap(userId, rarity, delta)`.

`src/server/game-bridge.ts`: new `getEquippedContext(row)` resolving `equipped_instance_id → item_instances → items`; `buildPlayerCombatant`/`getMaxHpFor`/`computeTeamPower` route through it, passing `reforgeLevel` into `effectiveStats`. **This is the single point where reforge bonuses enter combat.** Invariant: `monsters.equipped_item_id` stays a denormalized mirror of `item_instances[equipped_instance_id].item_id` so existing `getItemById(row.equipped_item_id)` reads keep working; `equipItem` is the only writer of both columns, always together.

`hub.ts`: `equipItem(monsterId, instanceId: string | null)` — instance id now, not item id; verifies ownership of both monster and instance, category is equipment, un-equips the instance from any other monster of the same owner first. `getHubState()` returns `equipment: ItemInstance[]`, `scrap: ScrapCounts`, `inventory` filtered to consumables only.

`run.ts`: chest branch — equipment roll → `insertInstance` instead of `grantItem`; `grantedItem` gains `rarity`/`instanceId`, `RestView.tsx` shows rarity color.

UI: `catalog-client.ts` maps `rarity`, adds `getEquipmentInstances()`. `EquipSelect.tsx` options are instances (`"Minor Charm +4"`), rarity-colored. `MonsterDetailModal.tsx`/`RosterCard.tsx`/`TeamSlotCard.tsx` pass `reforgeLevel` into `effectiveStats`. `hub/inventory/page.tsx` equipment panel becomes per-instance rows (new `EquipmentInstanceRow.tsx`). New `src/components/hub/itemRarity.ts` (separate from `rarity.ts`, which is monster-roll rarity):
```ts
export const ITEM_RARITY_TEXT   = { common: 'text-slate-300',   rare: 'text-sky-300',    epic: 'text-fuchsia-300',   legendary: 'text-amber-300' };
export const ITEM_RARITY_BORDER = { common: 'border-slate-600', rare: 'border-sky-500',  epic: 'border-fuchsia-500', legendary: 'border-amber-500' };
export const ITEM_RARITY_BG     = { common: 'bg-slate-800/60',  rare: 'bg-sky-950/40',   epic: 'bg-fuchsia-950/40',  legendary: 'bg-amber-950/40' };
export const ITEM_RARITY_LABEL  = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' };
export const SCRAP_EMOJI        = { common: '🔩', rare: '⚙️', epic: '💠', legendary: '🌟' };
```

Tests: `npm test` + **`tests/loop.ts` must run and pass** (first server-side change since WP3) — extend with backfill-produced-one-instance-per-copy, `equipItem` by instance id, a manually-set `reforge_level=4` item producing the expected higher stat in `buildPlayerCombatant`, a chest roll on equipment creating an instance not touching `inventory`.

Live verify: hub → roster → equip via instance dropdown → stats change → inventory shows one row marked equipped; rest-room chest landing on equipment creates an instance.

### WP11 — Shop server actions + page

New `src/server/actions/shop.ts`: `getShopState()` → `ShopView{hourBucket, nextResetMs, currency, scrap, listings[]}`; `buyShopSlot(slotIndex)` — **server recomputes the hour bucket from `Date.now()`, client never supplies it** (anti-cheat). Steps: requireUser+ensureProfile → recompute bucket+roll → find slot (404 if gone) → check gold → **insert `shop_purchases` first** (PK collision = already bought this hour, this row is the concurrency lock) → `adjustCurrency(-price)` → grant (scrap→`adjustScrap`, equipment→`insertInstance`, consumable→`grantItem`).

UI: `src/app/(game)/hub/shop/page.tsx` + `ShopListingCard.tsx` + `ShopResetCountdown.tsx` (static `--:--` until mount to avoid hydration mismatch — the codebase already has one unexplained React #418 sighting, don't add another). Two zones (Equipment = indigo accent, Consumables = emerald accent) + a Scrap strip (amber accent). Card: emoji placeholder, rarity-colored border/label, price, Buy button (disabled states for owned/unaffordable). Temporary `Shop →` link on the hub page, removed in WP14. Emoji placeholders only — do not wire `public/monsters/*.png` here, that's monster art not item art.

Tests: `npm test` + `tests/loop.ts` extension (`buyShopSlotDirect`: gold decrements exactly, correct grant lands, second buy of same slot rejected, one `shop_purchases` row). Live verify: buy one of each kind, confirm decrement/grant/owned-state, hard-refresh confirms determinism.

### WP12 — Reforge server action + page

New `src/server/actions/reforge.ts`: `getReforgeState()` → `ReforgeView`; `attemptReforge(instanceId)` — requireUser+instance-ownership check → item must be equipment → `canReforge` else error → scrap balance check → lazily seed `reforge_rng_seed` on first use (`Math.floor(Math.random()*2**31)`, same pattern as `startRun`) → roll, **persist cursor immediately** (mirrors `attemptCatch`) → `adjustScrap(-1)` unconditionally → on success `updateInstanceReforgeLevel` → insert `reforge_attempts` audit row.

UI: `src/app/(game)/hub/reforge/page.tsx` + `ReforgeCard.tsx` + `ScrapBalancePanel.tsx` (4 rarity-colored tiles). Per-instance card: `+N/cap` segmented bar, current vs next bonus, success chance colored by band (≥80% emerald / 50–79% amber / <50% rose), scrap cost+balance, disabled at cap or insufficient scrap. Result banner: success emerald, failure slate/amber (not alarming red — nothing was lost but the scrap). Temporary `Reforge →` link, removed in WP14.

Tests: `npm test` + `tests/loop.ts` extension (`attemptReforgeDirect` with a seeded RNG for deterministic forced-success/forced-failure cases, at-cap rejection, reforged-equipped-item combat-stat increase, audit rows written both outcomes). Live verify: reforge a Minor Charm upward, screenshot the chance ladder dropping, force a failure and confirm level held + only scrap spent, confirm equipped stat contribution increased in the detail modal.

### WP13 — Scrap drops from dungeon clears

`catch.ts` `finishRun`: **full clears only** (`finalStatus === 'completed'`) — deliberate divergence from XP, spec says "clear" not partial. Roll via `createRng(run.rng_seed, run.rng_cursor)` → `rollScrapDrop(rng, dungeon.difficultyTier)` → persist cursor → persist result into `dungeon_runs.scrap_awarded` **in the same `updateRun` call that sets `completed_at`** (piggybacks on the existing idempotency guard, same as `xp_awarded`) → `adjustScrap` per non-zero tier. Return gains `scrapAwarded`.

UI: `SummaryView.tsx` scrap line beside the XP line (hidden if all zero); `DefeatView.tsx` notes scrap only drops on a full clear. New `src/components/hub/ScrapBadge.tsx` next to the existing `CurrencyBadge` in `layout.tsx` (same `ensureProfile` call, no extra query), collapsed chips for non-zero tiers only.

Tests: `npm test` + `tests/loop.ts` extension (full clear awards 1–3 total scrap and persists it, idempotent on double-finish, failed run awards zero). Live verify: full Verdant Hollow clear → summary scrap line → header badge increments → reforge page shows new balance.

### WP14 — Hub 4-button navigation redesign + color pass

`hub/page.tsx` becomes a landing/nav page: header (title + global `CurrencyBadge`+`ScrapBadge`), run-in-progress panel (unchanged), 3-slot team panel (unchanged), then a `grid-cols-2 sm:grid-cols-4` row of 4 nav buttons via new `HubNavButton.tsx`:

| Button | Route | Emoji | Accent |
|---|---|---|---|
| Dungeon | `/hub/dungeon` | ⚔️ | `border-rose-500 bg-rose-950/40 text-rose-200` |
| Inventory | `/hub/inventory` | 🎒 | `border-slate-500 bg-slate-800/60 text-slate-200` |
| Shop | `/hub/shop` | 🏪 | `border-amber-500 bg-amber-950/40 text-amber-200` |
| Reforge | `/hub/reforge` | 🔨 | `border-violet-500 bg-violet-950/40 text-violet-200` |

Each carries a one-line subtitle (Dungeon: "Enter a run"; Shop: live countdown; Reforge: scrap count). Dungeon button keeps the existing disabled/reason logic verbatim. New `src/app/(game)/hub/dungeon/page.tsx` — dungeon grid moved out of the hub page unchanged, `← Back to Hub` link matching the inventory page's pattern. Remove the WP11/WP12 temporary text links. Every `(game)/hub/**` page gets the same header shape; rarity colors come exclusively from `itemRarity.ts`.

Tests: `npm test`+`tsc` (client/route-only). Live verify: 4 buttons route correctly, disabled states match old behavior, mobile 390px wraps 2×2 and shop zones stack.

### WP15 — Docs + full live verification pass

Rewrite this section into a "Shipped" section matching the WP1–WP8 style, promote locked decisions into "Game design decisions", add migrations 008–010 to the Data model section. One end-to-end production playthrough: hub nav → dungeon clear → scrap awarded → shop purchase (equipment + scrap) → equip the purchased instance → reforge it up several levels including a failure → verify the bonus in the detail modal **and in actual combat** (compare a combatant's stat pre/post reforge in a real run). Re-run `npx tsc --noEmit`, `npm test`, `tests/loop.ts`, record the new assertion count.

### Invented numbers/rules and their locked defaults

| # | Ambiguity | Locked default |
|---|---|---|
| 1 | Gold prices | Equipment 60/150/360/800; consumable 25/60/140/300 (c/r/e/l) |
| 2 | Scrap price | Per unit 20/50/120/260, bundle of 3 → ×3 |
| 3 | Shop rarity weights | common 55, rare 28, epic 13, legendary 4 |
| 4 | Zone split of 5–6 items | ≥2 equipment, ≥2 consumable guaranteed, rest coin-flipped |
| 5 | Is the scrap listing part of the 5–6? | No — 5–6 items *plus* 1 scrap listing (6–7 rows) |
| 6 | "Equal chance per scrap rarity" | Uniform 1/4, no progression gating, legendary possible hour 1 |
| 7 | Can shop items repeat between resets? | Yes across hours; no duplicate id within one hour |
| 8 | Does unpurchased stock vanish on reset? | Yes — pure function of the bucket, nothing persists |
| 9 | Shop global or per-player? | Global stock; only the purchased flag is per-player |
| 10 | Purchases per listing | Once per hour per player per slot |
| 11 | Can you buy a duplicate of owned equipment? | Yes — instances are per-copy by design |
| 12 | Scrap tier odds per dungeon tier | See `SCRAP_TIER_WEIGHTS_BY_DUNGEON_TIER` in WP9; tier 1 never drops legendary |
| 13 | Scrap qty per clear | `1 + floor(rng()*3)` → uniform 1/2/3, each unit's tier independent |
| 14 | Do failed/abandoned runs drop scrap? | No — full clears only |
| 15 | Reforge failure semantics | Scrap consumed, level unchanged, no downgrade |
| 16 | Does reforging cost gold? | No — scrap only |
| 17 | Can higher-tier scrap substitute for lower? | No — exact rarity match |
| 18 | Can you reforge an equipped item? | Yes, in place, no re-equip needed |
| 19 | Are consumables reforgeable? | No |
| 20 | Rarity of the 4 existing equipment items | Each becomes its stat-line's Common tier; 12 new Rare/Epic/Legendary variants added (16 equipment items total, per-user-instruction) |
| 21 | Do the new items enter the chest drop table? | Yes, at tiered weights (see table above); total weight 100 → 150 |
| 22 | Where is scrap stored? | 4 int columns on `profiles`, not a table |
| 23 | Inventory/instance caps | None |
| 24 | Sell/salvage items for scrap? | Out of scope for v1 |
| 25 | Shop rarity fallback when a pool is empty | Step down then up; skip the slot if the whole category is exhausted |
| 26 | Reforge RNG seed init | Lazily set on first attempt, same pattern as `startRun` |

**Balance note (non-blocking):** a legendary item at 800 gold is several Voidmaw Depths clears deep, and Voidmaw Depths has never been verified winnable (see "Known non-blocking issues"). If the shop feels unreachable in playtesting, the lever is the price constants in `src/lib/game/shop.ts` or `dungeons.gold_reward` — not the reforge formulas, which are locked.

## Shipped: Elemental type system

User-requested feature ("should we add element?"), scoped via `AskUserQuestion` (moderate ×1.25/×0.80 multiplier, the user's own proposed species mapping, implement in the live web game — not just document it), implemented directly by Sonnet in one pass (small enough not to need the Opus-plan/Sonnet-WP process used for the two projects above).

**Design** (v1, locked — see the "Game design decisions" bullet above for the compact version):
- 5-element core cycle Fire→Nature→Earth→Electric→Water→(back to Fire), each beats the next in the cycle and is weak to the previous.
- Normal: neutral against everything, both directions (no advantage, no disadvantage, ever).
- Light/Dark: bonus damage against each other only (mutual rivalry), neutral vs every other element in both directions.
- Multiplier: advantage `×1.25`, disadvantage `×0.80`, neutral `×1.00` — folded into the existing damage formula (`raw * variance * atkBuffMult * defensiveMult * typeMult`) and into `estimateDamageRange`'s pre-fight estimate, so the ability-button damage numbers already reflect type matchups.
- Full spec (cycle chart, rationale) also written to `GAME_DESIGN.md` §4, since the user's stated purpose for that doc is a possible future Roblox port — keeping the element rules there too so a non-web reimplementation has the full picture without reading this file.

**Implementation, full stack:**
- `src/lib/game/types.ts`: new `Element` union type (8 values); `MonsterSpecies` and `Combatant` both gain a required `element: Element` field (frozen-type change — every literal/constructor updated, same handling as prior frozen-type changes in this file).
- `src/lib/game/elements.ts` (new, pure, fully tested): `hasAdvantage`, `hasDisadvantage`, `typeMultiplier`, and the three multiplier constants. The core-cycle check is a single array-index lookup (`CYCLE[(idx+1) % 5]`); Light/Dark is a special-cased pair; everything else falls through to neutral.
- `src/lib/game/combat.ts`: `applyAbility()`'s damage case and `estimateDamageRange()` both compute `typeMultiplier(actor.element, target.element)` and fold it into the result; `buildEnemy()` now sets `element: species.element` on the constructed `Combatant`.
- `src/server/game-bridge.ts`: `buildPlayerCombatant()` sets `element: species.element` the same way.
- `src/lib/game/seed-data.ts` + DB: every `SEED_SPECIES` entry got an `element` field; migration `011_species_element_v11.sql` added `monster_species.element` (`text not null default 'normal'`, checked against the 8 values) and backfilled all 8 live species rows to match. `database.types.ts` patched to match (Row: `element: string`, Insert/Update: `element?: string`). `src/server/repo/catalog.ts` / `catalog-client.ts` both updated (`SpeciesRow.element`, `mapSpecies()` mapping; `catalog-client.ts`'s `speciesFallback()` defaults to `'normal'`).
- UI: new `src/components/shared/elements.ts` (emoji/label/text-color/border-color/bg-color token maps per element, same pattern as `itemRarity.ts` but for the separate element concept) and `src/components/shared/ElementBadge.tsx` (a small rounded pill, `compact` prop hides the text label and shows only the emoji — used everywhere it's wired in since space is tight on cards). Wired into `RosterCard.tsx` (roster grid), `MonsterDetailModal.tsx` (detail modal title), `CombatView.tsx` (every combat row, both sides), and `DungeonCard.tsx` (boss element, dungeon-select grid).
- Tests: `tests/game/elements.test.ts` (new, 10 tests) — the 5-cycle chart both directions, non-adjacent-cycle neutrality, Normal's total neutrality in both directions, Light/Dark's mutual rivalry and neutrality vs everyone else, exact documented multiplier values, and an exhaustive all-pairs check that every combination resolves to exactly one of the three defined multipliers. `tests/game/combat.test.ts` / `tests/game/items-stats.test.ts` fixture literals updated with the new required `element` field (`'normal'` for generic fixtures, `'nature'` for the Sprigling-modeling fixture).

**Verification:** `npx tsc --noEmit` clean, `npm test` 69/69 (up from 59), `tests/loop.ts` 73/73 against the live Supabase project (untouched by this change — no server action or write path was touched, so the count didn't move). Live-verified on the demo account (local dev server, not yet deployed): roster grid shows correct element badges per species (Pebblet 🪨 earth, Thornmaw 🌑 dark, Cinderpup 🔥 fire, Sprigling 🍃 nature), the monster detail modal shows the same badge next to the rarity label, the dungeon-select grid shows each boss's element (Emberfang 🔥, Glacierhorn 🪨, Voidmaw/Thornmaw 🌑), and a real Verdant Hollow combat room rendered badges on every combatant row and resolved a live attack (Thornmaw's Strike vs. an enemy Sprigling — dark vs. nature, a neutral matchup outside the 5-cycle and outside the Light/Dark rivalry) with no console errors. The in-progress verification run was cleaned up via direct SQL (`update dungeon_runs set status='abandoned'`) rather than the in-app Abandon Run button, which triggers a blocking `window.confirm()` known to freeze the browser-automation session (see prior incident, documented as a standing thing to avoid).

**Pushed to `master`** (commit `625d026`) and live on production, per explicit user go-ahead.

## Known non-blocking issues

- Next.js 16 deprecates `middleware.ts` in favor of `proxy.ts` (build shows a deprecation warning); `middleware.ts` still works fully.
- ESLint reports a few pre-existing warnings (unused stub params, etc.) — not errors, not blocking.
- Emberfall Cave / Frostspire Ruins / Voidmaw Depths (tiers 2–4) have not been playtested for winnability — only Verdant Hollow was verified and balanced this session.
- A minified React error #418 (hydration mismatch, text content) was observed once on the run→hub navigation during a WP3 verification pass. Not reproduced or traced further; hasn't blocked or corrupted any observed functionality across multiple subsequent live playthroughs. Worth a dev-mode repro if it recurs or gets noisy.
- ~~Header badges could show stale values after a client-side `router.push`~~ — **fixed**: `SummaryView.tsx`/`DefeatView.tsx`'s "Return to Hub" button now calls `router.refresh()` alongside `router.push('/hub')`, since the shared `(game)` layout isn't otherwise re-fetched on sibling navigation under Next.js App Router's default caching. Verified live on both paths: a full clear that earned 20 gold + 2 scrap showed the header updating 55→75 gold and scrap 1→2/1 immediately on "Return to Hub" (`SummaryView`), and a real Voidmaw Depths wipe (team fainted in room 1, 0 XP/gold/scrap awarded as designed) navigated back to a clean hub with no console errors and the header correctly unchanged (`DefeatView`). If any other page mutates currency/scrap and navigates away without going through `router.refresh()`, apply the same fix there.
- ~~The elements work is uncommitted/unpushed~~ — **pushed**: committed as `625d026` and pushed to `master`, live on production via Vercel auto-deploy.

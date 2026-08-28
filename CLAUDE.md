# Monster Roguelite

Solo-dev portfolio web game: single-player monster-catching roguelite. Next.js 15/16 App Router + TypeScript + Tailwind v4 frontend, Supabase (Postgres + Auth) backend, deployed to Vercel.

**Live:** https://monster-roguelite.vercel.app
**Repo:** https://github.com/2055tee/monster-roguelite (git-linked to Vercel; pushes to `master` auto-deploy)
**Demo login:** `demo@monsterroguelite.dev` / `DemoPass123!` (rotate this password before sharing the link publicly)

See `CONTEXT.md` for the original design brief.

## Architecture

- All game-state writes are server-authoritative: Next.js server actions (`src/server/actions/*.ts`) use a service-role Supabase client (`src/lib/supabase/admin.ts`). Clients can only `SELECT` their own rows via RLS, never write directly. **This is the core anti-cheat property — don't weaken it.** Every action calls `requireUser()` (`src/server/auth.ts`) and manually verifies row ownership; RLS does not protect writes since the service-role key bypasses it entirely, so the action code itself is the authorization boundary.
- Game-engine logic (`src/lib/game/*.ts`, excluding `types.ts`/`constants.ts`/`seed-data.ts`) is pure and I/O-free, unit-tested with vitest (20 tests). Safe to extend — run `npm test` after changes.
- `src/server/game-bridge.ts` glues the pure engine to DB rows for the action layer (building `Combatant`s from monster rows, computing team power, assembling `RunView`).
- RNG is deterministic and persisted: each `dungeon_runs` row has `rng_seed` + `rng_cursor`; every roll (enemy picks, chest drops, catch rolls, stat rolls on catch) advances and persists the cursor, so a run's outcome is reproducible and auditable.
- Vercel function region is pinned to `sin1` (Singapore, via `vercel.json`) to match Supabase's `ap-southeast-1` region — this was previously defaulting to `iad1` (US East) and added a full trans-Pacific round trip to every server action's DB calls. The action layer still makes several sequential (non-`Promise.all`'d) DB calls per action (e.g. `submitCombatAction`); parallelizing those would further reduce latency but hasn't been done.

## Testing

- `npm test` — unit tests for the pure game engine (fast, no I/O).
- `npx tsc --noEmit` — typecheck.
- `npx tsx --env-file=.env.local tests/loop.ts` — integration test against the **live** Supabase project. Drives bootstrap → start run → combat → rest → boss → catch → finish, plus double-start rejection and run-abandon (45 assertions). This bypasses `requireUser()`'s `next/headers` dependency by calling the same repo/game-bridge layer the actions delegate to, with a resolved user id passed in directly — see the file's header comment for why.
- Run both before every deploy. Both were green as of the last commit.

## Game design decisions (v1, load-bearing — not placeholders)

- **Stats**: hp/atk/def/spd. `effectiveStat = floor(base * rollMultiplier * (1 + 0.10*(level-1)))`, roll multipliers uniform `[0.90,1.10]` per stat, rolled once at catch/starter-grant and immutable after. `power(stats) = hp/5 + atk*2 + def*1.5 + spd`.
- **Rarity label** (cosmetic, derived from mean of the 4 rolls): `<0.95` Common, `0.95–1.05` Uncommon, `1.05–1.08` Rare, `>1.08` Prime.
- **Abilities**: every monster = Basic Attack + species signature + 1 rolled from a 3-ability pool. 7 abilities total: `basic_attack, heavy_blow, swift_strike, venom_fang, bulwark, war_cry, mend` — see `src/lib/game/abilities.ts` for power/cooldown/effect values and player-facing descriptions, shown in `CombatView.tsx`'s dedicated description box (not a hover tooltip — those were hard to see) below the ability buttons, which stay visible with the pending one ring-highlighted even mid target-selection. Damage-kind abilities also show an estimated damage range on their button (`estimateDamageRange` in `combat.ts`), computed against the weakest-HP alive enemy.
- **Damage formula**: `raw = atk * abilityPower * (100/(100+def))`, `variance = 0.95+rng()*0.10`, modified by War Cry (+25% atk) / Bulwark (-50% incoming) — see `src/lib/game/combat.ts`.
- **Turn order**: per-round, spd descending, seeded-rng tiebreak, Swift Strike grants next-round priority.
- **Catch chance**: `chance = clamp(baseCatchRate * performance - 0.10*faintCount + consumableBonus, 0.10, 0.90)`, `performance = clamp(expectedTurns/actualTurns, 0.5, 1.5)`, `expectedTurnsPerRoom = clamp(round(6/(teamPower/bossPower)), 3, 15)`, `totalExpected = expectedTurnsPerRoom * 4` (computed once at run start).
- **Difficulty**: 4 fixed dungeons (Verdant Hollow/Emberfall Cave/Frostspire Ruins/Voidmaw Depths), tiers 1–4, fixed 6-room layout `[combat,combat,rest,combat,rest,boss]` for all. Each dungeon has an `enemyLevel` (room mobs) and `enemiesPerRoom` (mobs per combat room); the boss is always `enemyLevel + 3`. Verdant Hollow (Tier 1) is tuned to `enemyLevel: 0`, `enemiesPerRoom: 1` specifically so it's reliably winnable by a fresh level-2 starter team — see "Verdant Hollow balance" below for why and how this was arrived at. The other three dungeons keep the original `enemiesPerRoom: 2` and their original (untouched) enemy levels, and haven't been separately verified for winnability — they're intended to be harder progression content, not guaranteed-clearable.
- **Items**: 4 equipment (flat stat-% boosts, max 1 equipped per monster, not consumed), 3 consumables (2 catch-chance lures, 1 instant-heal "Field Elixir"). Exact table in `src/lib/game/seed-data.ts` / the `items` DB table. **Field Elixir only works in the hub** (`useFieldElixir` in `src/server/actions/hub.ts`) — it skips the out-of-combat healing timer, but has no mid-run use. There is no consumable or mechanic that heals a team between combat rooms other than the Mend/Bulwark abilities and rest-room "Heal Team" choices.
- **Chests**: 1 guaranteed item per chest, weighted drop table (`items.drop_weight` column).
- **Healing**: real-time cooldown = `level * 5` seconds, skippable by spending currency (`cost = max(5, ceil(remainingSeconds/10))`). Starters are level 2 (~10s heal) so a demo playthrough is never blocked. `resolveHealingForRow(s)` (`src/server/game-bridge.ts`) heals a monster on read if its timer has elapsed (or, defensively, if it's below max HP with no timer at all) — see "Bugs fixed" below for why this exists.
- **No permadeath.** Fainted monsters just go into a longer healing state. A fainted ally cannot be targeted by Mend mid-combat (by design — `CombatView.tsx`'s `renderRow` only wires click targets for non-dead combatants); recovery only happens via the healing-timer mechanic.

## Data model

See `supabase/migrations/002_game_systems_v2.sql` through `006_dungeon_enemies_per_room_v6.sql` for the authoritative schema (source-controlled copies of what's live on the Supabase project, id `nxzzgzozzdejhimbfcmm`, region `ap-southeast-1`). Frozen TypeScript types mirroring this: `src/lib/game/types.ts` (don't modify without updating every consumer). `src/lib/supabase/database.types.ts` is generated from the live schema — regenerate after any migration.

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

## In-progress: Roster/Battle UI overhaul + XP system

Planned by an Opus pass, confirmed with the user, being implemented by Sonnet one work-package at a time (see below for what's done vs. pending). Full plan lives in this section — update the status line after each WP.

**User-confirmed decisions:**
- Roster "5 stats" = the 4 base stats (HP/ATK/DEF/SPD) as colored segments inside one bar, with total bar length = POWER.
- XP design below ships as proposed, including fainted monsters getting full XP and the healing-cooldown cap.
- Drag-and-drop team slots: **both** DnD and the existing Slot 0/1/2 buttons stay (buttons move into a monster-detail modal as the touch/keyboard fallback — HTML5 DnD doesn't work on touchscreens at all).
- Dragging onto an occupied slot **swaps** the two monsters (not evict-to-bench like today's button behavior).

**XP design (v1, to be implemented in WP2/WP3 — treat as locked once WP3 ships, same as the other formulas in this file):**
- New pure module `src/lib/game/xp.ts`: `MAX_LEVEL = 20`, `xpToNext(level) = 50 + 25 * (level-1)^2` (L2→3=75, L3→4=150, L4→5=275...).
- Earned per **cleared** room (read from `combat_encounters` rows with `status='won'` for the run), awarded in full to every monster in `team_snapshot`: `roomXp(roomLevel, isBoss) = round(10 * (1 + 0.15*roomLevel) * (isBoss ? 3 : 1))`, rest rooms award 0, and a full clear (`run.status === 'completed'`) multiplies the summed total by 1.5. Fainted monsters still get full XP (no permadeath philosophy). Abandoned runs award 0 (no `finishRun` call).
- Applied server-side in `finishRun` (`src/server/actions/catch.ts`) before the existing healing-timer loop: loop level-ups while `xp >= xpToNext(level)`, add the max-HP delta to `current_hp` so leveling doesn't look like fresh damage, then let the healing loop run with the new level.
- Healing cooldown formula changes from `level * 5` to `min(level, 12) * 5` seconds (caps at 60s) so leveling doesn't make healing punishingly slow.
- New DB columns (migration 007): `monsters.xp int not null default 0`, `dungeon_runs.xp_awarded int not null default 0`.

**Work packages** (each: `npx tsc --noEmit` → `npm test` → `tests/loop.ts` where noted → commit+push → live Playwright verify → update this file):
1. ✅ **Turn-order sidebar** (`TurnOrderPanel.tsx`, isolated, no DB) — shows the rest of the current round exactly (`encounter.order` from `orderIndex`), plus a dimmed "next round (est.)" list predicted without the engine's RNG tiebreak (sorted by spd, first-strikers first, ties broken by id — labeled as an estimate since it can't be exact without consuming the real seed). Player = green (`border-emerald-500`), enemy = red (`border-red-500`), current actor ring-highlighted. `CombatView.tsx` restructured to a `lg:grid-cols-[13rem_1fr]` layout, sidebar sticky on desktop, horizontal-scroll strip on mobile.
2. ✅ **XP data layer + pure engine** — migration 007 (`monsters.xp`, `dungeon_runs.xp_awarded`), `src/lib/game/xp.ts` (`xpToNext`, `roomXp`, `applyXp`, `xpProgress`), 14 new tests in `tests/game/xp.test.ts`. `OwnedMonster` gained `xp: number` (frozen-type change — updated every consumer: `mapMonsterRow`, the starter/catch draft literals in `hub.ts`/`catch.ts`, and two test fixtures). `updateMonster`'s patch type widened with `level`/`xp`. Nothing awards or reads XP yet — that's WP3.
3. ⬜ Award XP on run finish (`finishRun` changes, `getEncountersForRun`, surface `xpAwarded`/level-ups in `SummaryView`), document the XP design as locked once this ships, `tests/loop.ts` assertions.
4. ⬜ Roster stat model + new `RosterCard` layout (real `effectiveStats`/`power`, `XpBar.tsx`, `StatSegmentBar.tsx`; also fixes `TeamSlotCard.approxMaxHp`'s remaining item-modifier gap now that species+item are threaded through).
5. ⬜ Monster detail modal (click a roster card → full stat breakdown, abilities, equipped item, slot controls moved in here).
6. ⬜ Equip preview with affected-stat highlight (hover/pending item in `EquipSelect` recomputes `effectiveStats` locally and highlights the one changed stat segment).
7. ⬜ Drag-and-drop team slots (native HTML5 DnD, no new dependency; `setTeamSlot` changes from evict to swap; buttons stay as the modal-based fallback).
8. ⬜ Docs + full live verification pass.

## Known non-blocking issues

- Next.js 16 deprecates `middleware.ts` in favor of `proxy.ts` (build shows a deprecation warning); `middleware.ts` still works fully.
- ESLint reports a few pre-existing warnings (unused stub params, etc.) — not errors, not blocking.
- Emberfall Cave / Frostspire Ruins / Voidmaw Depths (tiers 2–4) have not been playtested for winnability — only Verdant Hollow was verified and balanced this session.

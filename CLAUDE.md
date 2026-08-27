# Monster Roguelite — Session State

This file tracks build progress across sessions. See `CONTEXT.md` for the original design brief. **This is a mid-build snapshot, not final documentation** — the previous session ended early (user hit a session limit) with one work package interrupted mid-flight. Read this before doing anything else.

## What this project is
Solo-dev portfolio web game: single-player monster-catching roguelite. Next.js 15/16 App Router + TypeScript + Tailwind v4 frontend, Supabase (Postgres + Auth) backend, deployed to Vercel. All game-state writes are server-authoritative (Next.js server actions using a service-role Supabase client) — clients can only SELECT their own rows via RLS, never write directly. This is the core anti-cheat property; don't weaken it.

## How this was built
An Opus planning pass produced a full implementation plan (concrete v1 designs for every system CONTEXT.md left undecided: combat formulas, catch-chance formula, difficulty tiers, item set, drop table, stat-roll variance — see "Game design decisions" below, these are load-bearing, not placeholders to redo). That plan was split into 7 work packages (WP0–WP6), built by parallel Sonnet coding subagents with non-overlapping file ownership.

## Supabase project
Project ID `nxzzgzozzdejhimbfcmm`, name "monster-roguelite", region ap-southeast-1, org "Tee" (free tier, $0/mo). URL and publishable key are in `.env.local` / `.env.example`. The service-role secret key is in `.env.local` only (gitignored, never commit it).

## Work package status

| WP | Scope | Status |
|---|---|---|
| WP0 | Foundation: Next.js scaffold, git repo (isolated in this folder — do NOT touch `C:\Users\Win10\.git`, it's a contaminated home-dir repo tracking unrelated stuff), auth pages, Supabase client factories, frozen `src/lib/game/types.ts`/`constants.ts`, UI primitives, stub server actions | ✅ Done (commit `be914cd`) |
| WP1 | DB migrations 002–005 (game columns, run-progression + combat_encounters/run_room_results tables, RLS lockdown to select-only, seed data: 8 species/7 items/4 dungeons) applied live to Supabase; `database.types.ts` generated; `src/lib/game/seed-data.ts` | ✅ Done (commit `fbedb91`) |
| WP2 | Pure game engine: `src/lib/game/{rng,abilities,stats,combat,dungeon,catch,items}.ts` — RNG, damage/turn resolution, catch-chance, expected-turns formulas. 20/20 vitest tests passing, verified zero I/O | ✅ Done (commit `ed03ac0`) |
| WP4 | Hub/roster/inventory UI (`src/app/(game)/hub/**`, `src/components/hub/**`) | ✅ Done (commit `1c19089` — wait, check `git log`, WP4 was `2528f7b`) |
| WP5 | Dungeon run UI (`src/app/(game)/run/**`, `src/components/run/**`) | ✅ Done (commit `1c19089`) |
| **WP3** | **Server actions wiring engine+DB together** (`src/server/actions/{hub,run,combat,catch}.ts` real bodies, `src/server/repo/*.ts`) | ⚠️ **INTERRUPTED MID-FLIGHT, NOT COMMITTED** — see below |
| WP6 | Deploy to Vercel (git-linked project, env vars, Supabase auth redirect URL) + full playwright click-through verification | ❌ Not started |
| — | Write final CLAUDE.md docs | ❌ Not started (this file is a stopgap, not that deliverable) |

## ⚠️ START HERE: WP3 is unfinished, uncommitted work exists in the working tree
The WP3 agent was stopped mid-task (not failed — just interrupted). Its last message before being killed: *"Let me add a test-only full-heal after each won combat room in `testRunToBoss`, to reliably reach and win the boss room for full-loop coverage."* — i.e. it was in the middle of writing its own integration test, core implementation was likely already drafted.

**Uncommitted changes sitting in the working tree right now:**
- Modified: `src/server/actions/{catch,combat,hub,run}.ts` (stub bodies likely replaced with real implementations), `package.json`, `package-lock.json` (probably added `tsx` as a dev dependency for the test script)
- New/untracked: `src/server/game-bridge.ts`, `src/server/repo/{catalog,encounter,monster,profile,run}.ts`, `tests/loop.ts`

**Do not assume this code is correct or complete.** Next session should:
1. `git status` / `git diff` to see exactly what's there.
2. Read through `src/server/actions/*.ts` and `src/server/repo/*.ts` against the spec below (or re-derive intent from the code + the DB schema/engine it calls) to judge whether it's substantively done or half-written.
3. Run `npx tsc --noEmit` — fix errors.
4. Try running `tests/loop.ts` (likely via `npx tsx tests/loop.ts`) — it's an integration script meant to drive the full loop (bootstrap → start run → clear rooms → rest choice → boss → catch → finish) directly against the DB, bypassing Next's request-context constraints on server actions.
5. Once it passes and typechecks, `git add` + commit (only WP3's files: `src/server/actions/**`, `src/server/repo/**`, `tests/loop.ts`, and `package.json`/`package-lock.json` if `tsx` was added).
6. Mark WP3 done, then proceed to WP6 (Vercel deploy + browser click-through verification of the actual game loop — this is the real proof it works, don't skip it).

## Game design decisions (from the Opus plan — these are final v1 designs, not TODOs)
Full detail is in the Opus plan output from earlier in the previous session's transcript (not saved to a file — if needed, the specs below are the load-bearing summary; the WP1/WP2 implementations are the authoritative source now).

- **Stats**: hp/atk/def/spd. `effectiveStat = floor(base * rollMultiplier * (1 + 0.10*(level-1)))`, roll multipliers uniform `[0.90,1.10]` per stat, rolled once at catch/starter-grant and immutable after. `power(stats) = hp/5 + atk*2 + def*1.5 + spd`.
- **Rarity label** (cosmetic, derived from mean of the 4 rolls): `<0.95` Common, `0.95–1.05` Uncommon, `1.05–1.08` Rare, `>1.08` Prime.
- **Abilities**: every monster = Basic Attack + species signature + 1 rolled from a 3-ability pool. 7 abilities total: `basic_attack, heavy_blow, swift_strike, venom_fang, bulwark, war_cry, mend` — see `src/lib/game/abilities.ts` for exact power/cooldown/effect values.
- **Damage formula**: `raw = atk * abilityPower * (100/(100+def))`, `variance = 0.95+rng()*0.10`, modified by War Cry (+25% atk) / Bulwark (-50% incoming) — see `src/lib/game/combat.ts`.
- **Turn order**: per-round, spd descending, seeded-rng tiebreak, Swift Strike grants next-round priority.
- **Catch chance**: `chance = clamp(baseCatchRate * performance - 0.10*faintCount + consumableBonus, 0.10, 0.90)`, `performance = clamp(expectedTurns/actualTurns, 0.5, 1.5)`, `expectedTurnsPerRoom = clamp(round(6/(teamPower/bossPower)), 3, 15)`, `totalExpected = expectedTurnsPerRoom * 4` (computed once at run start).
- **Difficulty**: 4 fixed dungeons (Verdant Hollow/Emberfall Cave/Frostspire Ruins/Voidmaw Depths), tiers 1–4, fixed 6-room layout `[combat,combat,rest,combat,rest,boss]` for all.
- **Items**: 4 equipment (flat stat-% boosts, max 1 equipped per monster, not consumed), 3 consumables (2 catch-chance lures, 1 instant-heal "Field Elixir"). Exact table in `src/lib/game/seed-data.ts` / the `items` DB table.
- **Chests**: 1 guaranteed item per chest, weighted drop table (`items.drop_weight` column).
- **Healing**: real-time cooldown = `level * 5` seconds, skippable by spending currency (`cost = max(5, ceil(remainingSeconds/10))`). Starters are level 2 (~10s heal) so a demo playthrough is never blocked.
- **No permadeath.** Fainted monsters just go into a longer healing state.

## Data model
See `supabase/migrations/002_game_systems_v2.sql` through `005_seed_content_v5.sql` for the authoritative schema (source-controlled copies of what's live on the Supabase project). Frozen TypeScript types mirroring this: `src/lib/game/types.ts` (do not modify without updating every consumer — WP4/WP5/WP3 all code against it verbatim).

## Architecture notes for future work
- All game-engine logic (`src/lib/game/*.ts`, excluding `types.ts`/`constants.ts`/`seed-data.ts`) is pure/I/O-free and unit-tested — safe to extend, run `npm test` after changes.
- Server actions (`src/server/actions/*.ts`) are the only place allowed to use the service-role Supabase client (`src/lib/supabase/admin.ts`). Every action must call `requireUser()` (`src/server/auth.ts`) and manually verify row ownership — RLS does NOT protect writes here since the service-role key bypasses it entirely; the action code IS the authorization boundary.
- RNG is deterministic and persisted: each `dungeon_runs` row has `rng_seed`+`rng_cursor`; every roll (enemy picks, chest drops, catch rolls, stat rolls on catch) advances and persists the cursor so a run's outcome is reproducible and auditable.
- Not yet deployed anywhere — runs locally via `npm run dev` only, once WP3 is finished.

## Known non-blocking issues from earlier work packages
- Next.js 16 deprecates `middleware.ts` in favor of `proxy.ts` (build shows a deprecation warning); `middleware.ts` still works fully, left as-is since WP0's spec locked that filename.
- ESLint reports pre-existing warnings in a few files (unused stub params, etc.) — not errors, not blocking.
- WP4's `src/server/repo/catalog-client.ts` does live reads against `monster_species`/`items` for UI display purposes (name/emoji lookups) since `HubView` only carries IDs — wrapped in try/catch to degrade gracefully; should work fine now that WP1's migrations are live, but worth a quick sanity check during WP6's browser verification pass.

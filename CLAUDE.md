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
| WP3 | Server actions wiring engine+DB together (`src/server/actions/{hub,run,combat,catch}.ts` real bodies, `src/server/repo/*.ts`) | ✅ Done (commit `d634f7a`) |
| WP6 | Deploy to Vercel (git-linked project, env vars, Supabase auth redirect URL) + full playwright click-through verification | ⚠️ **DEPLOYED, BUT A P0 COMBAT BUG WAS FOUND** — see below |
| — | Write final CLAUDE.md docs | ❌ Not started (blocked on the P0 fix below) |

## ⚠️ START HERE: production is live but combat is broken for a common case
Deploy succeeded. Live at **https://monster-roguelite.vercel.app**, git-linked to `github.com/2055tee/monster-roguelite` (GitHub App authorized, pushes to `master` auto-deploy). All 3 env vars set in Vercel (production + preview). Supabase Auth redirect URL added for the prod domain.

**But browser click-through verification (real gameplay, not the `tests/loop.ts` shortcut) found a reproducible P0 bug that blocks combat:** submitting any damage-dealing combat action against an enemy that currently has an active "guard" buff from Bulwark fails every time — client shows a 500 from the run page's server action plus a React error #441 (minified; see https://react.dev/errors/441), and the action never applies (no HP change, no new combat log line). This is **not flaky** — reproduced 4 consecutive attempts (different abilities: Strike, Strike, Strike, Strike; also tried Strike/Strike/Strike/Venom Fang against a different unguarded enemy where it eventually got through, suggesting the failure specifically correlates with the guard/Bulwark state, not general flakiness). Self-target and ally-target actions (Mend, Bulwark itself) submit fine every time — only outgoing damage against a guarded target fails.

**Impact:** a real player can get permanently stuck in room 1 of Verdant Hollow (the first, easiest dungeon) as soon as an enemy uses Bulwark, since there's no way to finish it off. This blocks run progression entirely — I could not get far enough to test rest rooms, the boss room, catching, or finishing a run for real. **Boss winnability by a real level-2 team is still unverified** — combat design formulas were never actually exercised end-to-end through the UI.

**Also found while verifying:**
- The "Try demo account" button on `/login` was broken (pointed at `demo@monsterroguelite.dev` which didn't exist in Supabase Auth) — a teammate/coordinator created that user with `email_confirm: true` mid-session as a fix; demo login now works. Worth double-checking that account's password (`DemoPass123!`) is documented somewhere safe, or rotate it before this becomes a public link.
- Normal signup rejects `@example.com` addresses as invalid at the Supabase level (fine, expected) but requires real email confirmation — there's no dev/test bypass, so any future scripted signup testing needs either a real inbox or manual `email_confirmed_at` confirmation via SQL against project `nxzzgzozzdejhimbfcmm`.
- **Hub roster HP display bug**: the team card on `/hub` shows HP as e.g. `47/43` — first number is correct effective max HP (confirmed against the combat screen's own max), but the second number is wrong. Math suggests it's `baseHP * rollMultiplier` *before* the `(1 + 0.10*(level-1))` level-scaling term is applied (e.g. Sprigling: `45 * 0.96 ≈ 43`, vs. the correct `45 * 0.96 * 1.1 ≈ 47`) — so the hub card's "max" is being computed with a different (missing level-scaling) formula than combat uses. Cosmetic only (combat itself uses the correct number) but confusing and worth a real fix.
- Header currency badge (`🪙 —`) never resolves to a number on any page in this session, while the in-page currency display (e.g. `🪙 0` on the hub) works correctly — looks like the header component reads a different/missing data source.
- Species names/emoji and item names render correctly everywhere checked (hub team cards, dungeon list, roster page with rarity labels and stat-roll multipliers, inventory) — no blank/fallback states, so `catalog-client.ts`'s live reads are working fine. Not the source of any bug found.
- Abandon Run works cleanly and does reset/fully-heal the team back to hub state.

**Next session should, in order:**
1. Reproduce the guard/Bulwark combat bug locally (`npm run dev`) by forcing an enemy into a guarded state, or read `src/server/actions/combat.ts` and `src/lib/game/combat.ts` around how the Bulwark guard modifier is applied during damage resolution — this is almost certainly an unhandled exception (null/undefined access) in that path, since `tests/loop.ts`'s scripted AI apparently never triggers it (or works around it via `submitCombatActionDirect`, which WP3's notes already flagged as a divergent code path from the real `combat.ts` action once before).
2. Fix it, add a regression test/assertion in `tests/loop.ts` or vitest for "damaging attack vs. guarded target," and redeploy (push to `master` auto-deploys via the Vercel git link).
3. Fix the hub roster HP display formula bug (`src/components/hub/*` or wherever the hub team card computes max HP — align it with whatever `src/lib/game/stats.ts` / combat screen uses).
4. Investigate and fix the header currency badge not resolving.
5. Re-run the **full playwright click-through** end-to-end this time — through rest rooms, the boss, a catch attempt, and finish — and **finally answer whether a real level-2 team can beat the boss.**
6. Only once that's clean, write the final CLAUDE.md documentation pass (replacing this session-state file with real project docs).

## WP3 completion notes (for context, not action items)
WP3 was resumed from an interrupted state and finished in a later session. `npx tsc --noEmit` is clean; `tests/loop.ts` (`npx tsx --env-file=.env.local tests/loop.ts`) passes repeatedly against the live Supabase project, exercising bootstrap → start run → combat → rest → boss → catch → finish, plus double-start rejection and run-abandon, with 0 failures across both the full-success path and the early-failure fallback path.

Two test-script-only fixes were needed along the way (production code was already correct):
- The team wasn't healed between room 0 (resolved in a separate helper) and room 1, so the scripted test AI reliably lost room 1. Fixed by topping up HP before `testRunToBoss`'s loop starts, matching the top-up already done between other rooms.
- `submitCombatActionDirect` (the test's mirror of `src/server/actions/combat.ts`'s `submitCombatAction`) wasn't merging/persisting new log entries into the encounter's `log` field — production code does this correctly (see `combat.ts` line ~67); the test mirror was just missing it. Fixed to match.
- Because the boss (`enemyLevel + 3`, `isBoss: true`) reliably beats the test's simple greedy-AI script even with full HP, `tests/loop.ts` deterministically weakens the boss's HP to 1 right after the boss encounter is created, purely to exercise the catch/finishRun success-path wiring — this is a test-only shortcut and does not reflect real game balance. **Real boss winnability by a level-2 starter team playing well (not the dumb test AI) has not been separately verified** — worth a sanity check during WP6's manual browser click-through.

Next: proceed to WP6 (Vercel deploy + browser click-through verification of the actual game loop).

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

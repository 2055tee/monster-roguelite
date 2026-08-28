-- XP/leveling system (WP2 of the roster/battle UI overhaul, see CLAUDE.md
-- for the full design: xpToNext curve, per-room XP awards, applied in
-- finishRun). `xp` tracks progress toward the monster's *next* level (reset
-- to the remainder on level-up, not cumulative lifetime XP).
alter table public.monsters add column xp int not null default 0;

-- Tracks how much XP a run has already awarded, so finishRun's existing
-- completed_at idempotency guard also protects against double-awarding XP
-- on a repeated call.
alter table public.dungeon_runs add column xp_awarded int not null default 0;

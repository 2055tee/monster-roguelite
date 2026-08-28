-- Per-dungeon combat-room enemy count. Previously hardcoded to 2 everywhere
-- (src/server/actions/run.ts). Added to let Verdant Hollow (Tier 1, the
-- intended always-winnable first dungeon) spawn 1 enemy per combat room
-- instead of 2, since losing a monster in room 1 was compounding into an
-- unwinnable 2-vs-1 by room 4. Other dungeons keep the existing 2-enemy
-- default unchanged.
alter table public.dungeons add column enemies_per_room int not null default 2;

update public.dungeons set enemies_per_room = 1 where name = 'Verdant Hollow';

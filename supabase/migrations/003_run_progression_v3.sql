alter table public.dungeon_runs add column current_room_index int not null default 0;
alter table public.dungeon_runs add column rng_seed bigint not null default 0;
alter table public.dungeon_runs add column rng_cursor int not null default 0;
alter table public.dungeon_runs add column expected_turns_per_room int not null default 6;
alter table public.dungeon_runs add column total_expected_turns int not null default 24;
alter table public.dungeon_runs add column total_turns int not null default 0;
alter table public.dungeon_runs add column team_snapshot jsonb not null default '[]';
alter table public.dungeon_runs add column rooms jsonb not null default '[]';
alter table public.dungeon_runs add column performance numeric;
alter table public.dungeon_runs add column catch_chance numeric;
alter table public.dungeon_runs add column catch_roll numeric;
alter table public.dungeon_runs add column catch_succeeded boolean;
alter table public.dungeon_runs add column caught_monster_id uuid references public.monsters(id);
alter table public.dungeon_runs add column gold_awarded int not null default 0;

alter table public.dungeon_runs drop constraint if exists dungeon_runs_status_check;
alter table public.dungeon_runs add constraint dungeon_runs_status_check check (status in ('in_progress','completed','failed','abandoned'));

create unique index one_active_run on public.dungeon_runs(owner_id) where status = 'in_progress';

create table public.combat_encounters (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.dungeon_runs(id) on delete cascade,
  room_index int not null,
  status text not null default 'active' check (status in ('active','won','lost')),
  turn_count int not null default 0,
  round_pointer int not null default 0,
  state jsonb not null default '{}',
  log jsonb not null default '[]',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (run_id, room_index)
);

create table public.run_room_results (
  run_id uuid not null references public.dungeon_runs(id) on delete cascade,
  room_index int not null,
  room_type text not null,
  choice text,
  turns int,
  item_id uuid references public.items(id),
  primary key (run_id, room_index)
);

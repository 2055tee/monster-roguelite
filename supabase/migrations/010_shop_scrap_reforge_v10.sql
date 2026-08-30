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

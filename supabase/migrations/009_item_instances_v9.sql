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

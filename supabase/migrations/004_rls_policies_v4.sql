-- profiles
drop policy if exists "profiles are self-readable/writable" on public.profiles;
create policy "profiles select own" on public.profiles for select using (auth.uid() = id);

-- monsters
drop policy if exists "monsters are owner-scoped" on public.monsters;
create policy "monsters select own" on public.monsters for select using (auth.uid() = owner_id);

-- inventory
drop policy if exists "inventory is owner-scoped" on public.inventory;
create policy "inventory select own" on public.inventory for select using (auth.uid() = owner_id);

-- dungeon_runs
drop policy if exists "dungeon runs are owner-scoped" on public.dungeon_runs;
create policy "dungeon runs select own" on public.dungeon_runs for select using (auth.uid() = owner_id);

alter table public.combat_encounters enable row level security;
create policy "combat encounters select own" on public.combat_encounters for select using (
  exists (select 1 from public.dungeon_runs r where r.id = run_id and r.owner_id = auth.uid())
);

alter table public.run_room_results enable row level security;
create policy "run room results select own" on public.run_room_results for select using (
  exists (select 1 from public.dungeon_runs r where r.id = run_id and r.owner_id = auth.uid())
);

-- catalog tables (monster_species, items, dungeons) already have authenticated-read
-- policies from core_entities_v1; confirmed no write policies exist for anon/authenticated.

-- auto-create a profiles row on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- harden: handle_new_user is only meant to be invoked by the trigger, not
-- called directly via the exposed PostgREST RPC endpoint by anon/authenticated.
revoke execute on function public.handle_new_user() from anon, authenticated;

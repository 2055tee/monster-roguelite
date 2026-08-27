alter table public.profiles add column currency int not null default 0;
alter table public.profiles add column bootstrapped boolean not null default false;

alter table public.monster_species add column rarity int not null default 1;
alter table public.monster_species add column min_tier int not null default 1;
alter table public.monster_species add column signature_ability text not null default 'heavy_blow';
alter table public.monster_species add column ability_pool jsonb not null default '[]';
alter table public.monster_species add column emoji text not null default '❓';

alter table public.monsters add column current_hp int;
alter table public.monsters add column equipped_item_id uuid references public.items(id) on delete set null;
alter table public.monsters add column is_starter boolean not null default false;

alter table public.items add column effect jsonb not null default '{}';
alter table public.items add column drop_weight int not null default 0;

alter table public.dungeons add column enemy_level int not null default 3;
alter table public.dungeons add column boss_species_id uuid references public.monster_species(id);
alter table public.dungeons add column base_catch_rate numeric not null default 0.5;
alter table public.dungeons add column gold_reward int not null default 20;
alter table public.dungeons add column enemy_species_ids uuid[] not null default '{}';
alter table public.dungeons add column room_layout jsonb not null default '["combat","combat","rest","combat","rest","boss"]';

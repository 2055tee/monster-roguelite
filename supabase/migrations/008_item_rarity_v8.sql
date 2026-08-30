alter table public.items
  add column rarity text not null default 'common'
  check (rarity in ('common','rare','epic','legendary'));

update public.items set rarity = 'rare' where name in ('Prime Lure','Field Elixir');

insert into public.items (name, category, description, effect, drop_weight, rarity) values
  ('Charm of Force',      'equipment', '+18% ATK', '{"type":"stat_pct","stat":"atk","value":0.18}', 9, 'rare'),
  ('Charm of Conquest',   'equipment', '+28% ATK', '{"type":"stat_pct","stat":"atk","value":0.28}', 4, 'epic'),
  ('Charm of Ascendance', 'equipment', '+40% ATK', '{"type":"stat_pct","stat":"atk","value":0.40}', 1, 'legendary'),
  ('Bastion Plate',       'equipment', '+24% DEF', '{"type":"stat_pct","stat":"def","value":0.24}', 8, 'rare'),
  ('Aegis Plate',         'equipment', '+36% DEF', '{"type":"stat_pct","stat":"def","value":0.36}', 3, 'epic'),
  ('Sovereign Plate',     'equipment', '+50% DEF', '{"type":"stat_pct","stat":"def","value":0.50}', 1, 'legendary'),
  ('Gale Band',           'equipment', '+24% SPD', '{"type":"stat_pct","stat":"spd","value":0.24}', 7, 'rare'),
  ('Tempest Band',        'equipment', '+36% SPD', '{"type":"stat_pct","stat":"spd","value":0.36}', 3, 'epic'),
  ('Zephyr Band',         'equipment', '+50% SPD', '{"type":"stat_pct","stat":"spd","value":0.50}', 1, 'legendary'),
  ('Locket of Vigor',     'equipment', '+20% HP',  '{"type":"stat_pct","stat":"hp","value":0.20}',  7, 'rare'),
  ('Locket of Vitality',  'equipment', '+30% HP',  '{"type":"stat_pct","stat":"hp","value":0.30}',  3, 'epic'),
  ('Locket of Eternity',  'equipment', '+42% HP',  '{"type":"stat_pct","stat":"hp","value":0.42}',  1, 'legendary'),
  ('Grand Lure',          'consumable','+45pp catch chance', '{"type":"catch_bonus","value":0.45}', 2, 'epic')
on conflict (name) do update set
  category = excluded.category, description = excluded.description,
  effect = excluded.effect, drop_weight = excluded.drop_weight, rarity = excluded.rarity;

-- Monster species
insert into public.monster_species (name, emoji, base_stats, rarity, min_tier, signature_ability, ability_pool)
values
  ('Sprigling', '🌱', '{"hp":45,"atk":11,"def":9,"spd":10}', 1, 1, 'mend', '["heavy_blow","bulwark","swift_strike"]'),
  ('Cinderpup', '🔥', '{"hp":42,"atk":14,"def":7,"spd":12}', 1, 1, 'heavy_blow', '["swift_strike","war_cry","venom_fang"]'),
  ('Pebblet', '🪨', '{"hp":55,"atk":10,"def":14,"spd":6}', 1, 1, 'bulwark', '["heavy_blow","mend","war_cry"]'),
  ('Zaplet', '⚡', '{"hp":38,"atk":13,"def":6,"spd":16}', 1, 1, 'swift_strike', '["heavy_blow","venom_fang","war_cry"]'),
  ('Thornmaw', '🪲', '{"hp":70,"atk":16,"def":12,"spd":11}', 2, 1, 'venom_fang', '["heavy_blow","bulwark","war_cry"]'),
  ('Emberfang', '🐺', '{"hp":88,"atk":22,"def":14,"spd":15}', 3, 2, 'war_cry', '["heavy_blow","swift_strike","venom_fang"]'),
  ('Glacierhorn', '🦬', '{"hp":120,"atk":28,"def":22,"spd":12}', 4, 3, 'bulwark', '["heavy_blow","mend","war_cry"]'),
  ('Voidmaw', '🕳️', '{"hp":150,"atk":38,"def":26,"spd":20}', 5, 4, 'heavy_blow', '["venom_fang","swift_strike","war_cry"]')
on conflict (name) do update set
  emoji = excluded.emoji,
  base_stats = excluded.base_stats,
  rarity = excluded.rarity,
  min_tier = excluded.min_tier,
  signature_ability = excluded.signature_ability,
  ability_pool = excluded.ability_pool;

-- Items
insert into public.items (name, category, description, effect, drop_weight)
values
  ('Minor Charm', 'equipment', '+10% ATK', '{"type":"stat_pct","stat":"atk","value":0.10}', 22),
  ('Guard Plate', 'equipment', '+15% DEF', '{"type":"stat_pct","stat":"def","value":0.15}', 18),
  ('Swift Band', 'equipment', '+15% SPD', '{"type":"stat_pct","stat":"spd","value":0.15}', 15),
  ('Vital Locket', 'equipment', '+12% max HP', '{"type":"stat_pct","stat":"hp","value":0.12}', 15),
  ('Lure Bait', 'consumable', '+15pp catch chance', '{"type":"catch_bonus","value":0.15}', 18),
  ('Prime Lure', 'consumable', '+30pp catch chance', '{"type":"catch_bonus","value":0.30}', 9),
  ('Field Elixir', 'consumable', 'Instantly finishes healing on one monster', '{"type":"instant_heal"}', 3)
on conflict (name) do update set
  category = excluded.category,
  description = excluded.description,
  effect = excluded.effect,
  drop_weight = excluded.drop_weight;

-- Dungeons
insert into public.dungeons (name, difficulty_tier, description, enemy_level, boss_species_id, base_catch_rate, gold_reward, enemy_species_ids, room_layout)
select
  d.name, d.difficulty_tier, d.description, d.enemy_level,
  (select id from public.monster_species where name = d.boss_name),
  d.base_catch_rate, d.gold_reward,
  (select array_agg(id) from public.monster_species where name = any(d.enemy_names)),
  '["combat","combat","rest","combat","rest","boss"]'::jsonb
from (
  values
    ('Verdant Hollow', 1, 'A quiet overgrown hollow teeming with young monsters.', 3, 'Thornmaw', 0.60, 20, array['Sprigling','Cinderpup','Pebblet','Zaplet']),
    ('Emberfall Cave', 2, 'A scorched cavern lit by falling embers.', 8, 'Emberfang', 0.50, 45, array['Sprigling','Cinderpup','Pebblet','Zaplet']),
    ('Frostspire Ruins', 3, 'Ancient ruins buried in perpetual frost.', 15, 'Glacierhorn', 0.40, 80, array['Thornmaw','Emberfang']),
    ('Voidmaw Depths', 4, 'A bottomless abyss where light does not return.', 24, 'Voidmaw', 0.30, 140, array['Thornmaw','Emberfang'])
) as d(name, difficulty_tier, description, enemy_level, boss_name, base_catch_rate, gold_reward, enemy_names)
on conflict (name) do update set
  difficulty_tier = excluded.difficulty_tier,
  description = excluded.description,
  enemy_level = excluded.enemy_level,
  boss_species_id = excluded.boss_species_id,
  base_catch_rate = excluded.base_catch_rate,
  gold_reward = excluded.gold_reward,
  enemy_species_ids = excluded.enemy_species_ids,
  room_layout = excluded.room_layout;

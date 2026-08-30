alter table public.monster_species
  add column element text not null default 'normal'
  check (element in ('fire','nature','earth','electric','water','normal','light','dark'));

update public.monster_species set element = 'nature' where name = 'Sprigling';
update public.monster_species set element = 'fire' where name = 'Cinderpup';
update public.monster_species set element = 'earth' where name = 'Pebblet';
update public.monster_species set element = 'electric' where name = 'Zaplet';
update public.monster_species set element = 'dark' where name = 'Thornmaw';
update public.monster_species set element = 'fire' where name = 'Emberfang';
update public.monster_species set element = 'earth' where name = 'Glacierhorn';
update public.monster_species set element = 'dark' where name = 'Voidmaw';

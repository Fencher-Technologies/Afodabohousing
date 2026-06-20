begin;

alter table public.properties
add column if not exists title text;

update public.properties
set title = coalesce(
  nullif(title, ''),
  nullif(description, ''),
  nullif(address, ''),
  'Afodabo Property'
);

alter table public.properties
alter column title set not null;

commit;

-- Run this once in the Supabase SQL Editor for the new project.
-- It repairs recursive profiles/user_roles RLS policies and the signup trigger.

begin;

create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.has_role(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = required_role
  );
$$;

revoke all on function private.has_role(public.app_role) from public;
grant execute on function private.has_role(public.app_role) to authenticated;

create or replace function private.can_view_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) = target_user_id
    or private.has_role('admin'::public.app_role)
    or exists (
      select 1
      from public.tenancies
      where
        (tenant_id = (select auth.uid()) and manager_id = target_user_id)
        or (manager_id = (select auth.uid()) and tenant_id = target_user_id)
    )
    or exists (
      select 1
      from public.messages
      where
        (sender_id = (select auth.uid()) and receiver_id = target_user_id)
        or (receiver_id = (select auth.uid()) and sender_id = target_user_id)
    );
$$;

revoke all on function private.can_view_profile(uuid) from public;
grant execute on function private.can_view_profile(uuid) to authenticated;

alter table public.user_roles enable row level security;
alter table public.profiles enable row level security;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'user_roles'
  loop
    execute format('drop policy if exists %I on public.user_roles', policy_row.policyname);
  end loop;

  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
  loop
    execute format('drop policy if exists %I on public.profiles', policy_row.policyname);
  end loop;
end;
$$;

create policy "Users can view their own role"
on public.user_roles
for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.has_role('admin'::public.app_role))
);

create policy "Users can create their selectable role"
on public.user_roles
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and role in ('tenant'::public.app_role, 'house_manager'::public.app_role)
);

create policy "Users can update their selectable role"
on public.user_roles
for update
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.has_role('admin'::public.app_role))
)
with check (
  (
    user_id = (select auth.uid())
    and role in ('tenant'::public.app_role, 'house_manager'::public.app_role)
  )
  or (select private.has_role('admin'::public.app_role))
);

create policy "Users can view relevant profiles"
on public.profiles
for select
to authenticated
using ((select private.can_view_profile(user_id)));

create policy "Users can create their own profile"
on public.profiles
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create index if not exists profiles_user_id_idx
on public.profiles (user_id);

create index if not exists user_roles_user_id_idx
on public.user_roles (user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_role public.app_role;
begin
  selected_role := case
    when new.raw_user_meta_data ->> 'role' = 'house_manager'
      then 'house_manager'::public.app_role
    else 'tenant'::public.app_role
  end;

  insert into public.profiles (user_id, full_name, phone)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'phone'), '')
  );

  insert into public.user_roles (user_id, role)
  values (new.id, selected_role);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill users created while the previous trigger or policies were broken.
insert into public.profiles (user_id, full_name, phone)
select
  users.id,
  nullif(trim(users.raw_user_meta_data ->> 'full_name'), ''),
  nullif(trim(users.raw_user_meta_data ->> 'phone'), '')
from auth.users as users
where not exists (
  select 1
  from public.profiles
  where profiles.user_id = users.id
);

insert into public.user_roles (user_id, role)
select
  users.id,
  case
    when users.raw_user_meta_data ->> 'role' = 'admin'
      then 'admin'::public.app_role
    when users.raw_user_meta_data ->> 'role' = 'house_manager'
      then 'house_manager'::public.app_role
    else 'tenant'::public.app_role
  end
from auth.users as users
where not exists (
  select 1
  from public.user_roles
  where user_roles.user_id = users.id
);

commit;

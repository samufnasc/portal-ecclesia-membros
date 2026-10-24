-- Portal Ecclesia: estrutura inicial para perfis, vínculo líder/departamento e ficha privada.
-- ATENÇÃO: esta migração cria a estrutura privada, mas NÃO altera as policies atuais de public.members.
-- Não considere a aplicação protegida até concluir a migração do login para Supabase Auth
-- e substituir as policies públicas de escrita da tabela members.

create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('admin', 'pastor', 'leader')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.department_leaders (
  department text not null,
  leader_user_id uuid not null references public.user_profiles(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (department, leader_user_id)
);

create table if not exists public.member_private_details (
  member_id uuid primary key references public.members(id) on delete cascade,
  phone text,
  email text,
  marital_status text,
  address text,
  neighborhood text,
  is_working boolean,
  profession text,
  baptized_in_water boolean,
  water_baptism_date date,
  baptized_in_holy_spirit boolean,
  holy_spirit_baptism_date date,
  is_tither boolean,
  congregation_since date,
  enrolled_in_sunday_school boolean,
  sunday_school_class text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create index if not exists department_leaders_user_idx
  on public.department_leaders (leader_user_id);

alter table public.user_profiles enable row level security;
alter table public.department_leaders enable row level security;
alter table public.member_private_details enable row level security;

-- Funções SECURITY DEFINER evitam recursão de RLS ao consultar perfis e vínculos.
create or replace function public.current_ecclesia_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.user_profiles p
  where p.user_id = (select auth.uid())
  limit 1
$$;

create or replace function public.can_access_member_private_details(_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.current_ecclesia_role() in ('admin', 'pastor')
    or (
      public.current_ecclesia_role() = 'leader'
      and exists (
        select 1
        from public.members m
        join public.department_leaders dl
          on dl.department = any(coalesce(m.departments, array[]::text[]))
        where m.id = _member_id
          and dl.leader_user_id = (select auth.uid())
      )
    )
$$;

revoke all on function public.current_ecclesia_role() from public;
grant execute on function public.current_ecclesia_role() to authenticated;
revoke all on function public.can_access_member_private_details(uuid) from public;
grant execute on function public.can_access_member_private_details(uuid) to authenticated;

drop policy if exists "Users can read own Ecclesia profile" on public.user_profiles;
create policy "Users can read own Ecclesia profile"
  on public.user_profiles for select to authenticated
  using (user_id = (select auth.uid()) or public.current_ecclesia_role() = 'admin');

drop policy if exists "Admins manage Ecclesia profiles" on public.user_profiles;
create policy "Admins manage Ecclesia profiles"
  on public.user_profiles for all to authenticated
  using (public.current_ecclesia_role() = 'admin')
  with check (public.current_ecclesia_role() = 'admin');

drop policy if exists "Admin and pastor read department leaders" on public.department_leaders;
create policy "Admin and pastor read department leaders"
  on public.department_leaders for select to authenticated
  using (public.current_ecclesia_role() in ('admin', 'pastor'));

drop policy if exists "Admins manage department leaders" on public.department_leaders;
create policy "Admins manage department leaders"
  on public.department_leaders for all to authenticated
  using (public.current_ecclesia_role() = 'admin')
  with check (public.current_ecclesia_role() = 'admin');

drop policy if exists "Authorized users read member private details" on public.member_private_details;
create policy "Authorized users read member private details"
  on public.member_private_details for select to authenticated
  using (public.can_access_member_private_details(member_id));

drop policy if exists "Authorized users insert member private details" on public.member_private_details;
create policy "Authorized users insert member private details"
  on public.member_private_details for insert to authenticated
  with check (public.can_access_member_private_details(member_id));

drop policy if exists "Authorized users update member private details" on public.member_private_details;
create policy "Authorized users update member private details"
  on public.member_private_details for update to authenticated
  using (public.can_access_member_private_details(member_id))
  with check (public.can_access_member_private_details(member_id));

drop policy if exists "Authorized users delete member private details" on public.member_private_details;
create policy "Authorized users delete member private details"
  on public.member_private_details for delete to authenticated
  using (public.current_ecclesia_role() = 'admin');

-- Nenhuma policy para anon: visitantes não conseguem ler a ficha privada.

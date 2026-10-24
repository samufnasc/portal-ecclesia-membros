-- Portal Ecclesia: preparação de contas gerenciadas e políticas de acesso.
-- NÃO execute isoladamente enquanto a aplicação ainda usa login local.
-- Aplicar somente depois de integrar Supabase Auth e atualizar as consultas do frontend.
-- Esta migração substitui policies permissivas; o deploy da aplicação precisa acompanhar.

alter table public.user_profiles
  add column if not exists email text,
  add column if not exists is_active boolean not null default true;

create unique index if not exists user_profiles_email_lower_idx
  on public.user_profiles (lower(email))
  where email is not null;

-- Usuários desativados deixam de ser reconhecidos pelas funções de autorização.
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
    and p.is_active = true
  limit 1
$$;

-- View pública mínima: apenas os campos necessários para aniversariantes.
-- Não expõe telefone, e-mail, endereço, profissão ou ficha eclesiástica.
create or replace view public.public_member_directory as
  select id, name, birthday, month, day, is_leadership
  from public.members;

grant select on public.public_member_directory to anon, authenticated;

-- Contadores públicos por departamento sem revelar a lista de membros de cada departamento.
create or replace function public.public_department_counts()
returns table (department text, member_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select d.department, count(distinct m.id)::bigint
  from public.members m
  cross join lateral unnest(coalesce(m.departments, array[]::text[])) as d(department)
  group by d.department
  order by d.department
$$;

revoke all on function public.public_department_counts() from public;
grant execute on function public.public_department_counts() to anon, authenticated;

-- Remove as policies públicas permissivas conhecidas da tabela principal.
drop policy if exists "Permitir leitura pública" on public.members;
drop policy if exists "Permitir escrita pública" on public.members;
drop policy if exists "Public can read members" on public.members;
drop policy if exists "Public can manage members" on public.members;

create policy "Authenticated authorized users read scoped members"
  on public.members for select to authenticated
  using (
    public.current_ecclesia_role() in ('admin', 'pastor')
    or (
      public.current_ecclesia_role() = 'leader'
      and exists (
        select 1
        from public.department_leaders dl
        where dl.leader_user_id = (select auth.uid())
          and dl.department = any(coalesce(public.members.departments, array[]::text[]))
      )
    )
  );

create policy "Admins insert members"
  on public.members for insert to authenticated
  with check (public.current_ecclesia_role() = 'admin');

create policy "Admins update members"
  on public.members for update to authenticated
  using (public.current_ecclesia_role() = 'admin')
  with check (public.current_ecclesia_role() = 'admin');

create policy "Admins delete members"
  on public.members for delete to authenticated
  using (public.current_ecclesia_role() = 'admin');

-- Configuração do site: leitura pública, alterações somente pelo administrador.
drop policy if exists "Permitir tudo em settings" on public.settings;
create policy "Public can read settings"
  on public.settings for select to anon, authenticated
  using (true);

create policy "Admins manage settings"
  on public.settings for all to authenticated
  using (public.current_ecclesia_role() = 'admin')
  with check (public.current_ecclesia_role() = 'admin');

-- Um líder pode ler apenas seus próprios vínculos; admin/pastor podem consultar todos.
drop policy if exists "Admin and pastor read department leaders" on public.department_leaders;
create policy "Authorized users read department leaders"
  on public.department_leaders for select to authenticated
  using (
    public.current_ecclesia_role() in ('admin', 'pastor')
    or leader_user_id = (select auth.uid())
  );

-- Atualiza a autorização da ficha privada para respeitar a conta ativa e o departamento.
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

-- IMPORTANTE:
-- 1) O usuário inicial admin precisa ser criado em Authentication > Users.
-- 2) Depois, executar uma única vez um INSERT em user_profiles para esse user_id,
--    com role='admin', display_name e email corretos.
-- 3) Só então o administrador poderá gerenciar outras contas pela interface.
-- 4) Não guardar senhas em tabelas próprias; Supabase Auth armazena credenciais com hash.

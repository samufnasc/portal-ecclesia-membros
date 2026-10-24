# Portal Ecclesia — ativação de autenticação e acessos

> **Não aplique a migração de segurança antes de conferir o deploy da branch e configurar o primeiro administrador.** A migração remove as policies públicas permissivas de escrita/leitura da tabela principal. A aplicação e o banco devem ser atualizados em conjunto.

## O que já está preparado nesta branch

- Login por e-mail e senha via Supabase Auth.
- Perfil admin, pastor ou leader em public.user_profiles.
- Vínculos de líderes em public.department_leaders.
- Tela administrativa para criar contas, escolher departamentos, alterar perfis, redefinir senha e bloquear/reativar acessos.
- Edge Function admin-manage-user, que usa a chave de serviço apenas no servidor e valida se quem chamou a função é administrador.
- Migração para expor ao público apenas o diretório mínimo de aniversariantes e contadores agregados por departamento, e para limitar a tabela principal a usuários autenticados autorizados.

## Preparação necessária no Supabase

1. Faça backup do projeto e confirme que tem acesso de administrador ao Supabase.
2. Publique a Edge Function admin-manage-user a partir de supabase/functions/admin-manage-user/index.ts.
3. Confirme nas secrets da Edge Function que existem SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY. A chave de serviço deve permanecer somente no ambiente de servidor; nunca a coloque em variáveis VITE_* nem no frontend.
4. Aplique primeiro a migração 20261024_member_private_details.sql, que cria user_profiles e as tabelas auxiliares. Não aplique ainda a migração de segurança 20261025_auth_managed_access.sql.
5. Crie a primeira conta de administrador em **Authentication → Users** com o e-mail que será usado para administrar o portal.
6. Execute o bloco de bootstrap abaixo substituindo ADMIN_EMAIL_AQUI pelo e-mail exato da conta criada no passo anterior:

```sql
insert into public.user_profiles (user_id, display_name, email, role, is_active)
select id, 'Administrador', email, 'admin', true
from auth.users
where lower(email) = lower('ADMIN_EMAIL_AQUI')
on conflict (user_id) do update
set display_name = excluded.display_name,
    email = excluded.email,
    role = 'admin',
    is_active = true,
    updated_at = now();
```

Confirme que uma linha foi criada/atualizada em public.user_profiles para essa conta.

## Ordem de migração

As migrações devem ser aplicadas na ordem:

1. 20261024_member_private_details.sql — cria as tabelas auxiliares.
2. Criar o usuário inicial no Authentication → Users e inserir o perfil admin usando o bloco de bootstrap acima.
3. 20261025_auth_managed_access.sql — restringe as policies da tabela principal.

A segunda migração remove as policies públicas permissivas conhecidas de public.members. A página pública passa a usar public_member_directory e public_department_counts(); o cadastro completo exige uma sessão válida. Não aplique essa migração enquanto a versão do frontend que usa essas rotas não estiver disponível no preview.

## Testes obrigatórios antes de publicar

- Visitante sem sessão: vê nomes e datas de aniversário, total e contadores agregados; não vê a tabela completa nem dados privados.
- Líder: autentica por e-mail/senha, vê apenas os membros dos departamentos associados e não consegue consultar registros de outros departamentos diretamente via API.
- Pastor: consulta membros de todos os departamentos conforme as políticas.
- Administrador: cria um líder, atribui um ou mais departamentos, redefine a senha, bloqueia e reativa uma conta.
- Conta bloqueada: não obtém acesso mesmo que a sessão anterior ainda exista.
- Ficha privada: leitura e escrita são verificadas para admin, pastor, líder autorizado e visitante.
- Falha de rede/banco: a aplicação não deve apresentar dados de demonstração como se fossem dados reais.

## Observações de segurança

- As senhas nunca devem ser salvas em uma tabela própria nem exibidas novamente na tela de administração. Supabase Auth é responsável por armazenar/verificar credenciais.
- A filtragem da interface não é uma barreira de segurança por si só; as policies RLS são obrigatórias.
- O escopo de leitura da tabela members e o escopo de member_private_details são diferentes: o primeiro controla os dados básicos do cadastro; o segundo controla a ficha pessoal privada.
- Não faça merge nem publique em produção até que o preview e todos os testes acima tenham sido aprovados.

-- =============================================================
-- TMBC — Security Patch
-- Rodar no Supabase Dashboard → SQL Editor
-- =============================================================

-- -------------------------------------------------------------
-- 1. REVOGAR acesso público à admin_user_view
--    O Supabase concede grants via PUBLIC e default privileges, então
--    precisamos revogar de PUBLIC, anon e authenticated (ALL PRIVILEGES).
-- -------------------------------------------------------------
REVOKE ALL PRIVILEGES ON public.admin_user_view FROM PUBLIC;
REVOKE ALL PRIVILEGES ON public.admin_user_view FROM anon;
REVOKE ALL PRIVILEGES ON public.admin_user_view FROM authenticated;

-- Apenas service_role (backend) pode consultar a view
GRANT SELECT ON public.admin_user_view TO service_role;

-- -------------------------------------------------------------
-- 2. REVOGAR acesso anon às tabelas internas
--    anon nunca deve ler profiles, user_products ou watch_progress.
--    (products tem policy TO authenticated, mas revocação explícita
--    adiciona camada extra de defesa)
-- -------------------------------------------------------------
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.profiles       FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.user_products  FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.watch_progress FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.products       FROM anon;

-- -------------------------------------------------------------
-- 3. CONFIRMAR que RLS está ativado em todas as tabelas
--    (idempotente — não quebra se já estiver ativo)
-- -------------------------------------------------------------
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_products  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_progress ENABLE ROW LEVEL SECURITY;

-- FORÇA o RLS mesmo para o dono da tabela (postgres role)
-- Isso impede que a role postgres bypasse as políticas acidentalmente
ALTER TABLE public.profiles       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_products  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.watch_progress FORCE ROW LEVEL SECURITY;

-- -------------------------------------------------------------
-- 4. VERIFICAÇÃO — rodar após o patch para confirmar
-- -------------------------------------------------------------
-- Quais roles têm SELECT na admin_user_view:
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'admin_user_view';
-- Resultado esperado: apenas "postgres" e "service_role"

-- RLS status das tabelas:
SELECT
  n.nspname   AS schemaname,
  c.relname   AS tablename,
  c.relrowsecurity      AS rowsecurity,
  c.relforcerowsecurity AS force_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('profiles', 'products', 'user_products', 'watch_progress');
-- Resultado esperado: rowsecurity = true, force_rls = true (exceto products)

-- =============================================================
-- 5. DESABILITAR SIGNUP ABERTO (fazer no Dashboard, não via SQL)
-- =============================================================
-- Ir em: Supabase Dashboard → Authentication → Configuration
-- Seção "User Signups" → ativar "Disable new user signups"
-- Isso impede que qualquer pessoa crie conta. Novos membros só
-- podem ser criados pelo painel Admin (/admin).
-- =============================================================

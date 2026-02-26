-- =============================================================
-- TMBC Membership Area — Supabase Schema
-- Rodar no Supabase Dashboard → SQL Editor
-- =============================================================

-- =============================================================
-- 1. profiles (estende auth.users)
-- =============================================================
CREATE TABLE public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT,              -- espelhado de auth.users.email para acesso direto
  full_name    TEXT,
  role         TEXT NOT NULL DEFAULT 'member'
                 CHECK (role IN ('member', 'admin')),
  is_active    BOOLEAN NOT NULL DEFAULT true,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ
);

-- Trigger: cria profile automaticamente ao criar usuário no auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email)
  ON CONFLICT (id) DO UPDATE SET
    email     = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================
-- 2. products (catálogo de produtos)
-- =============================================================
CREATE TABLE public.products (
  id               TEXT PRIMARY KEY,  -- 'tmbc', 'ese', 'bidcap'
  name             TEXT NOT NULL,
  description      TEXT,
  access_type      TEXT NOT NULL DEFAULT 'lifetime'
                     CHECK (access_type IN ('lifetime', 'subscription')),
  subscription_days INTEGER,          -- dias de acesso para tipo subscription
  is_active        BOOLEAN NOT NULL DEFAULT true,
  sort_order       INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed: 3 produtos iniciais
INSERT INTO public.products (id, name, access_type, sort_order) VALUES
  ('tmbc',   'TMBC',                      'lifetime', 1),
  ('ese',    'ESE',                        'lifetime', 2),
  ('bidcap', 'Reunião Secreta do Bidcap',  'lifetime', 3);

-- =============================================================
-- 3. user_products (concessão de acesso por produto)
-- =============================================================
CREATE TABLE public.user_products (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id       TEXT NOT NULL REFERENCES public.products(id),
  status           TEXT NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'revoked', 'refunded', 'expired')),
  purchased_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ,       -- NULL = acesso vitalício
  bonus_unlocks_at TIMESTAMPTZ,       -- calculado via trigger: purchased_at + 7 dias
  payment_id       TEXT,              -- ID da transação no Payt
  payment_platform TEXT DEFAULT 'payt',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Trigger: calcula bonus_unlocks_at automaticamente (purchased_at + 7 dias)
-- Usamos trigger em vez de GENERATED COLUMN porque TIMESTAMPTZ + INTERVAL
-- não é considerado imutável pelo Postgres e não pode ser coluna gerada.
CREATE OR REPLACE FUNCTION public.set_bonus_unlocks_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.bonus_unlocks_at := NEW.purchased_at + INTERVAL '7 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_products_bonus_unlocks_at
  BEFORE INSERT OR UPDATE OF purchased_at ON public.user_products
  FOR EACH ROW EXECUTE FUNCTION public.set_bonus_unlocks_at();

CREATE TRIGGER user_products_updated_at
  BEFORE UPDATE ON public.user_products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Index para busca rápida de acesso
CREATE INDEX idx_user_products_user_status ON public.user_products (user_id, status);

-- =============================================================
-- 4. watch_progress (progresso de vídeos — migrado do localStorage)
-- =============================================================
CREATE TABLE public.watch_progress (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id            TEXT    NOT NULL,  -- slug opaco: v1, v2, v3, ...
  playback_position   NUMERIC NOT NULL DEFAULT 0,  -- segundos assistidos (evita palavra reservada current_time)
  duration            NUMERIC NOT NULL DEFAULT 0,
  progress            NUMERIC NOT NULL DEFAULT 0
                        CHECK (progress >= 0 AND progress <= 1),
  is_completed        BOOLEAN NOT NULL DEFAULT false,
  completed_at        TIMESTAMPTZ,
  last_watched_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  total_watch_seconds INTEGER NOT NULL DEFAULT 0,  -- tempo total acumulado (para premiações)
  session_count       INTEGER NOT NULL DEFAULT 1,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

CREATE TRIGGER watch_progress_updated_at
  BEFORE UPDATE ON public.watch_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Index para busca rápida
CREATE INDEX idx_watch_progress_user ON public.watch_progress (user_id);

-- =============================================================
-- 5. View: resumo para o painel admin
-- =============================================================
CREATE OR REPLACE VIEW public.admin_user_view AS
SELECT
  p.id,
  u.email,
  p.full_name,
  p.role,
  p.is_active,
  p.created_at,
  p.last_seen_at,
  p.notes,
  COALESCE(
    json_agg(
      json_build_object(
        'product_id',       up.product_id,
        'product_name',     pr.name,
        'status',           up.status,
        'purchased_at',     up.purchased_at,
        'bonus_unlocks_at', up.bonus_unlocks_at,
        'expires_at',       up.expires_at,
        'payment_id',       up.payment_id
      )
    ) FILTER (WHERE up.id IS NOT NULL),
    '[]'
  ) AS products,
  COALESCE(SUM(wp.total_watch_seconds), 0) AS total_watch_seconds,
  COUNT(wp.id) FILTER (WHERE wp.is_completed) AS completed_videos
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
LEFT JOIN public.user_products up ON up.user_id = p.id
LEFT JOIN public.products pr ON pr.id = up.product_id
LEFT JOIN public.watch_progress wp ON wp.user_id = p.id
GROUP BY p.id, u.email;

-- =============================================================
-- 6. RLS — Row Level Security
-- =============================================================

-- Helper: retorna role do usuário autenticado (evita recursão RLS)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ---------- profiles ----------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: user read own"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles: user update own"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "profiles: admin full access"
  ON public.profiles FOR ALL
  USING (public.current_user_role() = 'admin');

-- ---------- products (leitura pública para usuários autenticados) ----------
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products: authenticated read"
  ON public.products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "products: admin full access"
  ON public.products FOR ALL
  USING (public.current_user_role() = 'admin');

-- ---------- user_products ----------
ALTER TABLE public.user_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_products: user read own"
  ON public.user_products FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "user_products: admin full access"
  ON public.user_products FOR ALL
  USING (public.current_user_role() = 'admin');

-- ---------- watch_progress ----------
ALTER TABLE public.watch_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "watch_progress: user full access own"
  ON public.watch_progress FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "watch_progress: admin read all"
  ON public.watch_progress FOR SELECT
  USING (public.current_user_role() = 'admin');

-- =============================================================
-- 7. Revogar acesso público — segurança
-- =============================================================

-- admin_user_view: somente service_role (backend) pode ler
REVOKE SELECT ON public.admin_user_view FROM anon;
REVOKE SELECT ON public.admin_user_view FROM authenticated;
GRANT  SELECT ON public.admin_user_view TO service_role;

-- Tabelas internas: anon nunca acessa diretamente
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.profiles       FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.user_products  FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.watch_progress FROM anon;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.products       FROM anon;

-- FORCE RLS: impede que a role postgres bypasse as políticas
ALTER TABLE public.profiles       FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_products  FORCE ROW LEVEL SECURITY;
ALTER TABLE public.watch_progress FORCE ROW LEVEL SECURITY;

-- =============================================================
-- NOTAS PÓS-DEPLOY
-- =============================================================
-- 1. Rodar supabase/security-patch.sql se o schema já existia
-- 2. Em Supabase Dashboard → Authentication → Configuration:
--    ativar "Disable new user signups" (novos membros só via /admin)
-- 3. Para tornar um usuário admin:
--    UPDATE public.profiles SET role = 'admin' WHERE id = '<user-uuid>';
-- =============================================================

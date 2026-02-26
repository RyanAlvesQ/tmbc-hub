-- =============================================================
-- Migração: adicionar email à tabela profiles
-- Rodar no Supabase Dashboard → SQL Editor
-- =============================================================

-- 1. Adiciona coluna email ao profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Preenche email para usuários já existentes
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id;

-- 3. Atualiza o trigger para salvar email ao criar novo usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    email     = EXCLUDED.email,
    full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recria a view admin_user_view
-- CREATE OR REPLACE não consegue mudar o tipo de uma coluna existente,
-- então derrubamos e recriamos.
DROP VIEW IF EXISTS public.admin_user_view;
CREATE VIEW public.admin_user_view AS
SELECT
  p.id,
  COALESCE(p.email, u.email) AS email,
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

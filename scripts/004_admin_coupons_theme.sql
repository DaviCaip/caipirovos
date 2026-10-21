-- Caipirovos admin: cupons com data de início e tema do site.
-- RODAR NO SQL EDITOR DO SUPABASE ANTES DE PUBLICAR O CÓDIGO. Pode rodar mais de uma vez.

-- Cupons: "vale a partir de" (a data final já existe: expires_at)
alter table public.coupons add column if not exists starts_at timestamptz;

-- Configurações do site (guarda o tema ativo). Sem policy de propósito: só o servidor lê e escreve.
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;

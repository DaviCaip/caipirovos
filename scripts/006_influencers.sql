-- Caipirovos: contas de influencer, cupons associados e data de pagamento.
-- RODAR NO SQL EDITOR DO SUPABASE ANTES DE PUBLICAR O CÓDIGO. Pode rodar mais de uma vez.

-- Contas criadas pelo painel (aba Influencers). A senha NÃO é guardada: só uma impressão digital dela.
create table if not exists public.admin_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  login_hash text not null unique,
  permissions text[] not null default '{}',   -- áreas extras liberadas (além do painel de resultados)
  monthly_goal integer not null default 10,   -- meta de compras por mês (0 = sem meta)
  active boolean not null default true,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);
alter table public.admin_accounts enable row level security;  -- sem policy: só o servidor acessa

-- Cupom pertence (opcionalmente) a um influencer
alter table public.coupons add column if not exists influencer_id uuid references public.admin_accounts(id) on delete set null;
create index if not exists idx_coupons_influencer on public.coupons(influencer_id);

-- Data em que o pagamento foi confirmado (usada nos gráficos do influencer)
alter table public.subscriptions add column if not exists paid_at timestamptz;
create index if not exists idx_subscriptions_coupon_code on public.subscriptions(coupon_code);

-- Caipirovos: contas de equipe (editáveis pelo painel) e cashback.
-- RODAR NO SQL EDITOR DO SUPABASE ANTES DE PUBLICAR O CÓDIGO. Pode rodar mais de uma vez.

-- 1) Tipo da conta: 'influencer' (tem painel de cupom) ou 'team' (só as áreas liberadas)
alter table public.admin_accounts add column if not exists role text not null default 'influencer';
alter table public.admin_accounts drop constraint if exists admin_accounts_role_check;
alter table public.admin_accounts add constraint admin_accounts_role_check check (role in ('influencer', 'team'));

-- 2) Extrato do cashback (cada linha é um crédito ou uma baixa)
create table if not exists public.cashback_ledger (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('card', 'pix', 'adjust')),  -- cartão, Pix ou ajuste manual
  source_id text unique,            -- fatura do Stripe / pagamento Pix: impede dar o crédito duas vezes
  customer_name text,
  customer_email text,
  customer_cpf text,
  stripe_customer_id text,
  stripe_subscription_id text,
  base_cents integer not null default 0,   -- valor pago que gerou o crédito
  percent numeric,                          -- % de cashback usada
  amount_cents integer not null,            -- crédito (+) ou baixa (-)
  applied boolean not null default false,   -- true = já virou desconto automático no Stripe (cartão)
  note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_cashback_ledger_created on public.cashback_ledger(created_at desc);
alter table public.cashback_ledger enable row level security;  -- sem policy: só o servidor acessa

-- Caipirovos: entregas com etapas (aceito, em preparo, saiu para entrega, entregue) e conta de entregador.
-- RODAR NO SQL EDITOR DO SUPABASE ANTES DE PUBLICAR O CÓDIGO. Pode rodar mais de uma vez.

-- 1) Tipo de conta "entregador"
alter table public.admin_accounts add column if not exists role text not null default 'influencer';
alter table public.admin_accounts drop constraint if exists admin_accounts_role_check;
alter table public.admin_accounts add constraint admin_accounts_role_check check (role in ('influencer', 'team', 'courier'));

-- 2) Entregas: cada pagamento confirmado gera uma entrega
create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  subscription_id text not null,                 -- id da assinatura (subscriptions.id)
  source_id text unique,                         -- fatura do Stripe / pagamento Pix / manual: impede entrega em dobro
  status text not null default 'accepted'
    check (status in ('accepted', 'preparing', 'out', 'delivered', 'failed', 'canceled')),
  due_date date not null,                        -- dia previsto da entrega
  courier_id uuid references public.admin_accounts(id) on delete set null,
  courier_name text,
  note text,                                     -- observação do admin
  failed_reason text,
  delivered_to text,                             -- quem recebeu
  accepted_at timestamptz not null default now(),
  preparing_at timestamptz,
  out_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_deliveries_status on public.deliveries(status);
create index if not exists idx_deliveries_due on public.deliveries(due_date);
create index if not exists idx_deliveries_subscription on public.deliveries(subscription_id);
alter table public.deliveries enable row level security;   -- sem policy: só o servidor acessa

-- 3) Histórico de cada mudança de etapa (quem fez e quando)
create table if not exists public.delivery_events (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  status text not null,
  by_name text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists idx_delivery_events_delivery on public.delivery_events(delivery_id);
alter table public.delivery_events enable row level security;

-- Caipirovos: novos dados de entrega, pedidos Pix e cupons.
-- RODAR NO SQL EDITOR DO SUPABASE *ANTES* DE PUBLICAR O CÓDIGO NOVO.
-- É seguro rodar mais de uma vez.

-- 1) Novas colunas em subscriptions
alter table public.subscriptions
  add column if not exists neighborhood text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists reference_point text,
  add column if not exists delivery_day text,
  add column if not exists delivery_period text,
  add column if not exists delivery_instructions text,
  add column if not exists payment_method text,      -- 'card' | 'pix'
  add column if not exists payment_id text,          -- id do pagamento Pix no Mercado Pago
  add column if not exists coupon_code text,
  add column if not exists amount_cents integer,     -- valor do 1º pagamento (já com desconto)
  add column if not exists discount_cents integer default 0;

create index if not exists idx_subscriptions_payment_id on public.subscriptions(payment_id);

-- Pedidos Pix ficam como status 'pending' até o pagamento ser aprovado.
-- Se a tabela tiver uma regra limitando os valores de status, ela é removida aqui (não faz nada se não existir).
alter table public.subscriptions drop constraint if exists subscriptions_status_check;

-- 2) Cupons
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                         -- sempre MAIÚSCULO, ex.: BEMVINDO10
  description text,
  discount_type text not null check (discount_type in ('percent', 'fixed')),
  discount_value integer not null check (discount_value > 0),  -- percent: 1 a 100 | fixed: em centavos
  duration text not null default 'once' check (duration in ('once', 'forever')), -- 'once' = só no 1º pagamento
  active boolean not null default true,
  max_uses integer,                                  -- vazio = ilimitado
  used_count integer not null default 0,
  expires_at timestamptz,                            -- vazio = não expira
  allowed_plans text[],                              -- vazio = todos. Ex.: '{Basic,Raiz}'
  created_at timestamptz not null default now(),
  constraint coupons_percent_max check (discount_type <> 'percent' or discount_value <= 100),
  constraint coupons_code_upper check (code = upper(code))
);

-- Sem nenhuma policy de propósito: só o servidor (service role) lê e altera cupons.
alter table public.coupons enable row level security;

create or replace function public.increment_coupon_use(p_code text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.coupons set used_count = used_count + 1 where code = upper(p_code);
$$;

revoke execute on function public.increment_coupon_use(text) from public, anon, authenticated;
grant execute on function public.increment_coupon_use(text) to service_role;

-- Exemplos (descomente para criar):
-- insert into public.coupons (code, description, discount_type, discount_value) values ('BEMVINDO10', '10% no 1º pagamento', 'percent', 10);
-- insert into public.coupons (code, description, discount_type, discount_value, max_uses) values ('OVO5', 'R$ 5,00 off, 50 usos', 'fixed', 500, 50);

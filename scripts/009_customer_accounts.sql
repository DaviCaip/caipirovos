-- Caipirovos: conta do assinante (CPF + senha), ligação com o Stripe e plano guardado em cada entrega.
-- RODAR NO SQL EDITOR DO SUPABASE ANTES DE PUBLICAR O CÓDIGO. Pode rodar mais de uma vez.

-- 1) Contas dos assinantes. A senha NUNCA é guardada: só uma impressão digital irreversível dela.
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  cpf_digits text not null unique,
  name text not null,
  email text,
  phone text,
  password_hash text not null,
  must_change_password boolean not null default false,   -- true quando a equipe gera uma senha provisória
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);
alter table public.customers enable row level security;   -- sem policy: só o servidor acessa

-- 2) Cadastro que ainda não foi pago: a conta só nasce quando o pagamento é confirmado
create table if not exists public.pending_signups (
  id uuid primary key default gen_random_uuid(),
  cpf_digits text not null,
  name text,
  email text,
  phone text,
  password_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_pending_signups_created on public.pending_signups(created_at);
alter table public.pending_signups enable row level security;

-- 3) Assinaturas: CPF só com números, cliente no Stripe e cadastro de origem
alter table public.subscriptions
  add column if not exists cpf_digits text,
  add column if not exists stripe_customer_id text,
  add column if not exists signup_id uuid;
update public.subscriptions set cpf_digits = regexp_replace(customer_cpf, '\D', '', 'g')
  where cpf_digits is null and customer_cpf is not null;
create index if not exists idx_subscriptions_cpf on public.subscriptions(cpf_digits);

-- 4) Cada entrega guarda o plano do momento (se o cliente trocar de plano, a entrega já paga não muda)
alter table public.deliveries add column if not exists plan_name text;
update public.deliveries d set plan_name = s.plan_name
  from public.subscriptions s
  where d.plan_name is null and d.subscription_id = s.id::text;

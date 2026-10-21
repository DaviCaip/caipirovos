-- Caipirovos: fecha o acesso público às tabelas de clientes.
-- RODAR SÓ DEPOIS de publicar o admin novo e conseguir entrar nele com sua senha.
--
-- Depois disto, só o servidor (service role) lê subscriptions e delivery_history.
-- O admin novo já usa o servidor, então continua funcionando. Pode rodar mais de uma vez.

do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('subscriptions', 'delivery_history')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

alter table public.subscriptions enable row level security;
alter table public.delivery_history enable row level security;

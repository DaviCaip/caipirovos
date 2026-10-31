-- Caipirovos: fecha o acesso público às tabelas de cadastro (revendedores, produtores, lista de espera, pedidos de região).
-- RODAR SÓ DEPOIS de publicar o site novo (v8): ele já grava esses cadastros pelo servidor.
-- Se rodar antes, os formulários do site antigo param de funcionar. Pode rodar mais de uma vez.

do $$
declare t text; r record;
begin
  foreach t in array array['resellers', 'producers', 'waitlist', 'region_requests'] loop
    if to_regclass('public.' || t) is not null then
      for r in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
        execute format('drop policy %I on public.%I', r.policyname, t);
      end loop;
      execute format('alter table public.%I enable row level security', t);
    end if;
  end loop;
end $$;

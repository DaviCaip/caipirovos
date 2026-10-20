-- RODE SÓ DEPOIS de publicar a versão nova do site e confirmar que o /admin funciona.
-- Fecha as tabelas sensíveis: a chave pública do navegador deixa de poder ler/alterar/apagar.
-- (O painel novo e o webhook usam a chave de servidor, que continua funcionando.)

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_history ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename IN ('subscriptions', 'delivery_history')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

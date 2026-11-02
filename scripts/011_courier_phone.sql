-- Caipirovos: telefone do entregador (para a equipe ligar quando uma entrega passar de 24h em rota).
-- RODAR NO SQL EDITOR DO SUPABASE ANTES DE PUBLICAR O CÓDIGO. Pode rodar mais de uma vez.
alter table public.admin_accounts add column if not exists phone text;

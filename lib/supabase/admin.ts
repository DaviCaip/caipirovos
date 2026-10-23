import { createClient } from "@supabase/supabase-js"

// Cliente com service role: usar SOMENTE em código de servidor (rotas /api).
// "no-store": o Next não pode guardar respostas do banco em cache (senão mudanças feitas no painel demoram a aparecer).
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  })
}

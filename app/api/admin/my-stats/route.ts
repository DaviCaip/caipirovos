import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadPurchases } from "@/lib/influencer-stats"

// Resultados dos cupons de UMA conta de influencer.
// - Influencer: só enxerga os próprios (o parâmetro ?account é ignorado).
// - Quem gerencia influencers (Davi): pode abrir o painel de qualquer um com ?account=<id>.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req)
  if ("error" in auth) return auth.error
  const user = auth.user

  const supabase = createAdminClient()
  const requested = req.nextUrl.searchParams.get("account")

  let accountId: string | null = null
  if (requested && user.permissions.includes("influencers")) accountId = requested
  else if (user.kind === "db" && user.permissions.includes("my_stats")) accountId = user.id ?? null
  else if (!user.permissions.includes("influencers")) {
    return NextResponse.json({ error: "Sua senha não dá acesso a esta área." }, { status: 403 })
  }
  if (!accountId) return NextResponse.json({ error: "Escolha um influencer." }, { status: 400 })

  const { data: account } = await supabase.from("admin_accounts").select("id, name, monthly_goal").eq("id", accountId).maybeSingle()
  if (!account) return NextResponse.json({ error: "Influencer não encontrado." }, { status: 404 })

  const { data: coupons } = await supabase
    .from("coupons")
    .select("code, discount_type, discount_value, active, starts_at, expires_at, max_uses, used_count")
    .eq("influencer_id", accountId)
    .order("created_at", { ascending: false })

  const purchases = await loadPurchases((coupons || []).map((c) => c.code))

  return NextResponse.json({
    account: { id: account.id, name: account.name, monthlyGoal: account.monthly_goal },
    coupons: coupons || [],
    purchases,
    now: new Date().toISOString(),
  })
}

import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { getDeliveryDays } from "@/lib/plans"

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req, "subscriptions")
  if ("error" in auth) return auth.error

  const supabase = createAdminClient()
  const { data: subscriptions, error } = await supabase
    .from("subscriptions")
    .select("*")
    .order("created_at", { ascending: false })
  const { data: history } = await supabase.from("delivery_history").select("*").order("delivered_at", { ascending: false })
  if (error) return NextResponse.json({ error: "Não foi possível carregar as assinaturas." }, { status: 500 })

  return NextResponse.json({ subscriptions: subscriptions || [], history: history || [] })
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req, "subscriptions")
  if ("error" in auth) return auth.error

  const { action, id } = await req.json().catch(() => ({}))
  if (typeof id !== "string" || !id) return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 })

  const supabase = createAdminClient()

  if (action === "deliver") {
    const { data: sub } = await supabase.from("subscriptions").select("plan_name").eq("id", id).maybeSingle()
    if (!sub) return NextResponse.json({ error: "Assinatura não encontrada." }, { status: 404 })

    const now = new Date()
    const next = new Date(now)
    next.setDate(next.getDate() + getDeliveryDays(sub.plan_name))

    const { error } = await supabase
      .from("subscriptions")
      .update({ last_delivered_at: now.toISOString(), next_delivery_at: next.toISOString() })
      .eq("id", id)
    if (error) return NextResponse.json({ error: "Falha ao marcar entrega." }, { status: 500 })
    await supabase.from("delivery_history").insert({ subscription_id: id, delivered_at: now.toISOString() })
    return NextResponse.json({ ok: true })
  }

  if (action === "clear") {
    const { error } = await supabase
      .from("subscriptions")
      .update({ last_delivered_at: null, next_delivery_at: null })
      .eq("id", id)
    if (error) return NextResponse.json({ error: "Falha ao limpar a entrega." }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 })
}

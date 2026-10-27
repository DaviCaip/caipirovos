import { randomUUID } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { changeDeliveryStatus, createDelivery, loadDeliveryViews } from "@/lib/deliveries"
import { dayKey } from "@/lib/dates"
import { getPlanByName } from "@/lib/plans"
import type { DeliveryStatus } from "@/lib/delivery-status"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// Quadro de entregas (quem gerencia): tudo em aberto + últimos 45 dias, com histórico de cada etapa.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, "deliveries")
  if ("error" in auth) return auth.error

  const supabase = createAdminClient()
  const deliveries = await loadDeliveryViews(supabase, { withEvents: true })
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("id, customer_name, plan_name, neighborhood")
    .eq("status", "active")
    .order("customer_name")
  return NextResponse.json({
    deliveries,
    subscriptions: (subs || []).map((s) => ({
      id: String(s.id),
      name: s.customer_name,
      plan: s.plan_name,
      neighborhood: s.neighborhood || "",
    })),
    today: dayKey(),
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, "deliveries")
  if ("error" in auth) return auth.error

  const b = await req.json().catch(() => ({}))
  const supabase = createAdminClient()

  // Entrega avulsa (exceções, Pix pago fora do site, reposição)
  if (b.action === "create") {
    if (typeof b.subscriptionId !== "string" || !b.subscriptionId) {
      return NextResponse.json({ error: "Escolha a assinatura." }, { status: 400 })
    }
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id, status, delivery_day")
      .eq("id", b.subscriptionId)
      .maybeSingle()
    if (!sub) return NextResponse.json({ error: "Assinatura não encontrada." }, { status: 404 })
    if (sub.status !== "active") return NextResponse.json({ error: "A assinatura não está ativa." }, { status: 400 })
    if (b.dueDate !== undefined && b.dueDate !== "" && !(typeof b.dueDate === "string" && DATE_RE.test(b.dueDate))) {
      return NextResponse.json({ error: "Data inválida." }, { status: 400 })
    }
    const note = typeof b.note === "string" ? b.note.trim().slice(0, 200) : ""
    const r = await createDelivery(supabase, {
      subscriptionId: sub.id,
      sourceId: `manual_${randomUUID()}`,
      preferredDay: sub.delivery_day,
      dueDate: b.dueDate || undefined,
      note: note || "Entrega criada manualmente",
      byName: auth.user.name,
    })
    return NextResponse.json({ ok: true, id: r.id })
  }

  // Rede de segurança: cria a entrega das assinaturas ativas que ainda não têm nenhuma
  // (as que já existiam antes do sistema de entregas, ou se algum aviso de pagamento falhou).
  if (b.action === "backfill") {
    const { data: subs } = await supabase
      .from("subscriptions")
      .select("id, delivery_day, last_delivered_at, next_delivery_at")
      .eq("status", "active")
    const { data: existing } = await supabase.from("deliveries").select("subscription_id").limit(5000)
    const have = new Set((existing || []).map((d) => String(d.subscription_id)))
    const now = Date.now()
    let created = 0
    for (const s of subs || []) {
      if (have.has(String(s.id))) continue
      // quem acabou de receber e ainda não está no prazo da próxima não entra
      if (s.last_delivered_at && s.next_delivery_at && Date.parse(s.next_delivery_at) > now) continue
      const r = await createDelivery(supabase, {
        subscriptionId: s.id,
        sourceId: `backfill_${s.id}`,
        preferredDay: s.delivery_day,
        note: "Criada pela conferência de assinaturas",
        byName: auth.user.name,
      })
      if (r.result === "created") created++
    }
    return NextResponse.json({ ok: true, created })
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 })
}

// Muda a etapa de uma ou várias entregas
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req, "deliveries")
  if ("error" in auth) return auth.error

  const b = await req.json().catch(() => ({}))
  const ids: string[] = Array.isArray(b.ids) ? b.ids : typeof b.id === "string" ? [b.id] : []
  if (ids.length === 0 || ids.length > 100 || ids.some((i) => typeof i !== "string")) {
    return NextResponse.json({ error: "Escolha de 1 a 100 entregas." }, { status: 400 })
  }

  const supabase = createAdminClient()
  const errors: string[] = []
  let done = 0
  for (const id of ids) {
    const r = await changeDeliveryStatus(supabase, {
      id,
      to: b.status as DeliveryStatus,
      user: auth.user,
      asCourier: false,
      note: b.note,
      receivedBy: b.receivedBy,
      reason: b.reason,
    })
    if (r.ok) done++
    else errors.push(r.error)
  }
  if (done === 0) return NextResponse.json({ error: errors[0] || "Nada foi alterado." }, { status: 400 })
  return NextResponse.json({ ok: true, done, errors })
}

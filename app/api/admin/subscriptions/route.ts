import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, verifyUserPassword } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { changeDeliveryStatus, createDelivery } from "@/lib/deliveries"

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, "subscriptions")
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
  const auth = await requireAdmin(req, "subscriptions")
  if ("error" in auth) return auth.error

  const { action, id } = await req.json().catch(() => ({}))
  if (typeof id !== "string" || !id) return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 })

  const supabase = createAdminClient()

  if (action === "deliver") {
    const { data: sub } = await supabase.from("subscriptions").select("delivery_day").eq("id", id).maybeSingle()
    if (!sub) return NextResponse.json({ error: "Assinatura não encontrada." }, { status: 404 })

    // Uma única fonte da verdade: fecha a entrega em aberto desta assinatura (ou registra uma já entregue).
    const { data: open } = await supabase
      .from("deliveries")
      .select("id, status")
      .eq("subscription_id", id)
      .in("status", ["accepted", "preparing", "out", "failed"])
      .order("due_date", { ascending: true })
      .limit(1)
    let deliveryId: string | undefined = open?.[0]?.id
    if (!deliveryId) {
      const created = await createDelivery(supabase, {
        subscriptionId: id,
        sourceId: `manual_${Date.now()}_${id}`,
        preferredDay: sub.delivery_day,
        note: "Registrada pelo botão Marcar entregue",
        byName: auth.user.name,
      })
      deliveryId = created.id
    }
    if (!deliveryId) return NextResponse.json({ error: "Falha ao marcar entrega." }, { status: 500 })
    // quem gerencia pode fechar de qualquer etapa: passa por "saiu para entrega" se ainda não saiu
    if (open?.[0]?.status !== "out") {
      await changeDeliveryStatus(supabase, { id: deliveryId, to: "out", user: auth.user, asCourier: false })
    }
    const r = await changeDeliveryStatus(supabase, { id: deliveryId, to: "delivered", user: auth.user, asCourier: false })
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.httpStatus })
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

// Só quem tem "delete_subscriptions" (a conta "*" tem) pode excluir. Assinatura ATIVA nunca é excluída:
// primeiro ela precisa estar cancelada. Pix pendente só pode ser excluído depois de 2 dias (o Pix ainda pode ser pago).
const PENDING_MIN_DAYS = 2

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req, "delete_subscriptions")
  if ("error" in auth) return auth.error

  const { id, confirmPassword } = await req.json().catch(() => ({}))
  if (typeof id !== "string" || !id) return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 })
  if (!(await verifyUserPassword(auth.user, confirmPassword))) {
    return NextResponse.json({ error: "Senha de confirmação incorreta." }, { status: 403 })
  }

  const supabase = createAdminClient()
  const { data: sub } = await supabase.from("subscriptions").select("status, created_at").eq("id", id).maybeSingle()
  if (!sub) return NextResponse.json({ error: "Assinatura não encontrada." }, { status: 404 })

  if (sub.status === "active") {
    return NextResponse.json({ error: "Esta assinatura está ativa. Só dá para excluir assinaturas não ativas." }, { status: 400 })
  }
  if (sub.status === "pending") {
    const ageDays = (Date.now() - new Date(sub.created_at).getTime()) / 86400000
    if (ageDays < PENDING_MIN_DAYS) {
      return NextResponse.json(
        { error: `Este Pix ainda pode ser pago. Espere ${PENDING_MIN_DAYS} dias para poder excluir.` },
        { status: 400 }
      )
    }
  }

  await supabase.from("delivery_history").delete().eq("subscription_id", id)
  await supabase.from("deliveries").delete().eq("subscription_id", id)
  const { error } = await supabase.from("subscriptions").delete().eq("id", id)
  if (error) return NextResponse.json({ error: "Não foi possível excluir." }, { status: 500 })
  return NextResponse.json({ ok: true })
}

import { NextRequest, NextResponse } from "next/server"
import { adminDb, checkPassword, hasSession } from "@/lib/admin-auth"
import { isSameOrigin } from "@/lib/security"

const TABLES = ["subscriptions", "resellers", "producers"]

function daysForPlan(planName: string) {
  const plan = (planName || "").toLowerCase()
  return plan.includes("raiz") || plan.includes("colheita") ? 15 : 7
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origem inválida" }, { status: 403 })
  if (!hasSession(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body.id !== "string") return NextResponse.json({ error: "Pedido inválido" }, { status: 400 })

  const db = adminDb()

  if (body.op === "markDelivered" || body.op === "clearDelivery") {
    const { data: sub } = await db.from("subscriptions").select("id, plan_name").eq("id", body.id).single()
    if (!sub) return NextResponse.json({ error: "Assinatura não encontrada" }, { status: 404 })

    if (body.op === "clearDelivery") {
      const { error } = await db.from("subscriptions").update({ last_delivered_at: null, next_delivery_at: null }).eq("id", sub.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    const now = new Date()
    const next = new Date(now)
    next.setDate(next.getDate() + daysForPlan(sub.plan_name))
    const upd = await db.from("subscriptions").update({ last_delivered_at: now.toISOString(), next_delivery_at: next.toISOString() }).eq("id", sub.id)
    const ins = await db.from("delivery_history").insert({ subscription_id: sub.id, delivered_at: now.toISOString() })
    const error = upd.error || ins.error
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.op === "delete" || body.op === "update") {
    if (!checkPassword(body.confirmPassword)) return NextResponse.json({ error: "Senha incorreta!" }, { status: 403 })
    if (!TABLES.includes(body.table)) return NextResponse.json({ error: "Tabela inválida" }, { status: 400 })

    if (body.op === "delete") {
      const { error } = await db.from(body.table).delete().eq("id", body.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { id, created_at, updated_at, ...fields } = body.data ?? {}
      const { error } = await db.from(body.table).update(fields).eq("id", body.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: "Ação desconhecida" }, { status: 400 })
}

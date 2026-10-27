import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { changeDeliveryStatus, loadDeliveryViews } from "@/lib/deliveries"
import { dayKey } from "@/lib/dates"
import { isOpen, type DeliveryStatus } from "@/lib/delivery-status"

// App do entregador. O entregador só enxerga o necessário para entregar:
// nome, telefone, endereço, referência, instruções e o plano. Nunca CPF, e-mail nem valores.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, "courier")
  if ("error" in auth) return auth.error

  const today = dayKey()
  const views = await loadDeliveryViews(createAdminClient(), { withEvents: false })
  const deliveries = views.filter((d) => isOpen(d.status) || (d.status === "delivered" && d.deliveredAt && dayKey(d.deliveredAt) === today))
  return NextResponse.json({ deliveries, today, me: { id: auth.user.id ?? null, name: auth.user.name } })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req, "courier")
  if ("error" in auth) return auth.error

  const b = await req.json().catch(() => ({}))
  if (typeof b.id !== "string" || !b.id) return NextResponse.json({ error: "Entrega inválida." }, { status: 400 })

  const r = await changeDeliveryStatus(createAdminClient(), {
    id: b.id,
    to: b.status as DeliveryStatus,
    user: auth.user,
    asCourier: true, // o entregador só anda para frente (sair, entregar, não conseguir)
    note: b.note,
    receivedBy: b.receivedBy,
    reason: b.reason,
  })
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.httpStatus })
  return NextResponse.json({ ok: true, status: r.status })
}

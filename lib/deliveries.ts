import type { SupabaseClient } from "@supabase/supabase-js"
import type { AdminUser } from "@/lib/admin-auth"
import { addDays, dayKey, weekdayOf, WEEKDAY_NUMBER } from "@/lib/dates"
import { COURIER_TRANSITIONS, MANAGER_TRANSITIONS, STATUS_INFO, type DeliveryStatus } from "@/lib/delivery-status"
import { getDeliveryDays, getPlanByName } from "@/lib/plans"

// Cada pagamento confirmado gera UMA entrega (uma por mês por assinatura):
//  - cartão: a cada fatura paga no Stripe;
//  - Pix: quando o Mercado Pago confirma;
//  - manual: criada pelo admin (exceções, Pix pago fora do site).
// Assim a entrega nasce sozinha e ninguém precisa lembrar.

/** Dias entre o pagamento e o primeiro dia possível de entrega (tempo para separar os ovos). */
export const LEAD_DAYS = 1

/** Próximo dia de entrega: respeita o dia da semana que o cliente escolheu e nunca cai no domingo. */
export function computeDueDate(preferredDay: string | null | undefined, nowMs: number = Date.now()): string {
  let day = addDays(dayKey(nowMs), LEAD_DAYS)
  const wanted = preferredDay ? WEEKDAY_NUMBER[preferredDay] : undefined
  for (let i = 0; i < 7; i++) {
    const wd = weekdayOf(day)
    if (wanted !== undefined ? wd === wanted : wd !== 0) break
    day = addDays(day, 1)
  }
  return day
}

export async function createDelivery(
  supabase: SupabaseClient,
  a: {
    subscriptionId: string | number
    sourceId: string
    preferredDay?: string | null
    dueDate?: string
    note?: string
    byName?: string
  }
): Promise<{ result: "created" | "duplicate"; id?: string }> {
  const { data, error } = await supabase
    .from("deliveries")
    .insert({
      subscription_id: String(a.subscriptionId),
      source_id: a.sourceId,
      due_date: a.dueDate || computeDueDate(a.preferredDay),
      note: a.note || null,
    })
    .select("id")
    .single()
  if (error) {
    if ((error as any).code === "23505") return { result: "duplicate" }
    throw error
  }
  await supabase
    .from("delivery_events")
    .insert({ delivery_id: data.id, status: "accepted", by_name: a.byName || "Sistema", note: a.note || null })
  return { result: "created", id: data.id }
}

export type ChangeResult = { ok: true; status: DeliveryStatus } | { ok: false; httpStatus: number; error: string }

/** Muda a etapa de uma entrega, respeitando quem pode fazer o quê, e mantém a assinatura em dia. */
export async function changeDeliveryStatus(
  supabase: SupabaseClient,
  args: {
    id: string
    to: DeliveryStatus
    user: AdminUser
    asCourier: boolean
    note?: string
    receivedBy?: string
    reason?: string
  }
): Promise<ChangeResult> {
  const { id, to, user, asCourier } = args
  if (!(to in STATUS_INFO)) return { ok: false, httpStatus: 400, error: "Etapa inválida." }

  const { data: d } = await supabase.from("deliveries").select("*").eq("id", id).maybeSingle()
  if (!d) return { ok: false, httpStatus: 404, error: "Entrega não encontrada." }

  const allowed = (asCourier ? COURIER_TRANSITIONS : MANAGER_TRANSITIONS)[d.status as DeliveryStatus] || []
  if (!allowed.includes(to)) {
    return {
      ok: false,
      httpStatus: 400,
      error: `Não dá para ir de "${STATUS_INFO[d.status as DeliveryStatus]?.label}" para "${STATUS_INFO[to].label}".`,
    }
  }
  // Uma entrega que já saiu fica com o entregador que a pegou (quem gerencia pode mexer em qualquer uma).
  if (asCourier && d.status === "out" && d.courier_id && d.courier_id !== user.id) {
    return { ok: false, httpStatus: 403, error: "Esta entrega está com outro entregador." }
  }

  const note = (args.note || "").trim().slice(0, 200)
  const reason = (args.reason || "").trim().slice(0, 200)
  const receivedBy = (args.receivedBy || "").trim().slice(0, 100)
  if (to === "failed" && !reason) return { ok: false, httpStatus: 400, error: "Informe o motivo." }

  const nowIso = new Date().toISOString()
  const reset = { preparing_at: null, out_at: null, delivered_at: null, failed_at: null }
  let patch: Record<string, unknown>
  let eventNote = note
  switch (to) {
    case "accepted":
      patch = { ...reset, courier_id: null, courier_name: null, failed_reason: null, delivered_to: null }
      break
    case "preparing":
      patch = { ...reset, preparing_at: nowIso, courier_id: null, courier_name: null, failed_reason: null }
      break
    case "out":
      patch = {
        out_at: nowIso,
        delivered_at: null,
        failed_at: null,
        failed_reason: null,
        delivered_to: null,
        courier_id: user.kind === "db" ? (user.id ?? null) : null,
        courier_name: user.name,
      }
      break
    case "delivered":
      patch = {
        delivered_at: nowIso,
        delivered_to: receivedBy || null,
        courier_id: d.courier_id ?? (user.kind === "db" ? (user.id ?? null) : null),
        courier_name: d.courier_name ?? user.name,
      }
      eventNote = [receivedBy && `Recebido por ${receivedBy}`, note].filter(Boolean).join(" · ")
      break
    case "failed":
      patch = { failed_at: nowIso, failed_reason: reason }
      eventNote = [reason, note].filter(Boolean).join(" · ")
      break
    default: // canceled
      patch = {}
  }

  const { error } = await supabase.from("deliveries").update({ status: to, ...patch }).eq("id", id)
  if (error) return { ok: false, httpStatus: 500, error: "Não foi possível salvar." }
  await supabase.from("delivery_events").insert({ delivery_id: id, status: to, by_name: user.name, note: eventNote || null })

  // Mantém "última/próxima entrega" e o histórico da assinatura sempre coerentes com as entregas.
  const sid = d.subscription_id as string
  if (to === "delivered") {
    const { data: sub } = await supabase.from("subscriptions").select("plan_name").eq("id", sid).maybeSingle()
    const next = new Date(nowIso)
    next.setDate(next.getDate() + getDeliveryDays(sub?.plan_name))
    await supabase.from("subscriptions").update({ last_delivered_at: nowIso, next_delivery_at: next.toISOString() }).eq("id", sid)
    await supabase.from("delivery_history").insert({ subscription_id: sid, delivered_at: nowIso })
  } else if (d.status === "delivered") {
    // "Entregue" desfeito: tira do histórico e volta a data da última entrega para a anterior
    if (d.delivered_at) await supabase.from("delivery_history").delete().eq("subscription_id", sid).eq("delivered_at", d.delivered_at)
    const { data: prev } = await supabase
      .from("deliveries")
      .select("delivered_at")
      .eq("subscription_id", sid)
      .eq("status", "delivered")
      .order("delivered_at", { ascending: false })
      .limit(1)
    const last: string | null = prev?.[0]?.delivered_at ?? null
    const { data: sub } = await supabase.from("subscriptions").select("plan_name").eq("id", sid).maybeSingle()
    let nextIso: string | null = null
    if (last) {
      const n = new Date(last)
      n.setDate(n.getDate() + getDeliveryDays(sub?.plan_name))
      nextIso = n.toISOString()
    }
    await supabase.from("subscriptions").update({ last_delivered_at: last, next_delivery_at: nextIso }).eq("id", sid)
  }
  return { ok: true, status: to }
}

// ---------- leitura do quadro ----------

export interface DeliveryView {
  id: string
  status: DeliveryStatus
  dueDate: string
  createdAt: string
  preparingAt: string | null
  outAt: string | null
  deliveredAt: string | null
  failedAt: string | null
  failedReason: string | null
  deliveredTo: string | null
  note: string | null
  courierName: string | null
  subscriptionId: string
  customer: {
    name: string
    phone: string
    plan: string
    eggs: number
    trays: number
    street: string
    number: string
    neighborhood: string
    city: string
    cep: string
    complement: string
    reference: string
    preferredDay: string
    preferredPeriod: string
    instructions: string
  }
  events?: { status: string; by: string | null; note: string | null; at: string }[]
}

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size))
  return out
}

const HISTORY_DAYS = 45

/** Entregas em aberto + as concluídas/canceladas dos últimos 45 dias, já com os dados do cliente. */
export async function loadDeliveryViews(supabase: SupabaseClient, opts: { withEvents: boolean }): Promise<DeliveryView[]> {
  const { data: all } = await supabase.from("deliveries").select("*").order("created_at", { ascending: false }).limit(2000)
  const since = Date.now() - HISTORY_DAYS * 86400000
  const rows = (all || []).filter(
    (d: any) =>
      d.status === "accepted" ||
      d.status === "preparing" ||
      d.status === "out" ||
      d.status === "failed" ||
      Date.parse(d.delivered_at || d.created_at) >= since
  )
  if (rows.length === 0) return []

  const subs = new Map<string, any>()
  for (const ids of chunk(Array.from(new Set(rows.map((r: any) => r.subscription_id as string))), 80)) {
    const { data } = await supabase
      .from("subscriptions")
      .select(
        "id, customer_name, customer_phone, plan_name, street, number, neighborhood, city, cep, observation, reference_point, delivery_day, delivery_period, delivery_instructions"
      )
      .in("id", ids)
    for (const s of data || []) subs.set(String(s.id), s)
  }

  const events = new Map<string, any[]>()
  if (opts.withEvents) {
    for (const ids of chunk(rows.map((r: any) => r.id as string), 80)) {
      const { data } = await supabase.from("delivery_events").select("delivery_id, status, by_name, note, created_at").in("delivery_id", ids)
      for (const e of data || []) {
        const list = events.get(e.delivery_id) ?? []
        list.push(e)
        events.set(e.delivery_id, list)
      }
    }
  }

  return rows.map((d: any): DeliveryView => {
    const s = subs.get(String(d.subscription_id)) ?? {}
    const eggs = getPlanByName(s.plan_name)?.eggs ?? 0
    return {
      id: d.id,
      status: d.status,
      dueDate: d.due_date,
      createdAt: d.created_at,
      preparingAt: d.preparing_at,
      outAt: d.out_at,
      deliveredAt: d.delivered_at,
      failedAt: d.failed_at,
      failedReason: d.failed_reason,
      deliveredTo: d.delivered_to,
      note: d.note,
      courierName: d.courier_name,
      subscriptionId: String(d.subscription_id),
      customer: {
        name: s.customer_name || "Cliente",
        phone: s.customer_phone || "",
        plan: s.plan_name || "",
        eggs,
        trays: eggs / 30,
        street: s.street || "",
        number: s.number || "",
        neighborhood: s.neighborhood || "",
        city: s.city || "Feira de Santana",
        cep: s.cep || "",
        complement: s.observation || "",
        reference: s.reference_point || "",
        preferredDay: s.delivery_day || "",
        preferredPeriod: s.delivery_period || "",
        instructions: s.delivery_instructions || "",
      },
      ...(opts.withEvents
        ? {
            events: (events.get(d.id) || [])
              .sort((a, b) => (a.created_at > b.created_at ? 1 : -1))
              .map((e) => ({ status: e.status, by: e.by_name, note: e.note, at: e.created_at })),
          }
        : {}),
    }
  })
}

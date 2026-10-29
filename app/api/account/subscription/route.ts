import { NextRequest, NextResponse } from "next/server"
import type Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStripe } from "@/lib/stripe"
import { requireCustomer } from "@/lib/customer-auth"
import { visibleSubscriptions } from "@/lib/customers"
import { getPlanByName, type Plan } from "@/lib/plans"

const PRODUCTS_KEY = "stripe_products"

/** Um "produto" no Stripe por plano (o preço da assinatura precisa de um). Criado na primeira troca e guardado. */
async function getProductId(stripe: Stripe, plan: Plan): Promise<string> {
  const supabase = createAdminClient()
  const { data } = await supabase.from("site_settings").select("value").eq("key", PRODUCTS_KEY).maybeSingle()
  const map: Record<string, string> = (data?.value as any) || {}
  if (map[plan.id]) return map[plan.id]
  const product = await stripe.products.create({ name: `Assinatura Caipirovos - ${plan.name}`, metadata: { plan: plan.id } })
  await supabase
    .from("site_settings")
    .upsert({ key: PRODUCTS_KEY, value: { ...map, [plan.id]: product.id }, updated_at: new Date().toISOString() }, { onConflict: "key" })
  return product.id
}

const periodEndOf = (sub: Stripe.Subscription) => {
  const end = sub.items?.data?.[0]?.current_period_end
  return end ? new Date(end * 1000).toISOString() : null
}

// Ações do assinante sobre uma assinatura no CARTÃO: cancelar no fim do período, retomar, trocar de plano, abrir o portal do cartão.
export async function POST(req: NextRequest) {
  const auth = await requireCustomer(req)
  if ("error" in auth) return auth.error

  const b = await req.json().catch(() => ({}))
  const supabase = createAdminClient()
  const subs = await visibleSubscriptions(supabase, auth.customer)
  const sub = subs.find((s) => String(s.id) === String(b.subscriptionId))
  if (!sub) return NextResponse.json({ error: "Assinatura não encontrada." }, { status: 404 })
  if (!sub.stripe_subscription_id || sub.status !== "active") {
    return NextResponse.json({ error: "Esta ação vale só para assinaturas ativas no cartão." }, { status: 400 })
  }

  const stripe = getStripe()
  const sid: string = sub.stripe_subscription_id
  try {
    if (b.action === "cancel" || b.action === "resume") {
      const updated = await stripe.subscriptions.update(sid, { cancel_at_period_end: b.action === "cancel" })
      return NextResponse.json({ ok: true, cancelAtPeriodEnd: !!updated.cancel_at_period_end, periodEnd: periodEndOf(updated) })
    }

    if (b.action === "change_plan") {
      const plan = getPlanByName(b.plan)
      if (!plan) return NextResponse.json({ error: "Plano inválido." }, { status: 400 })
      if (plan.name === sub.plan_name) return NextResponse.json({ error: "Você já está neste plano." }, { status: 400 })

      const current = await stripe.subscriptions.retrieve(sid)
      const item = current.items?.data?.[0]
      if (!item) return NextResponse.json({ error: "Não foi possível trocar o plano agora." }, { status: 400 })
      const product = await getProductId(stripe, plan)

      // Vale a partir da próxima cobrança: sem cobrar nem devolver diferença agora.
      const updated = await stripe.subscriptions.update(sid, {
        items: [
          {
            id: item.id,
            price_data: { currency: "brl", product, unit_amount: plan.priceInCents, recurring: { interval: "month" } },
          },
        ],
        proration_behavior: "none",
      })
      await supabase.from("subscriptions").update({ plan_name: plan.name }).eq("id", sub.id)
      return NextResponse.json({ ok: true, plan: plan.name, effectiveFrom: periodEndOf(updated) })
    }

    if (b.action === "portal") {
      let customerId: string | null = sub.stripe_customer_id || null
      if (!customerId) {
        const s = await stripe.subscriptions.retrieve(sid)
        customerId = typeof s.customer === "string" ? s.customer : s.customer.id
        await supabase.from("subscriptions").update({ stripe_customer_id: customerId }).eq("id", sub.id)
      }
      const session = await stripe.billingPortal.sessions.create({ customer: customerId, return_url: `${req.nextUrl.origin}/conta` })
      return NextResponse.json({ ok: true, url: session.url })
    }
  } catch (e: any) {
    console.error("Conta do assinante: erro no Stripe:", e?.message || e)
    const msg =
      b.action === "portal"
        ? "O portal do cartão ainda não está disponível. Fale com a equipe pelo WhatsApp."
        : b.action === "resume"
          ? "Esta assinatura já foi encerrada. Faça uma nova assinatura."
          : "Não foi possível concluir agora. Tente de novo ou fale com a equipe."
    return NextResponse.json({ error: msg }, { status: 400 })
  }
  return NextResponse.json({ error: "Ação inválida." }, { status: 400 })
}

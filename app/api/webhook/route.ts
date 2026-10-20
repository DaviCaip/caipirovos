import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { DELIVERY_CITY, DELIVERY_STATE } from "@/lib/delivery"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return NextResponse.json({ error: "Webhook error" }, { status: 400 })
  }

  const supabase = createAdminClient()

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const m = session.metadata || {}
    const subscriptionId = session.subscription as string

    // Se o Stripe reenviar o mesmo evento, não contamos o cupom duas vezes.
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("stripe_subscription_id", subscriptionId)
      .maybeSingle()

    const { error } = await supabase.from("subscriptions").upsert(
      {
        stripe_subscription_id: subscriptionId,
        customer_name: m.customerName,
        customer_email: session.customer_email || session.customer_details?.email || m.customerEmail || null,
        customer_phone: m.customerPhone,
        customer_cpf: m.customerCpf,
        plan_name: m.planName,
        status: "active",
        cep: m.cep,
        street: m.street,
        number: m.number,
        observation: m.complement || m.observation || "",
        neighborhood: m.neighborhood || null,
        city: DELIVERY_CITY,
        state: DELIVERY_STATE,
        reference_point: m.reference || null,
        delivery_day: m.deliveryDay || null,
        delivery_period: m.deliveryPeriod || null,
        delivery_instructions: m.instructions || null,
        payment_method: "card",
        coupon_code: m.couponCode || null,
        discount_cents: Number(m.discountCents || 0),
        amount_cents: Number(m.amountCents || 0),
      },
      { onConflict: "stripe_subscription_id" }
    )

    if (error) {
      // 500 faz o Stripe tentar de novo, em vez de perder o assinante em silêncio.
      console.error("Webhook Stripe: falha ao salvar assinatura:", error.message)
      return NextResponse.json({ error: "Falha ao salvar" }, { status: 500 })
    }

    if (!existing && m.couponCode) {
      await supabase.rpc("increment_coupon_use", { p_code: m.couponCode })
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription
    await supabase.from("subscriptions").update({ status: "canceled" }).eq("stripe_subscription_id", subscription.id)
  }

  return NextResponse.json({ received: true })
}

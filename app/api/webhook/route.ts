import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getStripe } from "@/lib/stripe"
import { onlyDigits } from "@/lib/br"
import { ensureCustomerAccount } from "@/lib/customers"
import { createAdminClient } from "@/lib/supabase/admin"
import { DELIVERY_CITY, DELIVERY_STATE } from "@/lib/delivery"
import { getCashbackSettings, grantCardCashback } from "@/lib/cashback"
import { createDelivery } from "@/lib/deliveries"

const stripe = getStripe()

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
        cpf_digits: onlyDigits(m.customerCpf || "") || null,
        stripe_customer_id: typeof session.customer === "string" ? session.customer : (session.customer?.id ?? null),
        signup_id: m.signupId || null,
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
        ...(existing ? {} : { paid_at: new Date().toISOString() }),
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

    // A primeira entrega nasce junto com o primeiro pagamento. (Se falhar, não derruba o pagamento:
    // a conferência no painel de Entregas recria as que ficaram faltando.)
    try {
      const { data: subRow } = await supabase
        .from("subscriptions")
        .select("id, delivery_day")
        .eq("stripe_subscription_id", subscriptionId)
        .maybeSingle()
      if (subRow) {
        const inv = typeof session.invoice === "string" ? session.invoice : (session.invoice?.id ?? null)
        await createDelivery(supabase, {
          subscriptionId: subRow.id,
          sourceId: inv ? `inv_${inv}` : `sub_${subscriptionId}_first`,
          preferredDay: subRow.delivery_day,
        })
      }
    } catch (err: any) {
      console.error("Webhook Stripe: falha ao criar a entrega:", err?.message || err)
    }

    // Pagamento confirmado: cria a conta do assinante (CPF + a senha que ele escolheu), se ainda não existir.
    try {
      await ensureCustomerAccount(supabase, {
        cpf: m.customerCpf,
        name: m.customerName,
        email: session.customer_email || session.customer_details?.email || m.customerEmail || null,
        phone: m.customerPhone,
        signupId: m.signupId,
      })
    } catch (err: any) {
      console.error("Webhook Stripe: falha ao criar a conta do assinante:", err?.message || err)
    }
  }

  // Cashback no cartão: a cada fatura paga, o cliente ganha crédito que o Stripe desconta da próxima fatura.
  // (Precisa do evento "invoice.paid" ligado no webhook do Stripe. Sem ele, nada acontece.)
  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice
    const customer = invoice.customer
    const sub = invoice.parent?.subscription_details?.subscription
    try {
      const settings = await getCashbackSettings(supabase)
      await grantCardCashback({
        supabase,
        stripe,
        settings,
        invoice: {
          invoiceId: invoice.id as string,
          invoiceNumber: invoice.number,
          amountPaidCents: invoice.amount_paid,
          stripeCustomerId: typeof customer === "string" ? customer : (customer?.id ?? null),
          stripeSubscriptionId: typeof sub === "string" ? sub : (sub?.id ?? null),
          email: invoice.customer_email,
          name: invoice.customer_name,
        },
      })
    } catch (err: any) {
      console.error("Webhook Stripe: falha no cashback:", err?.message || err)
      return NextResponse.json({ error: "Falha no cashback" }, { status: 500 })
    }

    // Cada mês pago (renovação do cartão) gera a entrega daquele mês.
    // O mesmo código "inv_<fatura>" evita entrega em dobro quando o primeiro pagamento chega pelos dois avisos.
    const reason = invoice.billing_reason
    const stripeSubId = typeof sub === "string" ? sub : (sub?.id ?? null)
    if ((reason === "subscription_cycle" || reason === "subscription_create") && stripeSubId && invoice.id) {
      try {
        const { data: subRow } = await supabase
          .from("subscriptions")
          .select("id, delivery_day")
          .eq("stripe_subscription_id", stripeSubId)
          .maybeSingle()
        if (subRow) {
          await createDelivery(supabase, {
            subscriptionId: subRow.id,
            sourceId: `inv_${invoice.id}`,
            preferredDay: subRow.delivery_day,
          })
        }
      } catch (err: any) {
        console.error("Webhook Stripe: falha ao criar a entrega da renovação:", err?.message || err)
      }
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription
    await supabase.from("subscriptions").update({ status: "canceled" }).eq("stripe_subscription_id", subscription.id)
  }

  return NextResponse.json({ received: true })
}

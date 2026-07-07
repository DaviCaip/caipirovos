import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")!

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return NextResponse.json({ error: "Webhook error" }, { status: 400 })
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session
    const metadata = session.metadata || {}

    await supabase.from("subscriptions").upsert({
      stripe_subscription_id: session.subscription as string,
      customer_name: metadata.customerName,
      customer_email: session.customer_email,
      customer_phone: metadata.customerPhone,
      customer_cpf: metadata.customerCpf,
      plan_name: metadata.planName,
      status: "active",
      cep: metadata.cep,
      street: metadata.street,
      number: metadata.number,
      observation: metadata.observation,
    }, { onConflict: "stripe_subscription_id" })
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription
    await supabase
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("stripe_subscription_id", subscription.id)
  }

  return NextResponse.json({ received: true })
}

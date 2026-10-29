import { NextRequest, NextResponse } from "next/server"
import { MercadoPagoConfig, Payment } from "mercadopago"
import { createAdminClient } from "@/lib/supabase/admin"
import { onlyDigits } from "@/lib/br"
import { requireCustomer } from "@/lib/customer-auth"
import { visibleSubscriptions } from "@/lib/customers"
import { getPlanByName } from "@/lib/plans"
import { sendOrderNotification } from "@/lib/notify"
import { DELIVERY_CITY, DELIVERY_STATE } from "@/lib/delivery"

const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN! })

// "Gerar Pix do próximo mês": novo pagamento com os mesmos dados da assinatura (pode escolher outro plano).
export async function POST(req: NextRequest) {
  const auth = await requireCustomer(req)
  if ("error" in auth) return auth.error

  const b = await req.json().catch(() => ({}))
  const supabase = createAdminClient()
  const subs = await visibleSubscriptions(supabase, auth.customer)
  const base = subs.find((s) => String(s.id) === String(b.subscriptionId))
  if (!base) return NextResponse.json({ error: "Assinatura não encontrada." }, { status: 404 })

  const plan = getPlanByName(b.plan || base.plan_name)
  if (!plan) return NextResponse.json({ error: "Plano inválido." }, { status: 400 })

  // evita gerar vários Pix seguidos sem querer (o QR Code anterior ainda vale)
  const recent = subs.find((s) => s.status === "pending" && !s.stripe_subscription_id && Date.now() - Date.parse(s.created_at) < 30 * 60000)
  if (recent) {
    return NextResponse.json({ error: "Você já gerou um Pix há pouco e ele ainda está aguardando pagamento. Se precisar de ajuda, fale com a equipe." }, { status: 429 })
  }

  try {
    const [first, ...rest] = String(base.customer_name || "Cliente").split(/\s+/)
    const result = await new Payment(client).create({
      body: {
        transaction_amount: plan.priceInCents / 100,
        description: `Assinatura Caipirovos - ${plan.name}`,
        payment_method_id: "pix",
        ...(req.nextUrl.origin.startsWith("https://") ? { notification_url: `${req.nextUrl.origin}/api/pix-webhook` } : {}),
        payer: {
          email: base.customer_email,
          first_name: first,
          last_name: rest.join(" ") || first,
          identification: { type: "CPF", number: onlyDigits(base.customer_cpf || "") },
        },
      },
    })
    const qrCode = result.point_of_interaction?.transaction_data?.qr_code
    const qrCodeBase64 = result.point_of_interaction?.transaction_data?.qr_code_base64
    if (!qrCode) return NextResponse.json({ error: "Não foi possível gerar o Pix." }, { status: 400 })

    const { error } = await supabase.from("subscriptions").insert({
      customer_name: base.customer_name,
      customer_email: base.customer_email,
      customer_phone: base.customer_phone,
      customer_cpf: base.customer_cpf,
      cpf_digits: base.cpf_digits,
      plan_name: plan.name,
      status: "pending",
      cep: base.cep,
      street: base.street,
      number: base.number,
      observation: base.observation,
      neighborhood: base.neighborhood,
      city: base.city || DELIVERY_CITY,
      state: base.state || DELIVERY_STATE,
      reference_point: base.reference_point,
      delivery_day: base.delivery_day,
      delivery_period: base.delivery_period,
      delivery_instructions: base.delivery_instructions,
      payment_method: "pix",
      payment_id: String(result.id),
      amount_cents: plan.priceInCents,
      discount_cents: 0,
    })
    if (error) console.error("Renovação Pix: Pix gerado, mas falhou ao salvar o pedido:", error.message)

    await sendOrderNotification({
      planName: plan.name,
      paymentMethod: "Pix",
      delivery: {
        name: base.customer_name || "",
        phone: base.customer_phone || "",
        email: base.customer_email || "",
        cpf: base.customer_cpf || "",
        cep: base.cep || "",
        street: base.street || "",
        number: base.number || "",
        neighborhood: base.neighborhood || "",
        complement: base.observation || "",
        reference: base.reference_point || "",
        deliveryDay: base.delivery_day || "",
        deliveryPeriod: base.delivery_period || "",
        instructions: base.delivery_instructions || "",
      },
      discountCents: 0,
      amountCents: plan.priceInCents,
    })

    return NextResponse.json({ qrCode, qrCodeBase64, paymentId: result.id, amountCents: plan.priceInCents })
  } catch (e: any) {
    console.error("Renovação Pix: erro:", JSON.stringify(e?.cause || e?.message || e))
    return NextResponse.json({ error: "Não foi possível gerar o Pix." }, { status: 400 })
  }
}

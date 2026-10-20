import { NextRequest, NextResponse } from "next/server"
import { MercadoPagoConfig, Payment } from "mercadopago"
import { getPlanByName } from "@/lib/plans"
import { DELIVERY_CITY, DELIVERY_STATE, sanitizeDelivery, validateDelivery } from "@/lib/delivery"
import { resolveCoupon } from "@/lib/coupons"
import { sendOrderNotification } from "@/lib/notify"
import { createAdminClient } from "@/lib/supabase/admin"
import { onlyDigits } from "@/lib/br"

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // O valor vem SEMPRE do servidor, nunca do navegador.
    const plan = getPlanByName(body?.planName)
    if (!plan) return NextResponse.json({ error: "Plano inválido." }, { status: 400 })

    const delivery = sanitizeDelivery(body?.delivery)
    const fieldErrors = validateDelivery(delivery)
    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ error: "Confira os dados de entrega.", fields: fieldErrors }, { status: 400 })
    }

    const coupon = await resolveCoupon(body?.couponCode, plan)
    if (coupon && !coupon.ok) return NextResponse.json({ error: coupon.error }, { status: 400 })

    const discountCents = coupon?.ok ? coupon.discountCents : 0
    const amountCents = coupon?.ok ? coupon.finalCents : plan.priceInCents
    const couponCode = coupon?.ok ? coupon.coupon.code : ""

    const origin = req.nextUrl.origin
    const canNotify = origin.startsWith("https://") && !origin.includes("localhost")
    const [firstName, ...rest] = delivery.name.split(/\s+/)

    const payment = new Payment(client)
    const result = await payment.create({
      body: {
        transaction_amount: amountCents / 100,
        description: `Assinatura Caipirovos - ${plan.name}`,
        payment_method_id: "pix",
        ...(canNotify ? { notification_url: `${origin}/api/pix-webhook` } : {}),
        payer: {
          email: delivery.email,
          first_name: firstName,
          last_name: rest.join(" ") || firstName,
          identification: { type: "CPF", number: onlyDigits(delivery.cpf) },
        },
      },
    })

    const qrCode = result.point_of_interaction?.transaction_data?.qr_code
    const qrCodeBase64 = result.point_of_interaction?.transaction_data?.qr_code_base64
    if (!qrCode) return NextResponse.json({ error: "Erro ao gerar Pix." }, { status: 400 })

    // Guarda o pedido como "pending"; o webhook do Mercado Pago muda para "active" quando o Pix for pago.
    const supabase = createAdminClient()
    const { error: dbError } = await supabase.from("subscriptions").insert({
      customer_name: delivery.name,
      customer_email: delivery.email,
      customer_phone: delivery.phone,
      customer_cpf: delivery.cpf,
      plan_name: plan.name,
      status: "pending",
      cep: delivery.cep,
      street: delivery.street,
      number: delivery.number,
      observation: delivery.complement,
      neighborhood: delivery.neighborhood,
      city: DELIVERY_CITY,
      state: DELIVERY_STATE,
      reference_point: delivery.reference,
      delivery_day: delivery.deliveryDay,
      delivery_period: delivery.deliveryPeriod,
      delivery_instructions: delivery.instructions,
      payment_method: "pix",
      payment_id: String(result.id),
      coupon_code: couponCode || null,
      discount_cents: discountCents,
      amount_cents: amountCents,
    })
    if (dbError) console.error("Pix gerado, mas falhou ao salvar o pedido:", dbError.message)

    await sendOrderNotification({
      planName: plan.name,
      paymentMethod: "Pix",
      delivery,
      couponCode,
      discountCents,
      amountCents,
    })

    return NextResponse.json({ qrCode, qrCodeBase64, paymentId: result.id, amountCents })
  } catch (error: any) {
    console.error("Erro ao gerar Pix:", JSON.stringify(error?.cause || error?.message || error, null, 2))
    return NextResponse.json({ error: "Erro ao gerar Pix." }, { status: 400 })
  }
}

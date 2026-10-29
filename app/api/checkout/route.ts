import { NextRequest, NextResponse } from "next/server"
import { getStripe } from "@/lib/stripe"
import { createAdminClient } from "@/lib/supabase/admin"
import { createPendingSignup } from "@/lib/customers"
import { validatePassword } from "@/lib/customer-auth"
import { getPlanByName } from "@/lib/plans"
import { sanitizeDelivery, validateDelivery } from "@/lib/delivery"
import { resolveCoupon, type CouponRow } from "@/lib/coupons"
import { sendOrderNotification } from "@/lib/notify"

const stripe = getStripe()

async function getOrCreateStripeCoupon(c: CouponRow): Promise<string> {
  const id = `CAIPI_${c.code}_${c.discount_type}_${c.discount_value}_${c.duration}`.replace(/[^A-Za-z0-9_-]/g, "_")
  try {
    await stripe.coupons.retrieve(id)
    return id
  } catch {
    await stripe.coupons.create({
      id,
      name: `Cupom ${c.code}`,
      duration: c.duration === "forever" ? "forever" : "once",
      ...(c.discount_type === "percent"
        ? { percent_off: c.discount_value }
        : { amount_off: c.discount_value, currency: "brl" }),
    })
    return id
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // O preço vem SEMPRE do servidor, nunca do navegador.
    const plan = getPlanByName(body?.planName)
    if (!plan) return NextResponse.json({ error: "Plano inválido." }, { status: 400 })

    const delivery = sanitizeDelivery(body?.delivery)
    const fieldErrors = validateDelivery(delivery)
    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ error: "Confira os dados de entrega.", fields: fieldErrors }, { status: 400 })
    }

    const passwordError = validatePassword(body?.password)
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 })

    const coupon = await resolveCoupon(body?.couponCode, plan)
    if (coupon && !coupon.ok) return NextResponse.json({ error: coupon.error }, { status: 400 })

    // A senha não vai para o Stripe: fica guardada (já em hash) aqui, e a conta só nasce quando o pagamento for confirmado.
    const signupId = await createPendingSignup(createAdminClient(), {
      cpf: delivery.cpf,
      name: delivery.name,
      email: delivery.email,
      phone: delivery.phone,
      password: body.password,
    })

    const discountCents = coupon?.ok ? coupon.discountCents : 0
    const amountCents = coupon?.ok ? coupon.finalCents : plan.priceInCents
    const couponCode = coupon?.ok ? coupon.coupon.code : ""

    const discounts = coupon?.ok ? [{ coupon: await getOrCreateStripeCoupon(coupon.coupon) }] : undefined
    const origin = req.nextUrl.origin

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      locale: "pt-BR",
      customer_email: delivery.email,
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: {
              name: `Assinatura Caipirovos - ${plan.name}`,
              description: `${plan.eggs} ovos`,
            },
            unit_amount: plan.priceInCents,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      discounts,
      metadata: {
        planName: plan.name,
        customerName: delivery.name,
        customerPhone: delivery.phone,
        customerEmail: delivery.email,
        customerCpf: delivery.cpf,
        cep: delivery.cep,
        street: delivery.street,
        number: delivery.number,
        neighborhood: delivery.neighborhood,
        complement: delivery.complement,
        reference: delivery.reference,
        deliveryDay: delivery.deliveryDay,
        deliveryPeriod: delivery.deliveryPeriod,
        instructions: delivery.instructions,
        couponCode,
        signupId,
        discountCents: String(discountCents),
        amountCents: String(amountCents),
      },
      success_url: `${origin}/sucesso`,
      cancel_url: `${origin}/#assinatura`,
    })

    await sendOrderNotification({
      planName: plan.name,
      paymentMethod: "Cartão de crédito",
      delivery,
      couponCode,
      discountCents,
      amountCents,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error("Erro no checkout (Stripe):", error?.message || error)
    return NextResponse.json({ error: "Não foi possível iniciar o pagamento. Tente novamente." }, { status: 500 })
  }
}

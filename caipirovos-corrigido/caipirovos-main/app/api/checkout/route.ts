import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { getPlan } from "@/lib/plans"
import { isSameOrigin } from "@/lib/security"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
const clip = (v: unknown, n = 200) => String(v ?? "").slice(0, n)

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origem inválida" }, { status: 403 })

  const body = await req.json().catch(() => null)
  // O preço NUNCA vem do navegador: é buscado em lib/plans.ts pelo nome do plano.
  const plan = getPlan(body?.planName)
  if (!plan || plan.priceInCents <= 0) return NextResponse.json({ error: "Plano indisponível" }, { status: 400 })

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "brl",
            product_data: { name: `Assinatura Caipirovos - ${plan.name}` },
            unit_amount: plan.priceInCents,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      metadata: {
        planName: plan.name,
        customerName: clip(body.customerName),
        customerPhone: clip(body.customerPhone),
        customerCpf: clip(body.customerCpf),
        cep: clip(body.cep),
        street: clip(body.street),
        number: clip(body.number),
        observation: clip(body.observation, 450),
      },
      success_url: `${req.nextUrl.origin}/sucesso`,
      cancel_url: `${req.nextUrl.origin}/#assinatura`,
    })
    return NextResponse.json({ url: session.url })
  } catch {
    return NextResponse.json({ error: "Erro ao criar pagamento" }, { status: 500 })
  }
}

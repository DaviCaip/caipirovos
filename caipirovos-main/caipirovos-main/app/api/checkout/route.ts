import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const { planName, price, customerName, customerPhone, customerCpf, cep, street, number, observation } = await req.json()

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "brl",
          product_data: {
            name: `Assinatura Caipirovos - ${planName}`,
          },
          unit_amount: price,
          recurring: {
            interval: "month",
          },
        },
        quantity: 1,
      },
    ],
    mode: "subscription",
    metadata: {
      planName,
      customerName,
      customerPhone,
      customerCpf,
      cep,
      street,
      number,
      observation: observation || "",
    },
    success_url: `${req.nextUrl.origin}/sucesso`,
    cancel_url: `${req.nextUrl.origin}/#assinatura`,
  })

  return NextResponse.json({ url: session.url })
}

import { NextRequest, NextResponse } from "next/server"
import { MercadoPagoConfig, Payment } from "mercadopago"
import { getPlan } from "@/lib/plans"
import { isSameOrigin } from "@/lib/security"

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
})

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origem inválida" }, { status: 403 })

  const body = await req.json().catch(() => null)
  const plan = getPlan(body?.planName)
  if (!plan || plan.priceInCents <= 0) return NextResponse.json({ error: "Plano indisponível" }, { status: 400 })

  const customerName = String(body?.customerName ?? "").trim()
  const customerEmail = String(body?.customerEmail ?? "").trim()
  const cpf = String(body?.customerDocument ?? "").replace(/\D/g, "")
  if (!customerName || !customerEmail || cpf.length !== 11) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  try {
    const payment = new Payment(client)
    const result = await payment.create({
      body: {
        transaction_amount: plan.priceInCents / 100, // preço vem do servidor
        description: `Assinatura Caipirovos - ${plan.name}`,
        payment_method_id: "pix",
        payer: {
          email: customerEmail,
          first_name: customerName.split(" ")[0],
          last_name: customerName.split(" ").slice(1).join(" ") || customerName,
          identification: { type: "CPF", number: cpf },
        },
      },
    })

    const qrCode = result.point_of_interaction?.transaction_data?.qr_code
    const qrCodeBase64 = result.point_of_interaction?.transaction_data?.qr_code_base64
    if (!qrCode) return NextResponse.json({ error: "Erro ao gerar Pix" }, { status: 400 })

    return NextResponse.json({ qrCode, qrCodeBase64, paymentId: result.id })
  } catch (error: any) {
    console.log(JSON.stringify(error?.cause || error?.message || error, null, 2))
    return NextResponse.json({ error: "Erro ao gerar Pix" }, { status: 400 })
  }
}

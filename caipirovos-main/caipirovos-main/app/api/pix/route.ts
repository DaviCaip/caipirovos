import { NextRequest, NextResponse } from "next/server"
import { MercadoPagoConfig, Payment } from "mercadopago"

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
})

export async function POST(req: NextRequest) {
  const { planName, price, customerName, customerEmail, customerDocument } = await req.json()

  try {
    const payment = new Payment(client)

    const result = await payment.create({
      body: {
        transaction_amount: price / 100,
        description: `Assinatura Caipirovos - ${planName}`,
        payment_method_id: "pix",
        payer: {
          email: customerEmail,
          first_name: customerName.split(" ")[0],
          last_name: customerName.split(" ").slice(1).join(" ") || customerName,
          identification: {
            type: "CPF",
            number: customerDocument.replace(/\D/g, ""),
          },
        },
      },
    })

    const qrCode = result.point_of_interaction?.transaction_data?.qr_code
    const qrCodeBase64 = result.point_of_interaction?.transaction_data?.qr_code_base64

    if (!qrCode) {
      return NextResponse.json({ error: "Erro ao gerar Pix" }, { status: 400 })
    }

    return NextResponse.json({ qrCode, qrCodeBase64, paymentId: result.id })
  } catch (error: any) {
    console.log(JSON.stringify(error?.cause || error?.message || error, null, 2))
    return NextResponse.json({ error: "Erro ao gerar Pix" }, { status: 400 })
  }
}

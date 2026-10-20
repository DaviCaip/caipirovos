import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const { name, phone, cpf, cep, street, number, observation, planName, paymentMethod } = await req.json()

  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: process.env.NOTIFICATION_EMAIL!,
    subject: `Nova assinatura Caipirovos - ${planName}`,
    html: `
      <h2>Nova assinatura recebida!</h2>
      <h3>Plano: ${planName}</h3>
      <h3>Forma de pagamento: ${paymentMethod}</h3>
      <hr/>
      <h3>Dados do cliente:</h3>
      <p><strong>Nome:</strong> ${name}</p>
      <p><strong>Telefone:</strong> ${phone}</p>
      <p><strong>CPF:</strong> ${cpf}</p>
      <hr/>
      <h3>Endereço de entrega:</h3>
      <p><strong>CEP:</strong> ${cep}</p>
      <p><strong>Rua:</strong> ${street}</p>
      <p><strong>Número:</strong> ${number}</p>
      <p><strong>Observação:</strong> ${observation || "Nenhuma"}</p>
    `,
  })

  return NextResponse.json({ success: true })
}

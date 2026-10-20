import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { escapeHtml as h, isSameOrigin, oneLine } from "@/lib/security"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origem inválida" }, { status: 403 })
  const { name, phone, cpf, cep, street, number, observation, planName, paymentMethod } = await req.json().catch(() => ({}))

  try {
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: process.env.NOTIFICATION_EMAIL!,
      subject: `Nova assinatura Caipirovos - ${oneLine(planName)}`,
      html: `
        <h2>Nova assinatura recebida!</h2>
        <h3>Plano: ${h(planName)}</h3>
        <h3>Forma de pagamento: ${h(paymentMethod)}</h3>
        <hr/>
        <h3>Dados do cliente:</h3>
        <p><strong>Nome:</strong> ${h(name)}</p>
        <p><strong>Telefone:</strong> ${h(phone)}</p>
        <p><strong>CPF:</strong> ${h(cpf)}</p>
        <hr/>
        <h3>Endereço de entrega:</h3>
        <p><strong>CEP:</strong> ${h(cep)}</p>
        <p><strong>Rua:</strong> ${h(street)}</p>
        <p><strong>Número:</strong> ${h(number)}</p>
        <p><strong>Observação:</strong> ${h(observation) || "Nenhuma"}</p>
      `,
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const data = await req.json()

  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: process.env.NOTIFICATION_EMAIL!,
    subject: `Novo cadastro de Revendedor - ${data.businessName}`,
    html: `
      <h2>Novo cadastro de Revendedor!</h2>
      <p><strong>Estabelecimento:</strong> ${data.businessName}</p>
      <p><strong>Tipo:</strong> ${data.businessType || "Não informado"}</p>
      <p><strong>Responsável:</strong> ${data.contactName}</p>
      <p><strong>Telefone:</strong> ${data.phone}</p>
      <p><strong>E-mail:</strong> ${data.email}</p>
      <p><strong>Cidade:</strong> ${data.city || "Não informado"}</p>
      <p><strong>Estado:</strong> ${data.state || "Não informado"}</p>
      <p><strong>Volume mensal:</strong> ${data.estimatedMonthlyDemand || "Não informado"}</p>
    `,
  })

  return NextResponse.json({ success: true })
}

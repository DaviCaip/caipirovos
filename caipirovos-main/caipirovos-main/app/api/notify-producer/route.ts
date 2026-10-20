import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  const data = await req.json()

  await resend.emails.send({
    from: "onboarding@resend.dev",
    to: process.env.NOTIFICATION_EMAIL!,
    subject: `Novo cadastro de Produtor - ${data.name}`,
    html: `
      <h2>Novo cadastro de Produtor!</h2>
      <p><strong>Nome:</strong> ${data.name}</p>
      <p><strong>Propriedade:</strong> ${data.farmName}</p>
      <p><strong>Telefone:</strong> ${data.phone}</p>
      <p><strong>E-mail:</strong> ${data.email}</p>
      <p><strong>Localização:</strong> ${data.location || "Não informado"}</p>
      <p><strong>Produção diária:</strong> ${data.productionCapacity || "Não informado"}</p>
      <p><strong>Anos de experiência:</strong> ${data.experienceYears || "Não informado"}</p>
      <p><strong>Mensagem:</strong> ${data.message || "Nenhuma"}</p>
    `,
  })

  return NextResponse.json({ success: true })
}

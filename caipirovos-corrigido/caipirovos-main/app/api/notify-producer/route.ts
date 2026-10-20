import { NextRequest, NextResponse } from "next/server"
import { Resend } from "resend"
import { escapeHtml as h, isSameOrigin, oneLine } from "@/lib/security"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origem inválida" }, { status: 403 })
  const data = await req.json().catch(() => ({}))

  try {
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: process.env.NOTIFICATION_EMAIL!,
      subject: `Novo cadastro de Produtor - ${oneLine(data.name)}`,
      html: `
        <h2>Novo cadastro de Produtor!</h2>
        <p><strong>Nome:</strong> ${h(data.name)}</p>
        <p><strong>Propriedade:</strong> ${h(data.farmName)}</p>
        <p><strong>Telefone:</strong> ${h(data.phone)}</p>
        <p><strong>E-mail:</strong> ${h(data.email)}</p>
        <p><strong>Localização:</strong> ${h(data.location) || "Não informado"}</p>
        <p><strong>Produção diária:</strong> ${h(data.productionCapacity) || "Não informado"}</p>
        <p><strong>Anos de experiência:</strong> ${h(data.experienceYears) || "Não informado"}</p>
        <p><strong>Mensagem:</strong> ${h(data.message) || "Nenhuma"}</p>
      `,
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

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
      subject: `Novo cadastro de Revendedor - ${oneLine(data.businessName)}`,
      html: `
        <h2>Novo cadastro de Revendedor!</h2>
        <p><strong>Estabelecimento:</strong> ${h(data.businessName)}</p>
        <p><strong>Tipo:</strong> ${h(data.businessType) || "Não informado"}</p>
        <p><strong>Responsável:</strong> ${h(data.contactName)}</p>
        <p><strong>Telefone:</strong> ${h(data.phone)}</p>
        <p><strong>E-mail:</strong> ${h(data.email)}</p>
        <p><strong>Cidade:</strong> ${h(data.city) || "Não informado"}</p>
        <p><strong>Estado:</strong> ${h(data.state) || "Não informado"}</p>
        <p><strong>Volume mensal:</strong> ${h(data.estimatedMonthlyDemand) || "Não informado"}</p>
      `,
    })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}

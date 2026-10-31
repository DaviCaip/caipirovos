import { NextResponse } from "next/server"

// Rota desativada: qualquer pessoa conseguia disparar e-mails por aqui. Os avisos agora saem do servidor (/api/register e /api/checkout).
export function POST() {
  return NextResponse.json({ error: "Rota desativada." }, { status: 410 })
}

import { NextRequest, NextResponse } from "next/server"
import { ADMIN_COOKIE, adminCookieOptions, checkPassword, createSession } from "@/lib/admin-auth"
import { isSameOrigin } from "@/lib/security"

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origem inválida" }, { status: 403 })
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "ADMIN_PASSWORD não está configurada no servidor." }, { status: 503 })
  }

  const { password } = await req.json().catch(() => ({ password: "" }))
  if (!checkPassword(password)) {
    await new Promise((r) => setTimeout(r, 800)) // atrasa tentativas erradas
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, createSession(), adminCookieOptions)
  return res
}

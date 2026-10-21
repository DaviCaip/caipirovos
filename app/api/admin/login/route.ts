import { NextRequest, NextResponse } from "next/server"
import {
  clearFailures,
  clientIp,
  createSessionToken,
  findUserByPassword,
  isBlocked,
  isConfigured,
  registerFailure,
  setSessionCookie,
} from "@/lib/admin-auth"

export async function POST(req: NextRequest) {
  if (!isConfigured()) {
    return NextResponse.json(
      { error: "Admin não configurado: faltam ADMIN_USERS e ADMIN_SESSION_SECRET na Vercel." },
      { status: 503 }
    )
  }

  const ip = clientIp(req)
  if (isBlocked(ip)) {
    return NextResponse.json({ error: "Muitas tentativas. Espere 10 minutos e tente de novo." }, { status: 429 })
  }

  let password = ""
  try {
    const body = await req.json()
    password = typeof body?.password === "string" ? body.password : ""
  } catch {}

  const user = password ? findUserByPassword(password) : undefined
  if (!user) {
    registerFailure(ip)
    await new Promise((r) => setTimeout(r, 600))
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 })
  }

  const token = createSessionToken(user.name)
  if (!token) return NextResponse.json({ error: "Falha ao criar a sessão." }, { status: 500 })

  clearFailures(ip)
  const res = NextResponse.json({ name: user.name, permissions: user.permissions })
  setSessionCookie(res, token)
  return res
}

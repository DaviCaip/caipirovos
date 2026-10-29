import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { clientIp } from "@/lib/admin-auth"
import { isValidCpf, onlyDigits } from "@/lib/br"
import {
  burnTime,
  createCustomerToken,
  ipBlocked,
  ipFailure,
  recordPasswordFailure,
  setCustomerCookie,
  verifyPassword,
} from "@/lib/customer-auth"

const WRONG = "CPF ou senha incorretos."

export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  if (ipBlocked(ip)) return NextResponse.json({ error: "Muitas tentativas. Espere alguns minutos e tente de novo." }, { status: 429 })

  const body = await req.json().catch(() => ({}))
  const cpf = onlyDigits(typeof body.cpf === "string" ? body.cpf : "")
  const password = typeof body.password === "string" ? body.password : ""
  if (!isValidCpf(cpf) || !password) {
    burnTime()
    ipFailure(ip)
    return NextResponse.json({ error: WRONG }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { data: c } = await supabase.from("customers").select("*").eq("cpf_digits", cpf).maybeSingle()
  if (!c) {
    burnTime() // mesma demora de uma conta que existe: não dá para descobrir quem tem conta
    ipFailure(ip)
    return NextResponse.json({ error: WRONG }, { status: 401 })
  }

  if (c.locked_until && Date.parse(c.locked_until) > Date.now()) {
    const min = Math.ceil((Date.parse(c.locked_until) - Date.now()) / 60000)
    return NextResponse.json({ error: `Conta bloqueada por tentativas erradas. Tente de novo em ${min} min.` }, { status: 429 })
  }

  if (!verifyPassword(password, c.password_hash)) {
    ipFailure(ip)
    const locked = await recordPasswordFailure(c.id, c.failed_attempts || 0)
    return NextResponse.json(
      { error: locked ? "Muitas tentativas erradas. A conta ficou bloqueada por 15 minutos." : WRONG },
      { status: locked ? 429 : 401 }
    )
  }

  const token = createCustomerToken(c.id)
  if (!token) return NextResponse.json({ error: "Login indisponível no momento." }, { status: 503 })

  await supabase.from("customers").update({ failed_attempts: 0, locked_until: null, last_login_at: new Date().toISOString() }).eq("id", c.id)
  const res = NextResponse.json({ name: c.name, mustChangePassword: !!c.must_change_password })
  setCustomerCookie(res, token)
  return res
}

import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { hashPassword, recordPasswordFailure, requireCustomer, validatePassword, verifyPassword } from "@/lib/customer-auth"

export async function POST(req: NextRequest) {
  const auth = await requireCustomer(req)
  if ("error" in auth) return auth.error

  const b = await req.json().catch(() => ({}))
  const problem = validatePassword(b.next)
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  const supabase = createAdminClient()
  const { data: c } = await supabase.from("customers").select("password_hash, failed_attempts, locked_until").eq("id", auth.customer.id).maybeSingle()
  if (!c) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 })
  if (c.locked_until && Date.parse(c.locked_until) > Date.now()) {
    return NextResponse.json({ error: "Conta bloqueada por tentativas erradas. Tente mais tarde." }, { status: 429 })
  }
  if (typeof b.current !== "string" || !verifyPassword(b.current, c.password_hash)) {
    await recordPasswordFailure(auth.customer.id, c.failed_attempts || 0)
    return NextResponse.json({ error: "A senha atual está incorreta." }, { status: 403 })
  }
  if (b.current === b.next) return NextResponse.json({ error: "Escolha uma senha diferente da atual." }, { status: 400 })

  await supabase
    .from("customers")
    .update({ password_hash: hashPassword(b.next), must_change_password: false, failed_attempts: 0, locked_until: null })
    .eq("id", auth.customer.id)
  return NextResponse.json({ ok: true })
}

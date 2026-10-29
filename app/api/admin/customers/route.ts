import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { hashPassword } from "@/lib/customer-auth"
import { generateTempPassword } from "@/lib/customers"
import { onlyDigits } from "@/lib/br"

// Cria (ou redefine) o acesso de um assinante com uma senha provisória, que a equipe passa pelo WhatsApp.
// Serve para quem já era assinante antes da conta existir e para quem esqueceu a senha.
// O cliente é obrigado a trocar a senha no primeiro acesso.
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, "subscriptions")
  if ("error" in auth) return auth.error

  const b = await req.json().catch(() => ({}))
  if (typeof b.subscriptionId !== "string" || !b.subscriptionId) {
    return NextResponse.json({ error: "Escolha a assinatura." }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: sub } = await supabase.from("subscriptions").select("*").eq("id", b.subscriptionId).maybeSingle()
  if (!sub) return NextResponse.json({ error: "Assinatura não encontrada." }, { status: 404 })

  const cpf = onlyDigits(sub.cpf_digits || sub.customer_cpf || "")
  if (cpf.length !== 11) return NextResponse.json({ error: "Esta assinatura não tem um CPF válido." }, { status: 400 })

  const temp = generateTempPassword()
  const { data: existing } = await supabase.from("customers").select("id").eq("cpf_digits", cpf).maybeSingle()

  if (existing) {
    // o contato da assinatura passa a ser o da conta (a equipe confirma que é a mesma pessoa)
    const { error } = await supabase
      .from("customers")
      .update({
        password_hash: hashPassword(temp),
        must_change_password: true,
        failed_attempts: 0,
        locked_until: null,
        email: sub.customer_email,
        phone: sub.customer_phone,
      })
      .eq("id", existing.id)
    if (error) return NextResponse.json({ error: "Não foi possível redefinir." }, { status: 500 })
  } else {
    const { error } = await supabase.from("customers").insert({
      cpf_digits: cpf,
      name: sub.customer_name || "Cliente",
      email: sub.customer_email,
      phone: sub.customer_phone,
      password_hash: hashPassword(temp),
      must_change_password: true,
    })
    if (error) return NextResponse.json({ error: "Não foi possível criar o acesso." }, { status: 500 })
  }

  if (!sub.cpf_digits) await supabase.from("subscriptions").update({ cpf_digits: cpf }).eq("id", sub.id)

  const site = req.nextUrl.origin
  return NextResponse.json({
    ok: true,
    created: !existing,
    name: sub.customer_name,
    phone: sub.customer_phone,
    tempPassword: temp,
    message: `Olá, ${(sub.customer_name || "").split(/\s+/)[0]}! Aqui é do Caipirovos 🥚 Seu acesso para acompanhar a entrega e gerenciar a assinatura:\n${site}/conta\nUsuário: seu CPF\nSenha provisória: ${temp}\n(no primeiro acesso você escolhe a sua senha)`,
  })
}

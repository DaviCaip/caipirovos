import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, verifyUserPassword } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"

// Só estes campos podem ser editados pelo painel.
const EDITABLE: Record<string, string[]> = {
  resellers: ["business_name", "contact_name", "email", "phone", "city", "state"],
  producers: ["name", "email", "phone", "farm_name", "location"],
}

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req, "registrations")
  if ("error" in auth) return auth.error

  const supabase = createAdminClient()
  const { data: resellers } = await supabase.from("resellers").select("*").order("created_at", { ascending: false })
  const { data: producers } = await supabase.from("producers").select("*").order("created_at", { ascending: false })
  return NextResponse.json({ resellers: resellers || [], producers: producers || [] })
}

export async function PATCH(req: NextRequest) {
  const auth = requireAdmin(req, "registrations")
  if ("error" in auth) return auth.error

  const { table, id, data, confirmPassword } = await req.json().catch(() => ({}))
  if (!EDITABLE[table] || typeof id !== "string") return NextResponse.json({ error: "Pedido inválido." }, { status: 400 })
  if (!verifyUserPassword(auth.user.name, confirmPassword)) {
    return NextResponse.json({ error: "Senha de confirmação incorreta." }, { status: 403 })
  }

  const update: Record<string, string> = {}
  for (const key of EDITABLE[table]) {
    if (typeof data?.[key] === "string") update[key] = data[key].trim().slice(0, 300)
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ error: "Nada para salvar." }, { status: 400 })

  const { error } = await createAdminClient().from(table).update(update).eq("id", id)
  if (error) return NextResponse.json({ error: "Falha ao salvar." }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const auth = requireAdmin(req, "registrations")
  if ("error" in auth) return auth.error

  const { table, id, confirmPassword } = await req.json().catch(() => ({}))
  if (!EDITABLE[table] || typeof id !== "string") return NextResponse.json({ error: "Pedido inválido." }, { status: 400 })
  if (!verifyUserPassword(auth.user.name, confirmPassword)) {
    return NextResponse.json({ error: "Senha de confirmação incorreta." }, { status: 403 })
  }

  const { error } = await createAdminClient().from(table).delete().eq("id", id)
  if (error) return NextResponse.json({ error: "Falha ao excluir." }, { status: 500 })
  return NextResponse.json({ ok: true })
}

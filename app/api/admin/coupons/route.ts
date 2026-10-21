import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, verifyUserPassword } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { PLANS } from "@/lib/plans"

const CODE_RE = /^[A-Z0-9_-]{3,30}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// Datas do admin são "dia/mês/ano" do Brasil (Bahia, UTC-3): começa 00:00 do primeiro dia e termina 23:59:59 do último.
const startOfDay = (d: string) => `${d}T00:00:00-03:00`
const endOfDay = (d: string) => `${d}T23:59:59-03:00`

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req, "coupons")
  if ("error" in auth) return auth.error
  const { data, error } = await createAdminClient().from("coupons").select("*").order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: "Não foi possível carregar os cupons." }, { status: 500 })
  return NextResponse.json({ coupons: data || [] })
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req, "coupons")
  if ("error" in auth) return auth.error

  const b = await req.json().catch(() => ({}))
  const code = typeof b.code === "string" ? b.code.trim().toUpperCase().replace(/\s+/g, "") : ""
  if (!CODE_RE.test(code)) {
    return NextResponse.json({ error: "Nome do cupom: de 3 a 30 letras, números, - ou _ (sem espaços)." }, { status: 400 })
  }

  const type = b.discountType === "fixed" ? "fixed" : "percent"
  let value = Number(b.value)
  if (!Number.isFinite(value) || value <= 0) return NextResponse.json({ error: "Informe o valor do desconto." }, { status: 400 })
  if (type === "percent") {
    value = Math.round(value)
    if (value < 1 || value > 100) return NextResponse.json({ error: "A porcentagem deve ficar entre 1 e 100." }, { status: 400 })
  } else {
    value = Math.round(value * 100) // R$ -> centavos
  }

  const noEnd = b.noEndDate === true
  const startDate = typeof b.startDate === "string" && DATE_RE.test(b.startDate) ? b.startDate : null
  const endDate = typeof b.endDate === "string" && DATE_RE.test(b.endDate) ? b.endDate : null
  if (!noEnd && !endDate) {
    return NextResponse.json(
      { error: "Escolha até que dia o cupom vale (ou marque \"sem data final\")." },
      { status: 400 }
    )
  }
  if (startDate && endDate && endDate < startDate) {
    return NextResponse.json({ error: "A data final não pode ser antes da data inicial." }, { status: 400 })
  }

  let maxUses: number | null = null
  if (b.maxUses !== undefined && b.maxUses !== null && b.maxUses !== "") {
    maxUses = Math.floor(Number(b.maxUses))
    if (!Number.isFinite(maxUses) || maxUses < 1) return NextResponse.json({ error: "Limite de usos inválido." }, { status: 400 })
  }

  const planNames = PLANS.map((p) => p.name)
  const allowed: string[] = Array.isArray(b.allowedPlans) ? b.allowedPlans.filter((p: any) => planNames.includes(p)) : []

  const { error } = await createAdminClient()
    .from("coupons")
    .insert({
      code,
      description: typeof b.description === "string" ? b.description.trim().slice(0, 120) || null : null,
      discount_type: type,
      discount_value: value,
      duration: b.duration === "forever" ? "forever" : "once",
      active: true,
      max_uses: maxUses,
      starts_at: startDate ? startOfDay(startDate) : null,
      expires_at: !noEnd && endDate ? endOfDay(endDate) : null,
      allowed_plans: allowed.length > 0 && allowed.length < planNames.length ? allowed : null,
    })

  if (error) {
    if ((error as any).code === "23505") return NextResponse.json({ error: "Já existe um cupom com esse nome." }, { status: 409 })
    return NextResponse.json({ error: "Não foi possível criar o cupom." }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const auth = requireAdmin(req, "coupons")
  if ("error" in auth) return auth.error

  const b = await req.json().catch(() => ({}))
  if (typeof b.id !== "string") return NextResponse.json({ error: "Cupom inválido." }, { status: 400 })

  const update: Record<string, unknown> = {}
  if (typeof b.active === "boolean") update.active = b.active
  if (b.endDate !== undefined) {
    if (b.endDate === null) update.expires_at = null
    else if (typeof b.endDate === "string" && DATE_RE.test(b.endDate)) update.expires_at = endOfDay(b.endDate)
    else return NextResponse.json({ error: "Data final inválida." }, { status: 400 })
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ error: "Nada para alterar." }, { status: 400 })

  const { error } = await createAdminClient().from("coupons").update(update).eq("id", b.id)
  if (error) return NextResponse.json({ error: "Não foi possível alterar o cupom." }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const auth = requireAdmin(req, "coupons")
  if ("error" in auth) return auth.error

  const { id, confirmPassword } = await req.json().catch(() => ({}))
  if (typeof id !== "string") return NextResponse.json({ error: "Cupom inválido." }, { status: 400 })
  if (!verifyUserPassword(auth.user.name, confirmPassword)) {
    return NextResponse.json({ error: "Senha de confirmação incorreta." }, { status: 403 })
  }
  const { error } = await createAdminClient().from("coupons").delete().eq("id", id)
  if (error) return NextResponse.json({ error: "Não foi possível excluir o cupom." }, { status: 500 })
  return NextResponse.json({ ok: true })
}

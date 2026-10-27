import { NextRequest, NextResponse } from "next/server"
import {
  GRANTABLE_PERMISSIONS,
  hashLoginPassword,
  isEnvPassword,
  requireAdmin,
  verifyUserPassword,
} from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadPurchases } from "@/lib/influencer-stats"

const CODE_RE = /^[A-Z0-9_-]{3,30}$/

function cleanPermissions(input: unknown): string[] {
  const list = Array.isArray(input) ? input : []
  return GRANTABLE_PERMISSIONS.filter((p) => list.includes(p))
}

function cleanCodes(input: unknown): string[] {
  const list = Array.isArray(input) ? input : []
  return Array.from(new Set(list.filter((c): c is string => typeof c === "string" && CODE_RE.test(c))))
}

function parseGoal(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null
  const n = Math.floor(Number(v))
  return Number.isFinite(n) && n >= 0 && n <= 100000 ? n : NaN
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, "influencers")
  if ("error" in auth) return auth.error

  const supabase = createAdminClient()
  const { data: accounts, error } = await supabase.from("admin_accounts").select("*").order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: "Não foi possível carregar os influencers." }, { status: 500 })
  const { data: coupons } = await supabase.from("coupons").select("code, active, influencer_id").order("code")

  const assigned = (coupons || []).filter((c) => c.influencer_id)
  const purchases = await loadPurchases(assigned.map((c) => c.code))
  const owner: Record<string, string> = {}
  for (const c of assigned) owner[c.code] = c.influencer_id

  const since30 = Date.now() - 30 * 86400000
  const result = (accounts || []).map((a) => {
    const mine = purchases.filter((p) => owner[p.code] === a.id)
    const last = mine.reduce<string | null>((acc, p) => (!acc || p.at > acc ? p.at : acc), null)
    return {
      id: a.id,
      name: a.name,
      role: a.role === "team" ? "team" : a.role === "courier" ? "courier" : "influencer",
      active: a.active,
      permissions: Array.isArray(a.permissions) ? a.permissions : [],
      monthly_goal: a.monthly_goal,
      created_at: a.created_at,
      last_login_at: a.last_login_at,
      coupons: assigned.filter((c) => c.influencer_id === a.id).map((c) => c.code),
      total: mine.length,
      last30: mine.filter((p) => new Date(p.at).getTime() >= since30).length,
      lastUseAt: last,
    }
  })

  return NextResponse.json({ accounts: result, coupons: coupons || [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, "influencers")
  if ("error" in auth) return auth.error

  const b = await req.json().catch(() => ({}))
  const name = typeof b.name === "string" ? b.name.trim() : ""
  const password = typeof b.password === "string" ? b.password : ""
  if (name.length < 2 || name.length > 60) return NextResponse.json({ error: "Informe o nome (2 a 60 letras)." }, { status: 400 })
  if (password.length < 6 || password.length > 60) {
    return NextResponse.json({ error: "A senha precisa ter de 6 a 60 caracteres." }, { status: 400 })
  }
  const role = b.role === "team" ? "team" : b.role === "courier" ? "courier" : "influencer"
  const goal = role !== "influencer" ? 0 : parseGoal(b.monthlyGoal)
  if (Number.isNaN(goal)) return NextResponse.json({ error: "Meta inválida." }, { status: 400 })
  const permissions = role === "courier" ? [] : cleanPermissions(b.permissions)
  if (role === "team" && permissions.length === 0) {
    return NextResponse.json({ error: "Marque pelo menos uma área para a conta de equipe." }, { status: 400 })
  }

  if (isEnvPassword(password)) return NextResponse.json({ error: "Essa senha já está em uso. Escolha outra." }, { status: 409 })
  const hash = hashLoginPassword(password)
  if (!hash) return NextResponse.json({ error: "ADMIN_SESSION_SECRET não configurado." }, { status: 500 })

  const supabase = createAdminClient()
  const { data: created, error } = await supabase
    .from("admin_accounts")
    .insert({ name, role, login_hash: hash, permissions, monthly_goal: goal ?? 10 })
    .select("id")
    .single()
  if (error || !created) {
    if ((error as any)?.code === "23505") return NextResponse.json({ error: "Essa senha já está em uso. Escolha outra." }, { status: 409 })
    return NextResponse.json({ error: "Não foi possível criar a conta." }, { status: 500 })
  }

  const codes = role !== "influencer" ? [] : cleanCodes(b.couponCodes)
  if (codes.length > 0) {
    await supabase.from("coupons").update({ influencer_id: created.id }).in("code", codes).is("influencer_id", null)
  }
  return NextResponse.json({ ok: true, id: created.id })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req, "influencers")
  if ("error" in auth) return auth.error

  const b = await req.json().catch(() => ({}))
  if (typeof b.id !== "string" || !b.id) return NextResponse.json({ error: "Conta inválida." }, { status: 400 })

  const supabase = createAdminClient()
  const { data: current } = await supabase.from("admin_accounts").select("role").eq("id", b.id).maybeSingle()
  if (!current) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 })
  const isTeam = current.role === "team"
  const isCourier = current.role === "courier"
  const noCoupons = isTeam || isCourier
  if (noCoupons && b.couponCodes !== undefined && cleanCodes(b.couponCodes).length > 0) {
    return NextResponse.json({ error: "Esse tipo de conta não tem cupom." }, { status: 400 })
  }
  if (isTeam && b.permissions !== undefined && cleanPermissions(b.permissions).length === 0) {
    return NextResponse.json({ error: "Marque pelo menos uma área para a conta de equipe." }, { status: 400 })
  }

  const update: Record<string, unknown> = {}
  if (typeof b.name === "string") {
    const name = b.name.trim()
    if (name.length < 2 || name.length > 60) return NextResponse.json({ error: "Informe o nome (2 a 60 letras)." }, { status: 400 })
    update.name = name
  }
  if (typeof b.active === "boolean") update.active = b.active
  if (b.permissions !== undefined && !isCourier) update.permissions = cleanPermissions(b.permissions)
  if (b.monthlyGoal !== undefined) {
    const goal = parseGoal(b.monthlyGoal)
    if (goal === null || Number.isNaN(goal)) return NextResponse.json({ error: "Meta inválida." }, { status: 400 })
    update.monthly_goal = goal
  }
  if (typeof b.password === "string" && b.password) {
    if (b.password.length < 6 || b.password.length > 60) {
      return NextResponse.json({ error: "A senha precisa ter de 6 a 60 caracteres." }, { status: 400 })
    }
    if (isEnvPassword(b.password)) return NextResponse.json({ error: "Essa senha já está em uso. Escolha outra." }, { status: 409 })
    const hash = hashLoginPassword(b.password)
    if (!hash) return NextResponse.json({ error: "ADMIN_SESSION_SECRET não configurado." }, { status: 500 })
    update.login_hash = hash
  }

  if (Object.keys(update).length > 0) {
    const { error } = await supabase.from("admin_accounts").update(update).eq("id", b.id)
    if (error) {
      if ((error as any).code === "23505") return NextResponse.json({ error: "Essa senha já está em uso. Escolha outra." }, { status: 409 })
      return NextResponse.json({ error: "Não foi possível salvar." }, { status: 500 })
    }
  }

  if (b.couponCodes !== undefined && !noCoupons) {
    const codes = cleanCodes(b.couponCodes)
    // solta os cupons que saíram da lista...
    let release = supabase.from("coupons").update({ influencer_id: null }).eq("influencer_id", b.id)
    if (codes.length > 0) release = release.not("code", "in", `(${codes.join(",")})`)
    await release
    // ...e liga os novos (um cupom que já é de outra pessoa não é tomado dela)
    if (codes.length > 0) {
      await supabase.from("coupons").update({ influencer_id: b.id }).in("code", codes).is("influencer_id", null)
    }
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAdmin(req, "influencers")
  if ("error" in auth) return auth.error

  const { id, confirmPassword } = await req.json().catch(() => ({}))
  if (typeof id !== "string" || !id) return NextResponse.json({ error: "Conta inválida." }, { status: 400 })
  if (!(await verifyUserPassword(auth.user, confirmPassword))) {
    return NextResponse.json({ error: "Senha de confirmação incorreta." }, { status: 403 })
  }
  const { error } = await createAdminClient().from("admin_accounts").delete().eq("id", id)
  if (error) return NextResponse.json({ error: "Não foi possível excluir." }, { status: 500 })
  return NextResponse.json({ ok: true })
}

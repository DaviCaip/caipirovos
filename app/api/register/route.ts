import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { clientIp } from "@/lib/admin-auth"
import { isValidEmail } from "@/lib/br"
import { sendRegistrationNotification } from "@/lib/notify"

// Cadastros públicos do site (revendedor, produtor, lista de espera, pedido de região).
// Tudo passa por aqui: o navegador NÃO fala mais direto com o banco, então as tabelas podem ficar fechadas.

type Kind = "reseller" | "producer" | "waitlist" | "region"

const TABLE: Record<Kind, string> = { reseller: "resellers", producer: "producers", waitlist: "waitlist", region: "region_requests" }

// Limite de envios por IP (em memória): segura robô sem atrapalhar quem usa de verdade.
const hits = new Map<string, number[]>()
const WINDOW = 10 * 60 * 1000
const MAX_HITS = 10
function limited(ip: string): boolean {
  const now = Date.now()
  const list = (hits.get(ip) || []).filter((t) => now - t < WINDOW)
  list.push(now)
  hits.set(ip, list)
  return list.length > MAX_HITS
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")
const num = (v: unknown) => {
  const n = Number.parseInt(String(v ?? "").split("-")[0], 10)
  return Number.isFinite(n) && n >= 0 && n < 10_000_000 ? n : 0
}
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status })

export async function POST(req: NextRequest) {
  if (limited(clientIp(req))) return bad("Muitos envios seguidos. Tente de novo em alguns minutos.", 429)

  const b = await req.json().catch(() => ({}))
  const kind = b.kind as Kind
  if (!TABLE[kind]) return bad("Formulário inválido.")

  const email = str(b.email, 120).toLowerCase()
  if (!isValidEmail(email)) return bad("Por favor, insira um email válido.")

  let row: Record<string, string | number>
  if (kind === "reseller") {
    if (!str(b.businessName, 120) || !str(b.contactName, 120) || !str(b.phone, 30)) return bad("Preencha os campos obrigatórios.")
    row = {
      business_name: str(b.businessName, 120),
      contact_name: str(b.contactName, 120),
      email,
      phone: str(b.phone, 30),
      business_type: str(b.businessType, 60),
      address: str(b.address, 200),
      city: str(b.city, 80),
      state: str(b.state, 40),
      estimated_monthly_demand: num(b.estimatedMonthlyDemand),
      message: str(b.message, 1000),
    }
  } else if (kind === "producer") {
    if (!str(b.name, 120) || !str(b.phone, 30) || !str(b.farmName, 120)) return bad("Preencha os campos obrigatórios.")
    row = {
      name: str(b.name, 120),
      email,
      phone: str(b.phone, 30),
      farm_name: str(b.farmName, 120),
      location: str(b.location, 200),
      production_capacity: num(b.productionCapacity),
      experience_years: num(b.experienceYears),
      message: str(b.message, 1000),
    }
  } else {
    if (!str(b.name, 120)) return bad("Informe o seu nome.")
    row = { name: str(b.name, 120), email }
    if (kind === "region") {
      if (!str(b.region, 120)) return bad("Informe a sua região.")
      row.region = str(b.region, 120)
    }
  }

  const supabase = createAdminClient()
  const table = TABLE[kind]
  const { data: existing } = await supabase.from(table).select("email").in("email", [email, str(b.email, 120)]).limit(1)
  if (existing && existing.length > 0) {
    const msg = kind === "waitlist" || kind === "region" ? "Este email já está cadastrado!" : "Este email já está cadastrado. Nossa equipe entrará em contato em breve."
    return bad(msg, 409)
  }

  const { error } = await supabase.from(table).insert(row)
  if (error) {
    if ((error as any).code === "23505") return bad("Este email já está cadastrado!", 409)
    console.error("Cadastro público: erro ao salvar:", error.message)
    return bad("Ops! Ocorreu um erro ao enviar seu cadastro. Tente novamente ou entre em contato conosco.", 500)
  }

  if (kind === "reseller" || kind === "producer") await sendRegistrationNotification(kind, row)
  return NextResponse.json({ ok: true })
}

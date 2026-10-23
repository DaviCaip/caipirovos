import { NextRequest, NextResponse } from "next/server"
import { requireAdmin, verifyUserPassword } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  CASHBACK_KEY,
  MAX_PERCENT,
  computeWallets,
  getCashbackSettings,
  maskCpf,
  walletKey,
  type LedgerRow,
} from "@/lib/cashback"

async function loadLedger(): Promise<LedgerRow[]> {
  const { data } = await createAdminClient()
    .from("cashback_ledger")
    .select("id, kind, customer_name, customer_email, customer_cpf, amount_cents, applied, note, created_at")
    .order("created_at", { ascending: false })
    .limit(5000)
  return (data || []) as LedgerRow[]
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, "cashback")
  if ("error" in auth) return auth.error

  const settings = await getCashbackSettings(createAdminClient())
  const ledger = await loadLedger()

  const sum = (f: (r: LedgerRow) => boolean) => ledger.filter(f).reduce((s, r) => s + r.amount_cents, 0)
  const summary = {
    cardCents: sum((r) => r.kind === "card"),
    pixCents: sum((r) => r.kind === "pix"),
    manualAddedCents: sum((r) => r.kind === "adjust" && r.amount_cents > 0),
    usedCents: -sum((r) => r.kind === "adjust" && r.amount_cents < 0),
  }
  const wallets = computeWallets(ledger).map((w) => ({
    key: w.key,
    name: w.name,
    email: w.email,
    cpfMasked: maskCpf(w.cpf),
    balanceCents: w.balanceCents,
    lastAt: w.lastAt,
  }))
  const recent = ledger.slice(0, 40).map((r) => ({
    id: r.id,
    kind: r.kind,
    name: r.customer_name,
    email: r.customer_email,
    amountCents: r.amount_cents,
    note: r.note,
    createdAt: r.created_at,
  }))

  return NextResponse.json({ settings, summary, wallets, recent, maxPercent: MAX_PERCENT })
}

// Liga/desliga e define a porcentagem
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req, "cashback")
  if ("error" in auth) return auth.error

  const b = await req.json().catch(() => ({}))
  const enabled = b.enabled === true
  const percent = Math.round(Number(b.percent) * 10) / 10
  if (enabled && (!Number.isFinite(percent) || percent < 0.5 || percent > MAX_PERCENT)) {
    return NextResponse.json({ error: `Escolha uma porcentagem entre 0,5% e ${MAX_PERCENT}%.` }, { status: 400 })
  }

  const current = await getCashbackSettings(createAdminClient())
  const value = { enabled, percent: Number.isFinite(percent) && percent > 0 ? percent : current.percent }
  const { error } = await createAdminClient()
    .from("site_settings")
    .upsert({ key: CASHBACK_KEY, value, updated_at: new Date().toISOString() }, { onConflict: "key" })
  if (error) return NextResponse.json({ error: "Não foi possível salvar." }, { status: 500 })
  return NextResponse.json({ ok: true, settings: { enabled, percent: value.percent } })
}

// Usar o crédito de um cliente do Pix (baixa) ou dar um crédito manual
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, "cashback")
  if ("error" in auth) return auth.error

  const b = await req.json().catch(() => ({}))
  if (!(await verifyUserPassword(auth.user, b.confirmPassword))) {
    return NextResponse.json({ error: "Senha de confirmação incorreta." }, { status: 403 })
  }
  const type = b.type === "add" ? "add" : "use"
  const reais = Number(b.amount)
  if (!Number.isFinite(reais) || reais <= 0 || reais > 10000) {
    return NextResponse.json({ error: "Informe um valor válido em reais." }, { status: 400 })
  }
  const cents = Math.round(reais * 100)
  const key = typeof b.walletKey === "string" ? b.walletKey : ""
  const note = typeof b.note === "string" ? b.note.trim().slice(0, 200) : ""

  const ledger = await loadLedger()
  const wallet = ledger.find((r) => !r.applied && walletKey(r.customer_email, r.customer_cpf) === key)
  if (!wallet) return NextResponse.json({ error: "Cliente não encontrado na carteira." }, { status: 404 })

  if (type === "use") {
    const balance = computeWallets(ledger).find((w) => w.key === key)?.balanceCents ?? 0
    if (cents > balance) {
      return NextResponse.json({ error: "O valor é maior que o saldo do cliente." }, { status: 400 })
    }
  }

  const { error } = await createAdminClient()
    .from("cashback_ledger")
    .insert({
      kind: "adjust",
      customer_name: wallet.customer_name,
      customer_email: wallet.customer_email,
      customer_cpf: wallet.customer_cpf,
      amount_cents: type === "use" ? -cents : cents,
      applied: false,
      note: note || (type === "use" ? "Crédito usado" : "Crédito manual"),
    })
  if (error) return NextResponse.json({ error: "Não foi possível registrar." }, { status: 500 })
  return NextResponse.json({ ok: true })
}

import type { SupabaseClient } from "@supabase/supabase-js"

// CASHBACK
//  - Cartão: depois que cada fatura é paga, o Stripe recebe um crédito na conta do cliente.
//    O Stripe desconta esse crédito sozinho da próxima fatura (vale para a assinatura mensal).
//  - Pix: o crédito fica guardado numa "carteira" (por CPF + e-mail) e o Davi dá baixa no painel quando usar.
// O cashback é calculado sobre o que o cliente REALMENTE pagou (já com cupom, sem contar crédito anterior).
// Desligado por padrão: só passa a valer quando o Davi liga e define a porcentagem no painel.

export const CASHBACK_KEY = "cashback"
export const MAX_PERCENT = 50

export interface CashbackSettings {
  enabled: boolean
  percent: number
}

export async function getCashbackSettings(supabase: SupabaseClient): Promise<CashbackSettings> {
  const { data } = await supabase.from("site_settings").select("value").eq("key", CASHBACK_KEY).maybeSingle()
  const v: any = data?.value
  const percent = Number(v?.percent)
  const valid = Number.isFinite(percent) && percent > 0 && percent <= MAX_PERCENT
  return { enabled: v?.enabled === true && valid, percent: valid ? percent : 0 }
}

export function creditFor(baseCents: number, percent: number): number {
  return Math.floor((baseCents * percent) / 100)
}

export interface CardInvoice {
  invoiceId: string
  invoiceNumber: string | null
  amountPaidCents: number
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  email: string | null
  name: string | null
}

type StripeLike = {
  customers: {
    createBalanceTransaction: (
      id: string,
      params: { amount: number; currency: string; description?: string; metadata?: Record<string, string> },
      options?: { idempotencyKey?: string }
    ) => Promise<unknown>
  }
}

/** Cartão: credita no saldo do cliente no Stripe (desconta sozinho na próxima fatura). Seguro contra eventos repetidos. */
export async function grantCardCashback(args: {
  supabase: SupabaseClient
  stripe: StripeLike
  settings: CashbackSettings
  invoice: CardInvoice
}): Promise<"granted" | "skipped" | "duplicate"> {
  const { supabase, stripe, settings, invoice } = args
  if (!settings.enabled) return "skipped"
  if (invoice.amountPaidCents <= 0 || !invoice.stripeCustomerId) return "skipped"
  const credit = creditFor(invoice.amountPaidCents, settings.percent)
  if (credit < 1) return "skipped"

  const sourceId = `inv_${invoice.invoiceId}`
  const { error } = await supabase.from("cashback_ledger").insert({
    kind: "card",
    source_id: sourceId,
    customer_name: invoice.name,
    customer_email: invoice.email,
    stripe_customer_id: invoice.stripeCustomerId,
    stripe_subscription_id: invoice.stripeSubscriptionId,
    base_cents: invoice.amountPaidCents,
    percent: settings.percent,
    amount_cents: credit,
    applied: true,
  })
  if (error) {
    if ((error as any).code === "23505") return "duplicate"
    throw error
  }

  try {
    await stripe.customers.createBalanceTransaction(
      invoice.stripeCustomerId,
      {
        amount: -credit, // negativo = crédito para o cliente
        currency: "brl",
        description: `Cashback ${settings.percent}% (fatura ${invoice.invoiceNumber || invoice.invoiceId})`,
        metadata: { invoice: invoice.invoiceId, source: "caipirovos-cashback" },
      },
      { idempotencyKey: `cashback_${invoice.invoiceId}` }
    )
  } catch (e) {
    // não deixa registro de crédito que o Stripe não recebeu; o Stripe tenta o evento de novo
    await supabase.from("cashback_ledger").delete().eq("source_id", sourceId)
    throw e
  }
  return "granted"
}

/** Pix: guarda o crédito na carteira do cliente (CPF + e-mail). */
export async function grantPixCashback(args: {
  supabase: SupabaseClient
  settings: CashbackSettings
  paymentId: string
  customer: { name: string | null; email: string | null; cpf: string | null }
  amountPaidCents: number
}): Promise<"granted" | "skipped" | "duplicate"> {
  const { supabase, settings, paymentId, customer, amountPaidCents } = args
  if (!settings.enabled || amountPaidCents <= 0) return "skipped"
  const credit = creditFor(amountPaidCents, settings.percent)
  if (credit < 1) return "skipped"

  const { error } = await supabase.from("cashback_ledger").insert({
    kind: "pix",
    source_id: `pix_${paymentId}`,
    customer_name: customer.name,
    customer_email: customer.email,
    customer_cpf: customer.cpf,
    base_cents: amountPaidCents,
    percent: settings.percent,
    amount_cents: credit,
    applied: false,
  })
  if (error) {
    if ((error as any).code === "23505") return "duplicate"
    throw error
  }
  return "granted"
}

export interface LedgerRow {
  id: string
  kind: "card" | "pix" | "adjust"
  customer_name: string | null
  customer_email: string | null
  customer_cpf: string | null
  amount_cents: number
  applied: boolean
  note: string | null
  created_at: string
}

export const walletKey = (email: string | null, cpf: string | null) =>
  `${(email || "").trim().toLowerCase()}|${(cpf || "").replace(/\D/g, "")}`

/** Saldo na carteira (Pix e ajustes manuais), por cliente. */
export function computeWallets(rows: LedgerRow[]) {
  const map = new Map<string, { key: string; name: string | null; email: string | null; cpf: string | null; balanceCents: number; lastAt: string }>()
  for (const r of rows) {
    if (r.applied) continue // cartão: já virou desconto no Stripe
    const key = walletKey(r.customer_email, r.customer_cpf)
    const w = map.get(key) ?? { key, name: r.customer_name, email: r.customer_email, cpf: r.customer_cpf, balanceCents: 0, lastAt: r.created_at }
    w.balanceCents += r.amount_cents
    if (!w.name && r.customer_name) w.name = r.customer_name
    if (r.created_at > w.lastAt) w.lastAt = r.created_at
    map.set(key, w)
  }
  return Array.from(map.values())
    .filter((w) => w.balanceCents > 0)
    .sort((a, b) => b.balanceCents - a.balanceCents)
}

export const maskCpf = (cpf: string | null) => {
  const d = (cpf || "").replace(/\D/g, "")
  return d.length === 11 ? `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**` : "—"
}

import { randomInt } from "crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import { hashPassword, type CustomerRow } from "@/lib/customer-auth"
import { onlyDigits } from "@/lib/br"

// Cadastro do assinante: nasce junto com o pedido e só vira conta quando o pagamento é confirmado.
// (Assim ninguém "reserva" o CPF de outra pessoa só preenchendo o formulário sem pagar.)

/** Guarda o cadastro (com a senha já em hash) até o pagamento ser confirmado. Devolve o id do cadastro. */
export async function createPendingSignup(
  supabase: SupabaseClient,
  a: { cpf: string; name: string; email: string; phone: string; password: string }
): Promise<string> {
  // limpeza: cadastros que nunca foram pagos e têm mais de 7 dias
  await supabase.from("pending_signups").delete().lt("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
  const { data, error } = await supabase
    .from("pending_signups")
    .insert({ cpf_digits: onlyDigits(a.cpf), name: a.name, email: a.email, phone: a.phone, password_hash: hashPassword(a.password) })
    .select("id")
    .single()
  if (error || !data) throw error || new Error("Falha ao guardar o cadastro")
  return data.id
}

/**
 * Cria a conta do assinante a partir do cadastro, se esse CPF ainda não tiver conta.
 * Quem já tem conta mantém a senha que já tinha (a senha digitada numa nova compra é descartada).
 */
export async function ensureCustomerAccount(
  supabase: SupabaseClient,
  a: { cpf: string | null | undefined; name: string | null; email: string | null; phone: string | null; signupId?: string | null }
): Promise<"created" | "exists" | "no-signup"> {
  const cpf = onlyDigits(a.cpf || "")
  if (cpf.length !== 11) return "no-signup"

  const { data: existing } = await supabase.from("customers").select("id").eq("cpf_digits", cpf).maybeSingle()
  if (existing) {
    if (a.signupId) await supabase.from("pending_signups").delete().eq("id", a.signupId)
    return "exists"
  }
  if (!a.signupId) return "no-signup"

  const { data: s } = await supabase.from("pending_signups").select("password_hash, cpf_digits").eq("id", a.signupId).maybeSingle()
  if (!s || s.cpf_digits !== cpf) return "no-signup" // o CPF do cadastro tem que ser o da compra paga

  const { error } = await supabase.from("customers").insert({
    cpf_digits: cpf,
    name: a.name || "Cliente",
    email: a.email,
    phone: a.phone,
    password_hash: s.password_hash,
  })
  if (error) {
    if ((error as any).code === "23505") return "exists" // outra confirmação criou no mesmo instante
    throw error
  }
  await supabase.from("pending_signups").delete().eq("id", a.signupId)
  return "created"
}

/**
 * Assinaturas que esta conta enxerga: as do mesmo CPF cujo e-mail OU telefone é o da conta.
 * Isso impede que alguém que só sabe o CPF de outra pessoa veja pedidos que não são dele.
 */
export async function visibleSubscriptions(supabase: SupabaseClient, customer: CustomerRow): Promise<any[]> {
  const { data } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("cpf_digits", customer.cpf_digits)
    .order("created_at", { ascending: false })
  const email = (customer.email || "").trim().toLowerCase()
  const phone = onlyDigits(customer.phone || "")
  return (data || []).filter((s: any) => {
    if (!email && !phone) return true
    const sameEmail = !!email && (s.customer_email || "").trim().toLowerCase() === email
    const samePhone = !!phone && onlyDigits(s.customer_phone || "") === phone
    return sameEmail || samePhone
  })
}

export interface CustomerDelivery {
  id: string
  subscriptionId: string
  status: string
  dueDate: string
  plan: string
  acceptedAt: string
  preparingAt: string | null
  outAt: string | null
  deliveredAt: string | null
  failedReason: string | null
}

/** Entregas do assinante (sem nome do entregador, telefone nem endereço de ninguém). */
export async function loadCustomerDeliveries(
  supabase: SupabaseClient,
  subs: { id: string | number; plan_name: string | null }[]
): Promise<CustomerDelivery[]> {
  if (subs.length === 0) return []
  const planOf = new Map(subs.map((s) => [String(s.id), s.plan_name || ""]))
  const { data } = await supabase
    .from("deliveries")
    .select("*")
    .in("subscription_id", subs.map((s) => String(s.id)))
    .order("created_at", { ascending: false })
    .limit(40)
  return (data || []).map((d: any) => ({
    id: d.id,
    subscriptionId: String(d.subscription_id),
    status: d.status,
    dueDate: d.due_date,
    plan: d.plan_name || planOf.get(String(d.subscription_id)) || "",
    acceptedAt: d.accepted_at || d.created_at,
    preparingAt: d.preparing_at,
    outAt: d.out_at,
    deliveredAt: d.delivered_at,
    failedReason: d.status === "failed" ? d.failed_reason : null,
  }))
}

/** Senha provisória legível (sem letras parecidas), para a equipe passar pelo WhatsApp. */
export function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
  return Array.from({ length: 10 }, () => chars[randomInt(chars.length)]).join("")
}

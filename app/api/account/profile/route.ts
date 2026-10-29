import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { formatCep, formatPhone, isValidEmail, isValidPhone, onlyDigits } from "@/lib/br"
import { requireCustomer } from "@/lib/customer-auth"
import { visibleSubscriptions } from "@/lib/customers"
import { DELIVERY_CITY, DELIVERY_DAYS, DELIVERY_PERIODS } from "@/lib/delivery"

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim()
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "")

/** O assinante edita os próprios dados. Nome e CPF não mudam por aqui (só a equipe altera). */
export async function PATCH(req: NextRequest) {
  const auth = await requireCustomer(req)
  if ("error" in auth) return auth.error
  const { customer } = auth

  const b = await req.json().catch(() => ({}))
  const phone = clean(b.phone, 20)
  const email = clean(b.email, 120)
  const cep = clean(b.cep, 9)
  const street = clean(b.street, 150)
  const number = clean(b.number, 15)
  const neighborhood = clean(b.neighborhood, 80)
  const complement = clean(b.complement, 80)
  const reference = clean(b.reference, 150)
  const instructions = clean(b.instructions, 300)
  const deliveryDay = DELIVERY_DAYS.includes(b.deliveryDay) ? b.deliveryDay : null
  const deliveryPeriod = DELIVERY_PERIODS.includes(b.deliveryPeriod) ? b.deliveryPeriod : null

  const fields: Record<string, string> = {}
  if (!isValidPhone(phone)) fields.phone = "WhatsApp inválido (com DDD)"
  if (!isValidEmail(email)) fields.email = "E-mail inválido"
  if (onlyDigits(cep).length !== 8) fields.cep = "CEP inválido"
  if (!street) fields.street = "Rua obrigatória"
  if (!number) fields.number = "Número obrigatório"
  if (!neighborhood) fields.neighborhood = "Bairro obrigatório"
  if (!deliveryDay || !deliveryPeriod) fields.deliveryDay = "Escolha dia e período"
  if (Object.keys(fields).length > 0) return NextResponse.json({ error: "Confira os dados.", fields }, { status: 400 })

  // Só entregamos em Feira de Santana (se o ViaCEP estiver fora do ar, não bloqueia)
  try {
    const res = await fetch(`https://viacep.com.br/ws/${onlyDigits(cep)}/json/`, { signal: AbortSignal.timeout(3000), cache: "no-store" })
    if (res.ok) {
      const j = await res.json()
      if (!j.erro && j.localidade && norm(j.localidade) !== norm(DELIVERY_CITY)) {
        return NextResponse.json({ error: `Esse CEP é de ${j.localidade}. Entregamos apenas em ${DELIVERY_CITY}.`, fields: { cep: "Fora da área de entrega" } }, { status: 400 })
      }
    }
  } catch {}

  const supabase = createAdminClient()
  const subs = await visibleSubscriptions(supabase, customer)
  const ids = subs.map((s) => String(s.id))

  // contato novo vale para a conta e para todas as assinaturas dela (assim elas continuam aparecendo para você)
  const phoneFmt = formatPhone(phone)
  await supabase.from("customers").update({ email, phone: phoneFmt }).eq("id", customer.id)
  if (ids.length > 0) {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        customer_email: email,
        customer_phone: phoneFmt,
        cep: formatCep(cep),
        street,
        number,
        neighborhood,
        observation: complement,
        reference_point: reference || null,
        delivery_day: deliveryDay,
        delivery_period: deliveryPeriod,
        delivery_instructions: instructions || null,
      })
      .in("id", ids)
    if (error) return NextResponse.json({ error: "Não foi possível salvar." }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

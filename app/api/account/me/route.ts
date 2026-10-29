import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getStripe } from "@/lib/stripe"
import { maskCpf } from "@/lib/cashback"
import { requireCustomer } from "@/lib/customer-auth"
import { loadCustomerDeliveries, visibleSubscriptions } from "@/lib/customers"
import { PLANS, getPlanByName } from "@/lib/plans"

export const dynamic = "force-dynamic"

// Tudo que o assinante vê na área dele. Só dados DELE; nada de outros clientes.
export async function GET(req: NextRequest) {
  const auth = await requireCustomer(req)
  if ("error" in auth) return auth.error
  const { customer } = auth

  const supabase = createAdminClient()
  const subs = await visibleSubscriptions(supabase, customer)
  const deliveries = await loadCustomerDeliveries(supabase, subs)

  // situação ao vivo das assinaturas no cartão (cancelamento agendado e próxima cobrança)
  const stripe = getStripe()
  const live = new Map<string, { cancelAtPeriodEnd: boolean; periodEnd: string | null; ended: boolean }>()
  await Promise.all(
    subs
      .filter((s) => s.stripe_subscription_id && s.status === "active")
      .map(async (s) => {
        try {
          const sub = await stripe.subscriptions.retrieve(s.stripe_subscription_id)
          const end = sub.items?.data?.[0]?.current_period_end
          live.set(String(s.id), {
            cancelAtPeriodEnd: !!sub.cancel_at_period_end,
            periodEnd: end ? new Date(end * 1000).toISOString() : null,
            ended: sub.status === "canceled" || sub.status === "incomplete_expired",
          })
        } catch {
          // sem a situação ao vivo a tela ainda funciona
        }
      })
  )

  return NextResponse.json({
    customer: {
      name: customer.name,
      cpfMasked: maskCpf(customer.cpf_digits),
      email: customer.email,
      phone: customer.phone,
      mustChangePassword: customer.must_change_password,
    },
    subscriptions: subs.map((s) => {
      const l = live.get(String(s.id))
      const plan = getPlanByName(s.plan_name)
      return {
        id: String(s.id),
        plan: s.plan_name,
        eggs: plan?.eggs ?? 0,
        priceCents: plan?.priceInCents ?? 0,
        status: l?.ended ? "canceled" : s.status,
        paymentMethod: s.stripe_subscription_id ? "card" : "pix",
        cancelAtPeriodEnd: l?.cancelAtPeriodEnd ?? false,
        periodEnd: l?.periodEnd ?? null,
        createdAt: s.created_at,
        cep: s.cep || "",
        street: s.street || "",
        number: s.number || "",
        neighborhood: s.neighborhood || "",
        complement: s.observation || "",
        reference: s.reference_point || "",
        deliveryDay: s.delivery_day || "",
        deliveryPeriod: s.delivery_period || "",
        instructions: s.delivery_instructions || "",
      }
    }),
    deliveries,
    plans: PLANS.map((p) => ({ name: p.name, eggs: p.eggs, priceInCents: p.priceInCents })),
    now: new Date().toISOString(),
  })
}

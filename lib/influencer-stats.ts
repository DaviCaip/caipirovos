import { createAdminClient } from "@/lib/supabase/admin"
import { getPlanByName } from "@/lib/plans"

// Uma "compra de verdade" com cupom:
//  - cartão: a assinatura só existe no banco depois que o pagamento foi concluído;
//  - Pix: só conta quando o Mercado Pago confirmou (status "active"). Pix gerado e não pago não conta.
// Só saem daqui dados anônimos (data, plano, valor do desconto). Nada de nome, CPF, e-mail ou endereço do cliente.

export interface Purchase {
  at: string
  plan: string
  eggs: number
  code: string
  discountCents: number
}

export async function loadPurchases(codes: string[]): Promise<Purchase[]> {
  if (codes.length === 0) return []
  const { data } = await createAdminClient()
    .from("subscriptions")
    .select("created_at, paid_at, plan_name, coupon_code, discount_cents, payment_method, status")
    .in("coupon_code", codes)
    .order("created_at", { ascending: false })
    .limit(5000)

  return (data || [])
    .filter((r: any) => r.payment_method === "card" || (r.payment_method === "pix" && r.status === "active"))
    .map((r: any) => ({
      at: r.paid_at || r.created_at,
      plan: r.plan_name || "",
      eggs: getPlanByName(r.plan_name)?.eggs ?? 0,
      code: r.coupon_code,
      discountCents: Number(r.discount_cents || 0),
    }))
}

import { createAdminClient } from "@/lib/supabase/admin"
import type { Plan } from "@/lib/plans"

export interface CouponRow {
  code: string
  description: string | null
  discount_type: "percent" | "fixed"
  discount_value: number // percent: 1-100 | fixed: centavos
  duration: "once" | "forever"
  active: boolean
  max_uses: number | null
  used_count: number
  expires_at: string | null
  allowed_plans: string[] | null
}

export type CouponResult =
  | { ok: true; coupon: CouponRow; discountCents: number; finalCents: number }
  | { ok: false; error: string }

export function normalizeCode(code: unknown): string {
  return typeof code === "string" ? code.trim().toUpperCase().replace(/\s+/g, "") : ""
}

/** Retorna null quando não há cupom informado. */
export async function resolveCoupon(code: unknown, plan: Plan): Promise<CouponResult | null> {
  const normalized = normalizeCode(code)
  if (!normalized) return null

  const invalid: CouponResult = { ok: false, error: "Cupom inválido ou expirado." }

  const supabase = createAdminClient()
  const { data, error } = await supabase.from("coupons").select("*").eq("code", normalized).maybeSingle()
  if (error || !data) return invalid

  const c = data as CouponRow
  if (!c.active) return invalid
  if (c.expires_at && new Date(c.expires_at).getTime() < Date.now()) return invalid
  if (c.max_uses !== null && c.used_count >= c.max_uses) return { ok: false, error: "Este cupom já atingiu o limite de usos." }
  if (c.allowed_plans && c.allowed_plans.length > 0) {
    const allowed = c.allowed_plans.map((p) => p.toLowerCase())
    if (!allowed.includes(plan.name.toLowerCase())) {
      return { ok: false, error: `Este cupom não vale para o plano ${plan.name}.` }
    }
  }

  const price = plan.priceInCents
  const discountCents =
    c.discount_type === "percent" ? Math.round((price * c.discount_value) / 100) : Math.min(c.discount_value, price)
  const finalCents = price - discountCents

  // Mercado Pago/Stripe não processam valor zerado ou irrisório.
  if (finalCents < 100) return { ok: false, error: "Este cupom não pode ser usado neste plano." }

  return { ok: true, coupon: c, discountCents, finalCents }
}

export function couponLabel(c: CouponRow): string {
  return c.discount_type === "percent"
    ? `${c.discount_value}% de desconto`
    : `R$ ${(c.discount_value / 100).toFixed(2).replace(".", ",")} de desconto`
}

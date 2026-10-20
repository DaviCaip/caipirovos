import { NextRequest, NextResponse } from "next/server"
import { getPlanByName } from "@/lib/plans"
import { couponLabel, resolveCoupon } from "@/lib/coupons"

export async function POST(req: NextRequest) {
  try {
    const { code, planName } = await req.json()
    const plan = getPlanByName(planName)
    if (!plan) return NextResponse.json({ valid: false, error: "Plano inválido." }, { status: 400 })

    const result = await resolveCoupon(code, plan)
    if (!result) return NextResponse.json({ valid: false, error: "Digite um cupom." }, { status: 400 })
    if (!result.ok) return NextResponse.json({ valid: false, error: result.error })

    return NextResponse.json({
      valid: true,
      code: result.coupon.code,
      label: couponLabel(result.coupon),
      discountCents: result.discountCents,
      finalCents: result.finalCents,
    })
  } catch {
    return NextResponse.json({ valid: false, error: "Não foi possível validar o cupom." }, { status: 500 })
  }
}

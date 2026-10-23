import { NextRequest, NextResponse } from "next/server"
import { MercadoPagoConfig, Payment } from "mercadopago"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCashbackSettings, grantPixCashback } from "@/lib/cashback"

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
})

// O Mercado Pago avisa aqui quando um Pix muda de status.
// Não confiamos no corpo da notificação: só usamos o id e consultamos o status direto na API do Mercado Pago.
export async function POST(req: NextRequest) {
  const url = new URL(req.url)
  let body: any = {}
  try {
    body = await req.json()
  } catch {}

  const type = body?.type || url.searchParams.get("type") || url.searchParams.get("topic")
  const id = body?.data?.id || url.searchParams.get("data.id") || url.searchParams.get("id")
  if (type !== "payment" || !id) return NextResponse.json({ ignored: true })

  try {
    const payment = await new Payment(client).get({ id: String(id) })
    const supabase = createAdminClient()

    if (payment.status === "approved") {
      const { data, error } = await supabase
        .from("subscriptions")
        .update({ status: "active", paid_at: new Date().toISOString() })
        .eq("payment_id", String(id))
        .eq("status", "pending")
        .select("coupon_code, customer_name, customer_email, customer_cpf, amount_cents")
      if (error) throw error

      // Só conta o uso do cupom na transição pending -> active (evita contar duas vezes se o aviso se repetir).
      const row = data?.[0]
      if (row?.coupon_code) await supabase.rpc("increment_coupon_use", { p_code: row.coupon_code })

      // Cashback do Pix: vai para a carteira do cliente (não derruba o aviso do Mercado Pago se falhar).
      if (row) {
        try {
          const settings = await getCashbackSettings(supabase)
          await grantPixCashback({
            supabase,
            settings,
            paymentId: String(id),
            customer: { name: row.customer_name, email: row.customer_email, cpf: row.customer_cpf },
            amountPaidCents: Number(row.amount_cents || 0),
          })
        } catch (err: any) {
          console.error("Webhook Pix: falha no cashback:", err?.message || err)
        }
      }
    } else if (payment.status === "cancelled" || payment.status === "rejected") {
      await supabase
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("payment_id", String(id))
        .eq("status", "pending")
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("Erro no webhook do Pix:", error?.message || error)
    return NextResponse.json({ error: "Erro ao processar" }, { status: 500 })
  }
}

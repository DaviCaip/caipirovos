import { Resend } from "resend"
import type { DeliveryData } from "@/lib/delivery"
import { DELIVERY_CITY, DELIVERY_STATE } from "@/lib/delivery"
import { formatBRL } from "@/lib/plans"

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

interface OrderNotification {
  planName: string
  paymentMethod: "Cartão de crédito" | "Pix"
  delivery: DeliveryData
  couponCode?: string
  discountCents: number
  amountCents: number
}

/** Nunca lança erro: falha de e-mail não pode derrubar o checkout. */
export async function sendOrderNotification(o: OrderNotification) {
  try {
    if (!process.env.RESEND_API_KEY || !process.env.NOTIFICATION_EMAIL) return
    const resend = new Resend(process.env.RESEND_API_KEY)
    const d = o.delivery
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: process.env.NOTIFICATION_EMAIL,
      subject: `Novo pedido de assinatura - ${o.planName} (${o.paymentMethod})`,
      html: `
        <h2>Novo pedido de assinatura</h2>
        <p><em>Pedido iniciado — o pagamento ainda pode não ter sido concluído.</em></p>
        <h3>Plano: ${esc(o.planName)}</h3>
        <p><strong>Forma de pagamento:</strong> ${esc(o.paymentMethod)}</p>
        <p><strong>Valor do 1º pagamento:</strong> ${formatBRL(o.amountCents)}${
          o.couponCode ? ` (cupom ${esc(o.couponCode)}: -${formatBRL(o.discountCents)})` : ""
        }</p>
        <hr/>
        <h3>Cliente</h3>
        <p><strong>Nome:</strong> ${esc(d.name)}</p>
        <p><strong>WhatsApp:</strong> ${esc(d.phone)}</p>
        <p><strong>E-mail:</strong> ${esc(d.email)}</p>
        <p><strong>CPF:</strong> ${esc(d.cpf)}</p>
        <hr/>
        <h3>Entrega</h3>
        <p><strong>Endereço:</strong> ${esc(d.street)}, ${esc(d.number)}${d.complement ? ` - ${esc(d.complement)}` : ""}</p>
        <p><strong>Bairro:</strong> ${esc(d.neighborhood)} — ${DELIVERY_CITY}/${DELIVERY_STATE}</p>
        <p><strong>CEP:</strong> ${esc(d.cep)}</p>
        <p><strong>Ponto de referência:</strong> ${esc(d.reference) || "Não informado"}</p>
        <p><strong>Preferência de dia:</strong> ${esc(d.deliveryDay)}</p>
        <p><strong>Preferência de período:</strong> ${esc(d.deliveryPeriod)}</p>
        <p><strong>Instruções:</strong> ${esc(d.instructions) || "Nenhuma"}</p>
      `,
    })
  } catch (err) {
    console.error("Falha ao enviar e-mail de notificação:", err)
  }
}

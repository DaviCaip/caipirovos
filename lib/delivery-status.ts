// Etapas da entrega e regras de quem pode mudar de qual etapa para qual.
// Fica num arquivo sem código de servidor para o painel e o app do entregador usarem os mesmos textos.

export type DeliveryStatus = "accepted" | "preparing" | "out" | "delivered" | "failed" | "canceled"

export const STATUS_INFO: Record<DeliveryStatus, { label: string; emoji: string; badge: string }> = {
  accepted: { label: "Pedido aceito", emoji: "📥", badge: "bg-blue-100 text-blue-800" },
  preparing: { label: "Em preparo", emoji: "🧺", badge: "bg-amber-100 text-amber-800" },
  out: { label: "Saiu para entrega", emoji: "🚚", badge: "bg-purple-100 text-purple-800" },
  delivered: { label: "Entregue", emoji: "✅", badge: "bg-green-100 text-green-800" },
  failed: { label: "Não entregue", emoji: "⚠️", badge: "bg-red-100 text-red-800" },
  canceled: { label: "Cancelada", emoji: "🚫", badge: "bg-gray-200 text-gray-700" },
}

export const OPEN_STATUSES: DeliveryStatus[] = ["accepted", "preparing", "out", "failed"]

export const isOpen = (s: string) => (OPEN_STATUSES as string[]).includes(s)

/** Painel (quem gerencia entregas) */
export const MANAGER_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  accepted: ["preparing", "out", "canceled"],
  preparing: ["accepted", "out", "canceled"],
  out: ["delivered", "failed", "preparing"],
  delivered: ["out"], // desfazer um "entregue" marcado sem querer
  failed: ["out", "accepted", "canceled"],
  canceled: ["accepted"],
}

/** App do entregador: só anda para frente */
export const COURIER_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  accepted: ["out"],
  preparing: ["out"],
  out: ["delivered", "failed"],
  failed: ["out"],
  delivered: [],
  canceled: [],
}

export const FAIL_REASONS = [
  "Ninguém atendeu",
  "Endereço não encontrado",
  "Cliente pediu outro dia",
  "Cliente recusou",
  "Outro motivo",
]

// ---------- links úteis ----------
export interface AddressParts {
  street?: string | null
  number?: string | null
  neighborhood?: string | null
  city?: string | null
  cep?: string | null
}

export function mapsUrl(a: AddressParts): string {
  const q = [a.street && `${a.street}${a.number ? `, ${a.number}` : ""}`, a.neighborhood, a.city || "Feira de Santana", "BA", a.cep]
    .filter(Boolean)
    .join(", ")
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

export function whatsappUrl(phone: string | null | undefined, text: string): string | null {
  const d = (phone || "").replace(/\D/g, "")
  if (d.length < 10) return null
  return `https://wa.me/${d.startsWith("55") && d.length >= 12 ? d : `55${d}`}?text=${encodeURIComponent(text)}`
}

export function whatsappMessage(status: DeliveryStatus, fullName: string): string {
  const first = (fullName || "").trim().split(/\s+/)[0] || ""
  if (status === "out") return `Olá, ${first}! Aqui é do Caipirovos 🥚 Estou a caminho com o seu pedido!`
  if (status === "failed") return `Olá, ${first}! Aqui é do Caipirovos 🥚 Tentei entregar o seu pedido e não consegui. Qual o melhor horário para eu voltar?`
  return `Olá, ${first}! Aqui é do Caipirovos 🥚 Vou fazer a entrega do seu pedido. Posso passar hoje?`
}

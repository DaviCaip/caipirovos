// Fonte única dos planos. Site, checkout (Stripe/Pix), admin e entregas leem daqui.
// Para mudar preço, ovos, benefícios ou frequência de entrega, mexa só neste arquivo.

export type PlanId = "basic" | "raiz" | "empreendedor"

export interface Plan {
  id: PlanId
  name: string
  eggs: number
  priceInCents: number
  /** A cada quantos dias o admin agenda a próxima entrega (7 = semanal, 15 = quinzenal, 30 = mensal) */
  deliveryDays: number
  popular?: boolean
  features: string[]
}

const BASE_FEATURES = ["Entrega grátis", "Ovos sempre frescos", "Flexibilidade para pausar"]

export const PLANS: Plan[] = [
  {
    id: "basic",
    name: "Basic",
    eggs: 60,
    priceInCents: 6999,
    deliveryDays: 30,
    features: [
      ...BASE_FEATURES,
      // TODO: confirmar com o Davi quais são os 1-2 benefícios novos do Basic
      "Escolha o melhor dia e período para receber",
      "Atendimento direto pelo WhatsApp",
    ],
  },
  {
    id: "raiz",
    name: "Raiz",
    eggs: 150,
    priceInCents: 17499,
    deliveryDays: 30,
    popular: true,
    features: [...BASE_FEATURES, "Escolha o melhor dia e período para receber", "Suporte prioritário"],
  },
  {
    id: "empreendedor",
    name: "Empreendedor",
    eggs: 300,
    priceInCents: 29900,
    deliveryDays: 30,
    features: [...BASE_FEATURES, "Escolha o melhor dia e período para receber", "Suporte prioritário"],
  },
]

// Planos antigos que podem ter assinantes ativos no banco. "Raiz" existe nos dois, vale o novo.
const LEGACY_DELIVERY_DAYS: Record<string, number> = {
  colheita: 15,
  granja: 7,
  reserva: 7,
}

export function getPlanByName(name: unknown): Plan | undefined {
  if (typeof name !== "string") return undefined
  const key = name.trim().toLowerCase()
  return PLANS.find((p) => p.name.toLowerCase() === key || p.id === key)
}

export function getDeliveryDays(planName: string | null | undefined): number {
  const key = (planName || "").trim().toLowerCase()
  const plan = PLANS.find((p) => p.name.toLowerCase() === key)
  if (plan) return plan.deliveryDays
  return LEGACY_DELIVERY_DAYS[key] ?? 30
}

export function frequencyLabel(days: number): string {
  if (days <= 7) return "semanal"
  if (days <= 15) return "quinzenal"
  return "mensal"
}

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

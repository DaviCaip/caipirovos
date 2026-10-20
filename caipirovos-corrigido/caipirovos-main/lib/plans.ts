// ✏️ PLANOS E PREÇOS — para mudar planos no futuro, edite SÓ este arquivo.
// O site (cartões) e o servidor (cobrança Stripe/Pix) leem daqui.
// priceInCents = preço em centavos (R$ 109,99 = 10999).

export interface Plan {
  name: string
  eggs: string
  frequency: string
  priceInCents: number
  savings: string
  note: string
  popular?: boolean
  features: string[]
}

export const PLANS: Plan[] = [
  {
    name: "Raiz",
    eggs: "120 ovos",
    frequency: "Quinzenal",
    priceInCents: 10999,
    savings: "Economize 15%",
    note: "placas com 30 ovos",
    features: ["Entrega grátis", "Ovos sempre frescos", "Flexibilidade para pausar"],
  },
  {
    name: "Colheita",
    eggs: "240 ovos",
    frequency: "Quinzenal",
    priceInCents: 19999,
    savings: "Economize 20%",
    note: "placas com 30 ovos",
    popular: true,
    features: ["Entrega grátis", "Ovos sempre frescos", "Flexibilidade para pausar", "Desconto especial"],
  },
  {
    name: "Granja",
    eggs: "360 ovos",
    frequency: "Semanal",
    priceInCents: 28999,
    savings: "Economize 25%",
    note: "placas com 30 ovos",
    features: ["Entrega grátis", "Ovos sempre frescos", "Flexibilidade para pausar", "Suporte prioritário"],
  },
  {
    name: "Reserva",
    eggs: "720 ovos",
    frequency: "Semanal",
    priceInCents: 52999,
    savings: "Economize 25%",
    note: "placas com 30 ovos",
    features: ["Entrega grátis", "Ovos sempre frescos", "Flexibilidade para pausar", "Suporte prioritário"],
  },
]

export function getPlan(name: unknown): Plan | undefined {
  return PLANS.find((p) => p.name === name)
}

export function formatPrice(cents: number): string {
  const [reais, centavos] = (cents / 100).toFixed(2).split(".")
  return `R$ ${reais.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${centavos}`
}

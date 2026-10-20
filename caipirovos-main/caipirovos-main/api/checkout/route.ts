"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Truck, Calendar, Gift, Star, ArrowRight } from "lucide-react"
import { PopupForm } from "./popup-form"

export function SubscriptionSection() {
  const [isWaitlistPopupOpen, setIsWaitlistPopupOpen] = useState(false)
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  const plans = [
    {
      name: "Raiz",
      eggs: "4 placas",
      frequency: "Quinzenal",
      price: "R$ 0,00",
      priceInCents: 0,
      savings: "Economize 15%",
      note: "placas com 30 ovos",
      features: ["Entrega grátis", "Ovos sempre frescos", "Flexibilidade para pausar"],
    },
    {
      name: "Colheita",
      eggs: "8 placas",
      frequency: "Semanal",
      price: "R$ 0,00",
      priceInCents: 0,
      savings: "Economize 20%",
      note: "placas com 30 ovos",
      popular: true,
      features: ["Entrega grátis", "Ovos sempre frescos", "Flexibilidade para pausar", "Desconto especial"],
    },
    {
      name: "Granja",
      eggs: "12 placas",
      frequency: "Semanal",
      price: "R$ 0,00",
      priceInCents: 0,
      savings: "Economize 25%",
      note: "placas com 30 ovos",
      features: ["Entrega grátis", "Ovos sempre frescos", "Flexibilidade para pausar", "Suporte prioritário"],
    },
    {
      name: "Reserva",
      eggs: "24 placas",
      frequency: "Semanal",
      price: "R$ 0,00",
      priceInCents: 0,
      savings: "Economize 25%",
      note: "placas com 30 ovos",
      features: ["Entrega grátis", "Ovos sempre frescos", "Flexibilidade para pausar", "Suporte prioritário"],
    },
  ]

  async function handleCheckout(planName: string, priceInCents: number) {
    setLoadingPlan(planName)
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planName, price: priceInCents }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch (error) {
      alert("Erro ao redirecionar para o pagamento. Tente novamente.")
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <section id="assinatura" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-secondary/20 text-secondary-foreground px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Gift className="h-4 w-4" />
            <span>Em Breve - Lançamento</span>
          </div>

          <h2 className="text-3xl lg:text-4xl font-bold text-balance mb-6">
            Assinatura <span className="text-primary">Caipirovos</span>
          </h2>
          <p className="text-xl text-muted-foreground text-pretty max-w-3xl mx-auto leading-relaxed">
            Receba ovos caipiras frescos na sua casa com a frequência que você escolher. Praticidade, economia e
            qualidade garantida direto do campo para sua mesa.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`border-0 shadow-lg hover:shadow-xl transition-all duration-300 relative ${plan.popular ? "ring-2 ring-primary scale-105" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    <Star className="h-3 w-3 mr-1 fill-current" />
                    Mais Popular
                  </Badge>
                </div>
              )}

              <CardContent className="p-8 text-center">
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="text-4xl font-bold text-primary mb-2">{plan.price}</div>
                <div className="text-sm text-muted-foreground mb-4">por entrega</div>

                <div className="bg-secondary/10 rounded-lg p-4 mb-6">
                  <div className="text-lg font-semibold">{plan.eggs}</div>
                  <div className="text-sm text-muted-foreground">Entrega {plan.frequency}</div>
                  <div className="text-sm text-secondary font-medium mt-1">{plan.savings}</div>
                  <div className="text-xs text-muted-foreground mt-1 italic">{plan.note}</div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${plan.popular ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-secondary text-secondary-foreground hover:bg-secondary/90"}`}
                  size="lg"
                  onClick={() => handleCheckout(plan.name, plan.priceInCents)}
                  disabled={loadingPlan === plan.name}
                >
                  {loadingPlan === plan.name ? "Aguarde..." : "Assinar"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mb-12">
          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/20 rounded-full mb-4 mx-auto">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Entrega Grátis</h3>
              <p className="text-muted-foreground text-sm text-pretty">
                Entregamos seus ovos frescos diretamente na sua casa, sem custo adicional
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-secondary/20 rounded-full mb-4 mx-auto">
                <Calendar className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Flexibilidade Total</h3>
              <p className="text-muted-foreground text-sm text-pretty">
                Pause, altere ou cancele sua assinatura a qualquer momento pelo app
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center w-12 h-12 bg-primary/20 rounded-full mb-4 mx-auto">
                <Star className="h-6 w-6 text-primary fill-current" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Qualidade Garantida</h3>
              <p className="text-muted-foreground text-sm text-pretty">
                Ovos sempre frescos, direto dos nossos produtores parceiros certificados
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-8 lg:p-12 text-center">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-2xl lg:text-3xl font-bold mb-4 text-balance">Seja o primeiro a saber!</h3>
            <p className="text-lg text-muted-foreground mb-6 text-pretty leading-relaxed">
              Cadastre-se na nossa lista de espera e receba um desconto especial no lançamento da assinatura Caipirovos.
            </p>
            <Button
              size="lg"
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
              onClick={() => setIsWaitlistPopupOpen(true)}
            >
              Entrar na Lista de Espera
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <PopupForm
        isOpen={isWaitlistPopupOpen}
        onClose={() => setIsWaitlistPopupOpen(false)}
        type="waitlist"
        title="Lista de Espera"
        description="Seja o primeiro a saber quando a assinatura Caipirovos estiver disponível e ganhe um desconto especial!"
      />
    </section>
  )
}
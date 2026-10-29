"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Truck, Calendar, Star } from "lucide-react"
import { ChoosePayment } from "./choose-payment"
import { PixCheckout, type PixData } from "./pix-checkout"
import { DeliveryForm, type DeliveryData } from "./delivery-form"
import { CashbackNote } from "./cashback-note"
import { PLANS, formatBRL, frequencyLabel, type Plan } from "@/lib/plans"

export function SubscriptionSection() {
  const [deliveryFormOpen, setDeliveryFormOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [pixOpen, setPixOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [deliveryData, setDeliveryData] = useState<DeliveryData | null>(null)
  const [accountPassword, setAccountPassword] = useState("")
  const [pix, setPix] = useState<PixData | null>(null)
  const [loading, setLoading] = useState<"card" | "pix" | null>(null)
  const [payError, setPayError] = useState<string | null>(null)

  function handlePlanClick(plan: Plan) {
    setSelectedPlan(plan)
    setPayError(null)
    setDeliveryFormOpen(true)
  }

  function handleDeliveryContinue(data: DeliveryData, password: string) {
    setDeliveryData(data)
    setAccountPassword(password)
    setDeliveryFormOpen(false)
    setPaymentOpen(true)
  }

  async function post(url: string, couponCode?: string) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planName: selectedPlan?.name, delivery: deliveryData, couponCode, password: accountPassword }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || "Algo deu errado. Tente novamente.")
    return json
  }

  async function handleSelectCard(couponCode?: string) {
    if (!selectedPlan || !deliveryData) return
    setLoading("card")
    setPayError(null)
    try {
      const json = await post("/api/checkout", couponCode)
      if (json.url) {
        window.location.href = json.url
        return
      }
      throw new Error("Não foi possível abrir o pagamento.")
    } catch (e: any) {
      setPayError(e.message)
      setLoading(null)
    }
  }

  async function handleSelectPix(couponCode?: string) {
    if (!selectedPlan || !deliveryData) return
    setLoading("pix")
    setPayError(null)
    try {
      const json = await post("/api/pix", couponCode)
      setPix({ qrCode: json.qrCode, qrCodeBase64: json.qrCodeBase64 || "", amountCents: json.amountCents })
      setPaymentOpen(false)
      setPixOpen(true)
    } catch (e: any) {
      setPayError(e.message)
    }
    setLoading(null)
  }

  return (
    <section id="assinatura" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-balance mb-6">
            Assinatura <span className="text-primary">Caipirovos</span>
          </h2>
          <p className="text-xl text-muted-foreground text-pretty max-w-3xl mx-auto leading-relaxed">
            Receba ovos caipiras frescos na sua casa, todo mês. Praticidade, economia e qualidade garantida direto do
            campo para sua mesa.
          </p>
        </div>

        <CashbackNote />

        <div className="grid md:grid-cols-3 gap-8 mb-12 max-w-5xl mx-auto">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`border-0 shadow-lg hover:shadow-xl transition-all duration-300 relative ${
                plan.popular ? "ring-2 ring-primary md:scale-105" : ""
              }`}
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
                <div className="text-4xl font-bold text-primary mb-2">{formatBRL(plan.priceInCents)}</div>
                <div className="text-sm text-muted-foreground mb-4">por mês</div>
                <div className="bg-secondary/10 rounded-lg p-4 mb-6">
                  <div className="text-lg font-semibold">{plan.eggs} ovos</div>
                  <div className="text-sm text-muted-foreground">
                    {plan.eggs / 30} placas com 30 ovos
                  </div>
                  <div className="text-sm text-secondary font-medium mt-1">
                    {formatBRL(Math.round(plan.priceInCents / plan.eggs))} por ovo
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Entrega {frequencyLabel(plan.deliveryDays)}</div>
                  <div className="text-xs text-red-500 mt-1 font-medium">Entrega só para Feira de Santana</div>
                </div>
                <ul className="space-y-3 mb-8 text-left">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center space-x-2 text-sm">
                      <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${
                    plan.popular
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  }`}
                  size="lg"
                  onClick={() => handlePlanClick(plan)}
                >
                  Assinar {plan.name}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
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
      </div>

      <DeliveryForm
        isOpen={deliveryFormOpen}
        onClose={() => setDeliveryFormOpen(false)}
        onContinue={handleDeliveryContinue}
        planName={selectedPlan?.name || ""}
      />
      <ChoosePayment
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        onBack={() => {
          setPaymentOpen(false)
          setDeliveryFormOpen(true)
        }}
        plan={selectedPlan}
        loading={loading}
        error={payError}
        onSelectCard={handleSelectCard}
        onSelectPix={handleSelectPix}
      />
      <PixCheckout isOpen={pixOpen} onClose={() => setPixOpen(false)} planName={selectedPlan?.name || ""} pix={pix} />
    </section>
  )
}

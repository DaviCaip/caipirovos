"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CreditCard, QrCode, Tag, X } from "lucide-react"
import { formatBRL, type Plan } from "@/lib/plans"

interface AppliedCoupon {
  code: string
  label: string
  discountCents: number
  finalCents: number
}

interface ChoosePaymentProps {
  isOpen: boolean
  onClose: () => void
  onBack: () => void
  plan: Plan | null
  loading: "card" | "pix" | null
  error: string | null
  onSelectCard: (couponCode?: string) => void
  onSelectPix: (couponCode?: string) => void
}

export function ChoosePayment({ isOpen, onClose, onBack, plan, loading, error, onSelectCard, onSelectPix }: ChoosePaymentProps) {
  const [input, setInput] = useState("")
  const [applied, setApplied] = useState<AppliedCoupon | null>(null)
  const [couponError, setCouponError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  function reset() {
    setInput("")
    setApplied(null)
    setCouponError(null)
  }

  async function applyCoupon() {
    if (!plan || !input.trim()) return
    setChecking(true)
    setCouponError(null)
    try {
      const res = await fetch("/api/coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: input, planName: plan.name }),
      })
      const json = await res.json()
      if (json.valid) {
        setApplied({ code: json.code, label: json.label, discountCents: json.discountCents, finalCents: json.finalCents })
        setInput("")
      } else {
        setApplied(null)
        setCouponError(json.error || "Cupom inválido.")
      }
    } catch {
      setCouponError("Não foi possível validar o cupom. Tente novamente.")
    }
    setChecking(false)
  }

  function pay(method: "card" | "pix") {
    if (input.trim() && !applied) {
      setCouponError("Clique em Aplicar para usar este cupom, ou apague o campo.")
      return
    }
    const code = applied?.code
    if (method === "card") onSelectCard(code)
    else onSelectPix(code)
  }

  if (!plan) return null
  const total = applied ? applied.finalCents : plan.priceInCents
  const busy = loading !== null

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          reset()
          onClose()
        }
      }}
    >
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resumo e pagamento</DialogTitle>
          <DialogDescription>Confira seu pedido e escolha como pagar.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span>
                Plano <strong>{plan.name}</strong> ({plan.eggs} ovos)
              </span>
              <span>{formatBRL(plan.priceInCents)}</span>
            </div>
            {applied && (
              <div className="flex justify-between text-green-700">
                <span>Cupom {applied.code}</span>
                <span>-{formatBRL(applied.discountCents)}</span>
              </div>
            )}
            <div className="flex justify-between border-t pt-2 text-base font-bold">
              <span>Total do 1º pagamento</span>
              <span>{formatBRL(total)}</span>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium flex items-center gap-1 mb-2">
              <Tag className="h-4 w-4" /> Cupom de desconto
            </p>
            {applied ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-800">
                <span>
                  <strong>{applied.code}</strong>: {applied.label}
                </span>
                <button type="button" onClick={reset} aria-label="Remover cupom" disabled={busy}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value.toUpperCase())
                    setCouponError(null)
                  }}
                  onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                  placeholder="Digite seu cupom"
                  autoCapitalize="characters"
                  disabled={busy}
                />
                <Button type="button" variant="outline" onClick={applyCoupon} disabled={checking || busy || !input.trim()}>
                  {checking ? "..." : "Aplicar"}
                </Button>
              </div>
            )}
            {couponError && <p className="text-xs text-red-500 mt-1">{couponError}</p>}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Como você quer pagar?</p>
            <Button className="w-full justify-start" variant="outline" size="lg" onClick={() => pay("card")} disabled={busy}>
              <CreditCard className="mr-2 h-5 w-5" />
              {loading === "card" ? "Redirecionando..." : "Cartão de crédito (assinatura mensal)"}
            </Button>
            <Button className="w-full justify-start" variant="outline" size="lg" onClick={() => pay("pix")} disabled={busy}>
              <QrCode className="mr-2 h-5 w-5" />
              {loading === "pix" ? "Gerando Pix..." : "Pix (1º pagamento)"}
            </Button>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

          <button type="button" className="text-xs text-muted-foreground underline" onClick={onBack} disabled={busy}>
            ← Voltar e editar meus dados
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

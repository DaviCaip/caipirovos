"use client"

import { useEffect, useState } from "react"

// Aviso de cashback no site. Só aparece se o cashback estiver ligado no admin.
export function CashbackNote({ variant = "banner" }: { variant?: "banner" | "success" }) {
  const [cfg, setCfg] = useState<{ enabled: boolean; percent: number } | null>(null)

  useEffect(() => {
    fetch("/api/cashback/public")
      .then((r) => r.json())
      .then(setCfg)
      .catch(() => {})
  }, [])

  if (!cfg?.enabled) return null
  const p = String(cfg.percent).replace(".", ",")

  if (variant === "success") {
    return (
      <p className="text-sm bg-green-50 border border-green-200 text-green-900 rounded-xl p-4">
        💰 Você ganha <strong>{p}% de cashback</strong>: esse valor volta como desconto na sua próxima cobrança.
      </p>
    )
  }

  return (
    <div className="max-w-3xl mx-auto mb-10 rounded-2xl bg-green-50 border border-green-200 text-green-900 px-5 py-4 text-center">
      <p className="font-semibold">💰 Cashback de {p}% em toda assinatura</p>
      <p className="text-sm mt-1">
        No cartão, {p}% de cada pagamento volta como desconto na sua próxima cobrança. No Pix, o valor fica guardado e é
        descontado na sua próxima compra (é só avisar pelo WhatsApp).
      </p>
    </div>
  )
}

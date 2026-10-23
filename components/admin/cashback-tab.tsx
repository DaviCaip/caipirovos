"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PLANS, formatBRL } from "@/lib/plans"

type Api = (path: string, init?: RequestInit) => Promise<any>

interface Wallet {
  key: string
  name: string | null
  email: string | null
  cpfMasked: string
  balanceCents: number
  lastAt: string
}
interface Movement {
  id: string
  kind: "card" | "pix" | "adjust"
  name: string | null
  email: string | null
  amountCents: number
  note: string | null
  createdAt: string
}
interface Payload {
  settings: { enabled: boolean; percent: number }
  summary: { cardCents: number; pixCents: number; manualAddedCents: number; usedCents: number }
  wallets: Wallet[]
  recent: Movement[]
  maxPercent: number
}

const KIND_LABEL = { card: "💳 Cartão", pix: "🔷 Pix", adjust: "✍️ Ajuste" }

export function CashbackTab({ api }: { api: Api }) {
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [enabled, setEnabled] = useState(false)
  const [percent, setPercent] = useState("5")
  const [saving, setSaving] = useState(false)

  const [action, setAction] = useState<{ wallet: Wallet; type: "use" | "add" } | null>(null)
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [actionError, setActionError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const json: Payload = await api("/api/admin/cashback")
      setData(json)
      setEnabled(json.settings.enabled)
      if (json.settings.percent > 0) setPercent(String(json.settings.percent))
      setError(null)
    } catch (e: any) {
      setError(e.message)
    }
  }, [api])

  useEffect(() => {
    load()
  }, [load])

  async function saveSettings(nextEnabled: boolean) {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await api("/api/admin/cashback", { method: "PATCH", body: JSON.stringify({ enabled: nextEnabled, percent }) })
      setMessage(nextEnabled ? `Cashback de ${percent}% ligado!` : "Cashback desligado.")
      load()
    } catch (e: any) {
      setError(e.message)
    }
    setSaving(false)
  }

  async function submitAction() {
    if (!action) return
    setActionError(null)
    try {
      await api("/api/admin/cashback", {
        method: "POST",
        body: JSON.stringify({ walletKey: action.wallet.key, type: action.type, amount, note, confirmPassword }),
      })
      setAction(null)
      setAmount("")
      setNote("")
      setConfirmPassword("")
      load()
    } catch (e: any) {
      setActionError(e.message)
    }
  }

  if (!data) {
    return error ? (
      <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
    ) : (
      <p className="text-center text-muted-foreground py-8">Carregando...</p>
    )
  }

  const p = Number(String(percent).replace(",", "."))
  const validP = Number.isFinite(p) && p > 0
  const input = "w-full border rounded-lg px-3 py-2 text-sm"

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-semibold text-lg">💰 Cashback</h2>
              <p className="text-sm text-muted-foreground">
                Parte do que o cliente paga volta como desconto. Fica desligado até você ligar aqui.
              </p>
            </div>
            <span
              className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                data.settings.enabled ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"
              }`}
            >
              {data.settings.enabled ? `✅ Ligado — ${data.settings.percent}%` : "⏸️ Desligado"}
            </span>
          </div>

          <div className="flex items-end gap-3 flex-wrap">
            <div className="w-40">
              <label className="text-xs text-muted-foreground">% de cashback (até {data.maxPercent})</label>
              <input className={input} type="number" min={0.5} max={data.maxPercent} step={0.5} value={percent} onChange={(e) => setPercent(e.target.value)} />
            </div>
            <Button disabled={saving || !validP} onClick={() => saveSettings(true)}>
              {data.settings.enabled ? "Salvar porcentagem" : "Ligar cashback"}
            </Button>
            {data.settings.enabled && (
              <Button variant="outline" disabled={saving} onClick={() => saveSettings(false)}>
                Desligar
              </Button>
            )}
          </div>

          {validP && (
            <div className="bg-muted/50 rounded-xl p-4 text-sm space-y-1">
              <p className="font-medium">Com {String(p).replace(".", ",")}%, cada pagamento devolve:</p>
              {PLANS.map((pl) => (
                <p key={pl.id} className="text-muted-foreground">
                  {pl.name} ({formatBRL(pl.priceInCents)}) → <strong className="text-foreground">{formatBRL(Math.floor((pl.priceInCents * p) / 100))}</strong>
                </p>
              ))}
              <p className="text-xs text-muted-foreground pt-1">O cálculo é sobre o que o cliente realmente pagou (já com cupom).</p>
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
          {message && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">{message}</p>}

          <details className="text-sm">
            <summary className="cursor-pointer font-medium">Como funciona (e o que precisa estar ligado no Stripe)</summary>
            <div className="mt-2 space-y-2 text-muted-foreground">
              <p>
                <strong>Cartão:</strong> depois de cada fatura paga, o cliente recebe um crédito no Stripe e o próprio Stripe desconta esse
                valor da próxima cobrança mensal. É automático.
              </p>
              <p>
                <strong>Pix:</strong> o crédito fica guardado numa carteira (CPF + e-mail). Quando o cliente for pagar de novo, você dá baixa
                aqui embaixo e cobra o valor já com o desconto.
              </p>
              <p>
                <strong>Importante:</strong> no Stripe, em Developers → Webhooks → seu endpoint, adicione o evento <code>invoice.paid</code>.
                Sem ele o cashback do cartão não é gerado.
              </p>
            </div>
          </details>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          ["Devolvido no cartão", data.summary.cardCents],
          ["Guardado do Pix", data.summary.pixCents + data.summary.manualAddedCents],
          ["Já usado (Pix)", data.summary.usedCents],
          ["Saldo na carteira", data.wallets.reduce((s, w) => s + w.balanceCents, 0)],
        ].map(([label, cents]) => (
          <Card key={label as string}>
            <CardContent className="p-5">
              <p className="text-2xl font-bold">{formatBRL(cents as number)}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold">👛 Carteira dos clientes do Pix</h3>
        {data.wallets.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              Nenhum saldo guardado. Quando um Pix for confirmado com o cashback ligado, o crédito aparece aqui.
            </CardContent>
          </Card>
        ) : (
          data.wallets.map((w) => (
            <Card key={w.key}>
              <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="text-sm">
                  <p className="font-semibold">{w.name || "Cliente"}</p>
                  <p className="text-muted-foreground">
                    {w.email || "—"} · CPF {w.cpfMasked}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-bold text-green-700">{formatBRL(w.balanceCents)}</p>
                  <Button size="sm" onClick={() => { setAction({ wallet: w, type: "use" }); setActionError(null) }}>
                    Usar crédito
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setAction({ wallet: w, type: "add" }); setActionError(null) }}>
                    + Crédito
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold">🧾 Últimos movimentos</h3>
        {data.recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada ainda.</p>
        ) : (
          <Card>
            <CardContent className="p-2 divide-y">
              {data.recent.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div>
                    <p>
                      {KIND_LABEL[m.kind]} · {m.name || m.email || "Cliente"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.createdAt).toLocaleString("pt-BR")}
                      {m.note ? ` · ${m.note}` : ""}
                    </p>
                  </div>
                  <p className={`font-semibold ${m.amountCents < 0 ? "text-red-600" : "text-green-700"}`}>
                    {m.amountCents < 0 ? "−" : "+"}
                    {formatBRL(Math.abs(m.amountCents))}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {action && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-semibold text-lg">{action.type === "use" ? "Usar crédito de" : "Dar crédito para"} {action.wallet.name || "cliente"}</h3>
            <p className="text-sm text-muted-foreground">
              Saldo atual: <strong>{formatBRL(action.wallet.balanceCents)}</strong>
              {action.type === "use" ? ". Registre quanto foi descontado da cobrança." : ""}
            </p>
            <input className={input} type="number" min={0.01} step={0.01} placeholder="Valor em reais (ex.: 5,00)" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <input className={input} placeholder="Observação (opcional)" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
            <input
              type="password"
              className={input}
              placeholder="Digite sua senha para confirmar"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitAction()}
            />
            {actionError && <p className="text-sm text-red-600">{actionError}</p>}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setAction(null)}>
                Cancelar
              </Button>
              <Button className="flex-1" disabled={!amount} onClick={submitAction}>
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

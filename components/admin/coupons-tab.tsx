"use client"

import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PLANS } from "@/lib/plans"

interface Coupon {
  id: string
  code: string
  description: string | null
  discount_type: "percent" | "fixed"
  discount_value: number
  duration: "once" | "forever"
  active: boolean
  max_uses: number | null
  used_count: number
  starts_at: string | null
  expires_at: string | null
  allowed_plans: string[] | null
  influencer_id: string | null
}

type Api = (path: string, init?: RequestInit) => Promise<any>

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

const fmtDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Bahia" }) : null

function statusOf(c: Coupon): { label: string; className: string } {
  const now = Date.now()
  if (!c.active) return { label: "⏸️ Desligado", className: "bg-gray-200 text-gray-700" }
  if (c.expires_at && new Date(c.expires_at).getTime() < now) return { label: "⌛ Expirado", className: "bg-red-100 text-red-700" }
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return { label: "🗓️ Agendado", className: "bg-blue-100 text-blue-700" }
  if (c.max_uses !== null && c.used_count >= c.max_uses) return { label: "🚫 Esgotado", className: "bg-red-100 text-red-700" }
  return { label: "✅ Ativo", className: "bg-green-100 text-green-700" }
}

function describe(c: Coupon) {
  return c.discount_type === "percent"
    ? `${c.discount_value}% de desconto`
    : `R$ ${(c.discount_value / 100).toFixed(2).replace(".", ",")} de desconto`
}

export function CouponsTab({ api }: { api: Api }) {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [influencers, setInfluencers] = useState<{ id: string; name: string }[]>([])
  const [canAssign, setCanAssign] = useState(false)
  const [influencerId, setInfluencerId] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [code, setCode] = useState("")
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent")
  const [value, setValue] = useState("")
  const [startDate, setStartDate] = useState(todayStr())
  const [endDate, setEndDate] = useState("")
  const [noEndDate, setNoEndDate] = useState(false)
  const [maxUses, setMaxUses] = useState("")
  const [plans, setPlans] = useState<string[]>([])
  const [duration, setDuration] = useState<"once" | "forever">("once")

  const [confirmDelete, setConfirmDelete] = useState<Coupon | null>(null)
  const [confirmPassword, setConfirmPassword] = useState("")
  const [extend, setExtend] = useState<{ id: string; date: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const json = await api("/api/admin/coupons")
      setCoupons(json.coupons)
      setInfluencers(json.influencers || [])
      setCanAssign(!!json.canAssign)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }, [api])

  useEffect(() => {
    load()
  }, [load])

  async function create() {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await api("/api/admin/coupons", {
        method: "POST",
        body: JSON.stringify({
          code,
          discountType,
          value,
          startDate,
          endDate: noEndDate ? null : endDate,
          noEndDate,
          maxUses,
          allowedPlans: plans,
          duration,
          influencerId: canAssign ? influencerId : undefined,
        }),
      })
      setMessage(`Cupom ${code.trim().toUpperCase()} criado!`)
      setCode("")
      setValue("")
      setEndDate("")
      setNoEndDate(false)
      setMaxUses("")
      setPlans([])
      setInfluencerId("")
      load()
    } catch (e: any) {
      setError(e.message)
    }
    setSaving(false)
  }

  async function patch(body: object) {
    setError(null)
    setMessage(null)
    try {
      await api("/api/admin/coupons", { method: "PATCH", body: JSON.stringify(body) })
      load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function remove() {
    if (!confirmDelete) return
    try {
      await api("/api/admin/coupons", {
        method: "DELETE",
        body: JSON.stringify({ id: confirmDelete.id, confirmPassword }),
      })
      setConfirmDelete(null)
      setConfirmPassword("")
      load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  const input = "w-full border rounded-lg px-3 py-2 text-sm"

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5 space-y-4">
          <h2 className="font-semibold text-lg">🎟️ Criar cupom</h2>

          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Nome do cupom</label>
              <input
                className={`${input} uppercase`}
                placeholder="Ex.: NATAL10"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
                maxLength={30}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Tipo de desconto</label>
              <select className={input} value={discountType} onChange={(e) => setDiscountType(e.target.value as any)}>
                <option value="percent">Porcentagem (%)</option>
                <option value="fixed">Valor em reais (R$)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                {discountType === "percent" ? "Quantos % de desconto" : "Quantos reais de desconto"}
              </label>
              <input
                className={input}
                type="number"
                min={1}
                max={discountType === "percent" ? 100 : undefined}
                step={discountType === "percent" ? 1 : 0.01}
                placeholder={discountType === "percent" ? "10" : "5,00"}
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Vale a partir de</label>
              <input className={input} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Vale até (inclusive)</label>
              <input
                className={input}
                type="date"
                value={endDate}
                min={startDate || undefined}
                disabled={noEndDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Limite de usos (opcional)</label>
              <input
                className={input}
                type="number"
                min={1}
                placeholder="Sem limite"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={noEndDate} onChange={(e) => setNoEndDate(e.target.checked)} />
            Sem data final (fica valendo até você desligar)
          </label>
          {noEndDate && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              Cuidado: sem data final o cupom não para sozinho. Ele aparecerá na lista com um aviso para você não esquecer.
            </p>
          )}

          <div>
            <p className="text-xs text-muted-foreground mb-1">Planos que aceitam o cupom (nenhum marcado = todos)</p>
            <div className="flex gap-4 flex-wrap">
              {PLANS.map((p) => (
                <label key={p.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={plans.includes(p.name)}
                    onChange={(e) => setPlans((prev) => (e.target.checked ? [...prev, p.name] : prev.filter((x) => x !== p.name)))}
                  />
                  {p.name}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">No cartão, o desconto vale em…</label>
            <select className={input} value={duration} onChange={(e) => setDuration(e.target.value as any)}>
              <option value="once">Só na primeira cobrança</option>
              <option value="forever">Em todas as cobranças mensais</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">No Pix o desconto vale sempre no 1º pagamento.</p>
          </div>

          {canAssign && (
            <div>
              <label className="text-xs text-muted-foreground">Cupom de um influencer? (opcional)</label>
              <select className={input} value={influencerId} onChange={(e) => setInfluencerId(e.target.value)}>
                <option value="">Cupom comum, sem influencer</option>
                {influencers.map((i) => (
                  <option key={i.id} value={i.id}>
                    🌟 {i.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">O influencer acompanha em quantas compras o cupom foi usado.</p>
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
          {message && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">{message}</p>}

          <Button onClick={create} disabled={saving || !code || !value}>
            {saving ? "Criando..." : "Criar cupom"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="font-semibold text-lg">Seus cupons</h2>
        {loading ? (
          <p className="text-center text-muted-foreground py-6">Carregando...</p>
        ) : coupons.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">Nenhum cupom criado ainda.</CardContent>
          </Card>
        ) : (
          coupons.map((c) => {
            const st = statusOf(c)
            const neverEnds = c.active && !c.expires_at
            return (
              <Card key={c.id} className="border-l-4 border-l-primary">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-mono font-bold text-lg">{c.code}</h3>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${st.className}`}>{st.label}</span>
                    <Badge variant="outline">{describe(c)}</Badge>
                    {c.duration === "forever" && <Badge variant="secondary">todas as cobranças</Badge>}
                  </div>
                  <div className="text-sm text-muted-foreground grid md:grid-cols-2 gap-1">
                    <p>
                      🗓️ {c.starts_at ? `De ${fmtDate(c.starts_at)}` : "Desde sempre"}
                      {c.expires_at ? ` até ${fmtDate(c.expires_at)}` : " — sem data final"}
                    </p>
                    <p>
                      🔢 Usado {c.used_count}x{c.max_uses !== null ? ` de ${c.max_uses}` : " (sem limite)"}
                    </p>
                    <p>📦 {c.allowed_plans && c.allowed_plans.length > 0 ? c.allowed_plans.join(", ") : "Todos os planos"}</p>
                    {c.influencer_id && <p>🌟 Influencer: {influencers.find((i) => i.id === c.influencer_id)?.name || "—"}</p>}
                  </div>
                  {neverEnds && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                      ⚠️ Este cupom não tem data final. Defina uma data para ele não ficar ativo para sempre.
                    </p>
                  )}

                  <div className="flex gap-2 flex-wrap pt-1">
                    <Button size="sm" variant="outline" onClick={() => patch({ id: c.id, active: !c.active })}>
                      {c.active ? "Desligar" : "Ligar"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setExtend({ id: c.id, date: "" })}>
                      Mudar data final
                    </Button>
                    {canAssign && (
                      <select
                        className="border rounded-md px-2 py-1 text-sm"
                        value={c.influencer_id || ""}
                        onChange={(e) => patch({ id: c.id, influencerId: e.target.value || null })}
                        aria-label="Influencer do cupom"
                      >
                        <option value="">Sem influencer</option>
                        {influencers.map((i) => (
                          <option key={i.id} value={i.id}>
                            🌟 {i.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => {
                        setConfirmDelete(c)
                        setConfirmPassword("")
                      }}
                    >
                      Excluir
                    </Button>
                  </div>

                  {extend?.id === c.id && (
                    <div className="flex gap-2 items-center flex-wrap pt-1">
                      <input
                        className="border rounded-lg px-3 py-1.5 text-sm"
                        type="date"
                        value={extend.date}
                        onChange={(e) => setExtend({ id: c.id, date: e.target.value })}
                      />
                      <Button
                        size="sm"
                        disabled={!extend.date}
                        onClick={() => {
                          patch({ id: c.id, endDate: extend.date })
                          setExtend(null)
                        }}
                      >
                        Salvar data
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setExtend(null)}>
                        Cancelar
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-semibold text-lg">🗑️ Excluir {confirmDelete.code}?</h3>
            <p className="text-sm text-muted-foreground">
              Isso não pode ser desfeito. Se só quiser parar de usar, é melhor “Desligar”.
            </p>
            <input
              type="password"
              className={input}
              placeholder="Digite sua senha para confirmar"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && remove()}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDelete(null)}>
                Cancelar
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={remove}>
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

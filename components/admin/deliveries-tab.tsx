"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { DeliveryView } from "@/lib/deliveries"
import { dayKey, diffDays, dueLabel, fmtBR } from "@/lib/dates"
import {
  FAIL_REASONS,
  MANAGER_TRANSITIONS,
  STATUS_INFO,
  isOpen,
  mapsUrl,
  whatsappMessage,
  whatsappUrl,
  type DeliveryStatus,
} from "@/lib/delivery-status"

type Api = (path: string, init?: RequestInit) => Promise<any>
interface SubOption {
  id: string
  name: string
  plan: string
  neighborhood: string
}

type StatusFilter = "pending" | DeliveryStatus | "all"
type DateFilter = "all" | "today" | "late" | "week"

const ACTION_LABEL: Record<DeliveryStatus, (from: DeliveryStatus) => string> = {
  accepted: () => "↩️ Voltar para aceito",
  preparing: (from) => (from === "out" ? "↩️ Voltar para preparo" : "🧺 Em preparo"),
  out: (from) => (from === "delivered" ? "↩️ Desfazer entregue" : "🚚 Saiu para entrega"),
  delivered: () => "✅ Entregue",
  failed: () => "⚠️ Não entregue",
  canceled: () => "🚫 Cancelar",
}

export function DeliveriesTab({ api }: { api: Api }) {
  const [items, setItems] = useState<DeliveryView[]>([])
  const [subs, setSubs] = useState<SubOption[]>([])
  const [today, setToday] = useState(dayKey())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending")
  const [dateFilter, setDateFilter] = useState<DateFilter>("all")
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<string[]>([])
  const [openTimeline, setOpenTimeline] = useState<string | null>(null)

  const [dialog, setDialog] = useState<{ ids: string[]; to: DeliveryStatus; label: string } | null>(null)
  const [receivedBy, setReceivedBy] = useState("")
  const [reason, setReason] = useState(FAIL_REASONS[0])
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)

  const [showNew, setShowNew] = useState(false)
  const [newSub, setNewSub] = useState("")
  const [newDate, setNewDate] = useState("")
  const [newNote, setNewNote] = useState("")

  const load = useCallback(async () => {
    try {
      const json = await api("/api/admin/deliveries")
      setItems(json.deliveries)
      setSubs(json.subscriptions)
      setToday(json.today)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }, [api])

  useEffect(() => {
    load()
  }, [load])

  const counts = useMemo(() => {
    const c: Record<string, number> = { pending: 0, all: items.length }
    for (const d of items) {
      c[d.status] = (c[d.status] || 0) + 1
      if (isOpen(d.status)) c.pending++
    }
    return c
  }, [items])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items
      .filter((d) => (statusFilter === "all" ? true : statusFilter === "pending" ? isOpen(d.status) : d.status === statusFilter))
      .filter((d) => {
        if (dateFilter === "all") return true
        const diff = diffDays(d.dueDate, today)
        if (dateFilter === "today") return diff === 0
        if (dateFilter === "late") return diff < 0 && isOpen(d.status)
        return diff >= 0 && diff <= 7
      })
      .filter(
        (d) =>
          !q ||
          `${d.customer.name} ${d.customer.neighborhood} ${d.customer.street} ${d.customer.plan}`.toLowerCase().includes(q)
      )
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.customer.neighborhood.localeCompare(b.customer.neighborhood))
  }, [items, statusFilter, dateFilter, search, today])

  async function send(ids: string[], to: DeliveryStatus, extra: Record<string, string> = {}) {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const json = await api("/api/admin/deliveries", { method: "PATCH", body: JSON.stringify({ ids, status: to, ...extra }) })
      if (json.errors?.length) setMessage(`${json.done} atualizada(s). ${json.errors.length} não puderam mudar: ${json.errors[0]}`)
      setSelected([])
      setDialog(null)
      setReceivedBy("")
      setNote("")
      await load()
    } catch (e: any) {
      setError(e.message)
    }
    setSaving(false)
  }

  function ask(ids: string[], to: DeliveryStatus, from: DeliveryStatus) {
    const label = ACTION_LABEL[to](from)
    // etapas simples andam direto; as que pedem detalhe ou são difíceis de desfazer abrem uma confirmação
    if (to === "delivered" || to === "failed" || to === "canceled") {
      setDialog({ ids, to, label })
      setReceivedBy("")
      setNote("")
      setReason(FAIL_REASONS[0])
    } else {
      send(ids, to)
    }
  }

  async function createManual() {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      await api("/api/admin/deliveries", {
        method: "POST",
        body: JSON.stringify({ action: "create", subscriptionId: newSub, dueDate: newDate, note: newNote }),
      })
      setMessage("Entrega criada!")
      setShowNew(false)
      setNewSub("")
      setNewDate("")
      setNewNote("")
      await load()
    } catch (e: any) {
      setError(e.message)
    }
    setSaving(false)
  }

  async function backfill() {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const json = await api("/api/admin/deliveries", { method: "POST", body: JSON.stringify({ action: "backfill" }) })
      setMessage(json.created > 0 ? `${json.created} entrega(s) criada(s) para assinaturas que estavam sem.` : "Tudo certo: toda assinatura ativa já tem entrega.")
      await load()
    } catch (e: any) {
      setError(e.message)
    }
    setSaving(false)
  }

  const input = "w-full border rounded-lg px-3 py-2 text-sm"
  const chips: [StatusFilter, string][] = [
    ["pending", "Pendentes"],
    ["accepted", "Aceitas"],
    ["preparing", "Em preparo"],
    ["out", "Em rota"],
    ["failed", "Não entregues"],
    ["delivered", "Entregues"],
    ["canceled", "Canceladas"],
    ["all", "Todas"],
  ]

  if (loading) return <p className="text-center text-muted-foreground py-8">Carregando...</p>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold text-lg">📦 Entregas</h2>
          <p className="text-sm text-muted-foreground">
            Cada pagamento confirmado gera uma entrega sozinha. O entregador atualiza pelo app em /entregador.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={load}>
            Atualizar
          </Button>
          <Button size="sm" variant="outline" disabled={saving} onClick={backfill}>
            Conferir assinaturas sem entrega
          </Button>
          <Button size="sm" onClick={() => setShowNew((v) => !v)}>
            ➕ Nova entrega
          </Button>
        </div>
      </div>

      {showNew && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium">Entrega avulsa</p>
            <div className="grid md:grid-cols-3 gap-3">
              <select className={input} value={newSub} onChange={(e) => setNewSub(e.target.value)}>
                <option value="">Escolha a assinatura ativa…</option>
                {subs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.plan}
                    {s.neighborhood ? ` · ${s.neighborhood}` : ""}
                  </option>
                ))}
              </select>
              <input className={input} type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              <input className={input} placeholder="Observação (opcional)" value={newNote} maxLength={200} onChange={(e) => setNewNote(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">Sem data, o sistema escolhe o próximo dia que o cliente prefere (nunca domingo).</p>
            <Button size="sm" disabled={saving || !newSub} onClick={createManual}>
              Criar entrega
            </Button>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
      {message && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">{message}</p>}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(["accepted", "preparing", "out", "failed", "delivered"] as DeliveryStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-left rounded-xl border-2 p-3 bg-white ${statusFilter === s ? "border-black" : "border-transparent shadow-sm"}`}
          >
            <p className="text-2xl font-bold">{counts[s] || 0}</p>
            <p className="text-xs text-muted-foreground">
              {STATUS_INFO[s].emoji} {STATUS_INFO[s].label}
            </p>
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        {chips.map(([id, label]) => (
          <Button key={id} size="sm" variant={statusFilter === id ? "default" : "outline"} onClick={() => setStatusFilter(id)}>
            {label} ({counts[id] || 0})
          </Button>
        ))}
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        <select className={input} value={dateFilter} onChange={(e) => setDateFilter(e.target.value as DateFilter)}>
          <option value="all">Qualquer data</option>
          <option value="today">Para hoje</option>
          <option value="late">Atrasadas</option>
          <option value="week">Próximos 7 dias</option>
        </select>
        <input className={`${input} md:col-span-2`} placeholder="Buscar por nome, bairro, rua ou plano" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {selected.length > 0 && (
        <div className="sticky top-2 z-10 bg-black text-white rounded-xl p-3 flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{selected.length} selecionada(s)</span>
          <Button size="sm" variant="secondary" disabled={saving} onClick={() => send(selected, "preparing")}>
            🧺 Em preparo
          </Button>
          <Button size="sm" variant="secondary" disabled={saving} onClick={() => send(selected, "out")}>
            🚚 Saiu para entrega
          </Button>
          <Button size="sm" variant="ghost" className="text-white" onClick={() => setSelected([])}>
            Limpar
          </Button>
        </div>
      )}

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            {items.length === 0
              ? "Nenhuma entrega ainda. Elas aparecem aqui quando um pagamento é confirmado. Para as assinaturas que já existiam, use “Conferir assinaturas sem entrega”."
              : "Nenhuma entrega com esses filtros."}
          </CardContent>
        </Card>
      ) : (
        filtered.map((d) => {
          const c = d.customer
          const info = STATUS_INFO[d.status]
          const due = dueLabel(d.dueDate, today)
          const wa = whatsappUrl(c.phone, whatsappMessage(d.status, c.name))
          return (
            <Card key={d.id} className="border-l-4" style={{ borderLeftColor: d.status === "out" ? "#a855f7" : d.status === "delivered" ? "#22c55e" : d.status === "failed" ? "#ef4444" : d.status === "canceled" ? "#9ca3af" : due.late && isOpen(d.status) ? "#ef4444" : "#facc15" }}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  {isOpen(d.status) && (
                    <input
                      type="checkbox"
                      className="mt-1.5 h-4 w-4"
                      checked={selected.includes(d.id)}
                      onChange={(e) => setSelected((s) => (e.target.checked ? [...s, d.id] : s.filter((x) => x !== d.id)))}
                      aria-label="Selecionar entrega"
                    />
                  )}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">{c.name}</h3>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${info.badge}`}>
                        {info.emoji} {info.label}
                      </span>
                      <span className="text-xs px-2 py-1 rounded-full bg-muted">{c.plan}</span>
                      {isOpen(d.status) && (
                        <span className={`text-xs font-semibold ${due.late ? "text-red-600" : "text-muted-foreground"}`}>📅 {due.text}</span>
                      )}
                    </div>
                    <div className="grid md:grid-cols-2 gap-x-4 gap-y-0.5 text-sm text-muted-foreground">
                      <p>
                        📍 {c.street}, {c.number}
                        {c.complement ? ` — ${c.complement}` : ""} · {c.neighborhood}
                      </p>
                      <p>
                        🥚 {c.eggs} ovos ({c.trays} placa{c.trays !== 1 ? "s" : ""}) · previsto {fmtBR(d.dueDate)}
                      </p>
                      {c.reference && <p>🧭 {c.reference}</p>}
                      {(c.preferredDay || c.preferredPeriod) && (
                        <p>
                          🗓️ Prefere: {c.preferredDay || "—"} · {c.preferredPeriod || "—"}
                        </p>
                      )}
                      {c.instructions && <p>📝 {c.instructions}</p>}
                      {d.note && <p>💬 {d.note}</p>}
                      {d.courierName && <p>🚚 Entregador: {d.courierName}</p>}
                      {d.status === "failed" && d.failedReason && <p className="text-red-700">⚠️ {d.failedReason}</p>}
                      {d.status === "delivered" && d.deliveredAt && (
                        <p className="text-green-700">
                          ✅ {new Date(d.deliveredAt).toLocaleString("pt-BR", { timeZone: "America/Bahia" })}
                          {d.deliveredTo ? ` · recebido por ${d.deliveredTo}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {MANAGER_TRANSITIONS[d.status].map((to) => (
                    <Button
                      key={to}
                      size="sm"
                      variant={to === "out" && d.status !== "delivered" ? "default" : "outline"}
                      className={to === "canceled" ? "text-red-600" : ""}
                      disabled={saving}
                      onClick={() => ask([d.id], to, d.status)}
                    >
                      {ACTION_LABEL[to](d.status)}
                    </Button>
                  ))}
                  <a className="inline-flex items-center text-sm border rounded-md px-3 h-9 hover:bg-muted" href={mapsUrl(c)} target="_blank" rel="noreferrer">
                    📍 Mapa
                  </a>
                  {c.phone && (
                    <a className="inline-flex items-center text-sm border rounded-md px-3 h-9 hover:bg-muted" href={`tel:${c.phone.replace(/\D/g, "")}`}>
                      📞 {c.phone}
                    </a>
                  )}
                  {wa && (
                    <a className="inline-flex items-center text-sm border rounded-md px-3 h-9 hover:bg-muted" href={wa} target="_blank" rel="noreferrer">
                      💬 WhatsApp
                    </a>
                  )}
                  <button className="text-xs underline text-muted-foreground px-1" onClick={() => setOpenTimeline(openTimeline === d.id ? null : d.id)}>
                    {openTimeline === d.id ? "Ocultar histórico" : "Ver histórico"}
                  </button>
                </div>

                {openTimeline === d.id && (
                  <ol className="bg-muted/50 rounded-lg p-3 space-y-1 text-xs">
                    {(d.events || []).length === 0 ? (
                      <li>Sem registros.</li>
                    ) : (
                      d.events!.map((e, i) => (
                        <li key={i}>
                          {STATUS_INFO[e.status as DeliveryStatus]?.emoji} <strong>{STATUS_INFO[e.status as DeliveryStatus]?.label || e.status}</strong> ·{" "}
                          {new Date(e.at).toLocaleString("pt-BR", { timeZone: "America/Bahia" })}
                          {e.by ? ` · ${e.by}` : ""}
                          {e.note ? ` · ${e.note}` : ""}
                        </li>
                      ))
                    )}
                  </ol>
                )}
              </CardContent>
            </Card>
          )
        })
      )}

      {dialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-semibold text-lg">{dialog.label}</h3>
            {dialog.to === "delivered" && <input className={input} placeholder="Quem recebeu? (opcional)" value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} />}
            {dialog.to === "failed" && (
              <select className={input} value={reason} onChange={(e) => setReason(e.target.value)}>
                {FAIL_REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            )}
            {dialog.to === "canceled" && <p className="text-sm text-muted-foreground">A entrega sai da fila. Dá para reabrir depois.</p>}
            <input className={input} placeholder="Observação (opcional)" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialog(null)}>
                Voltar
              </Button>
              <Button
                className="flex-1"
                disabled={saving}
                onClick={() => send(dialog.ids, dialog.to, { note, receivedBy, reason })}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

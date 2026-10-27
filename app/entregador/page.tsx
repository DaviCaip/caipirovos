"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { DeliveryView } from "@/lib/deliveries"
import { dayKey, dueLabel } from "@/lib/dates"
import { FAIL_REASONS, STATUS_INFO, mapsUrl, whatsappMessage, whatsappUrl } from "@/lib/delivery-status"

type Phase = "checking" | "login" | "noaccess" | "app"
type Sheet = { kind: "delivered" | "failed"; d: DeliveryView } | null

export default function CourierPage() {
  const [phase, setPhase] = useState<Phase>("checking")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loggingIn, setLoggingIn] = useState(false)

  const [deliveries, setDeliveries] = useState<DeliveryView[]>([])
  const [today, setToday] = useState(dayKey())
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState<"todo" | "done">("todo")
  const [busy, setBusy] = useState<string | null>(null)
  const [sheet, setSheet] = useState<Sheet>(null)
  const [receivedBy, setReceivedBy] = useState("")
  const [reason, setReason] = useState(FAIL_REASONS[0])
  const [note, setNote] = useState("")

  // "Instalar" na tela inicial (o celular só oferece se houver um service worker)
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/entregador/sw.js", { scope: "/entregador" }).catch(() => {})
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/courier")
      if (res.status === 401) {
        setPhase("login")
        return
      }
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Não foi possível carregar.")
      setDeliveries(json.deliveries)
      setToday(json.today)
      setError(null)
    } catch (e: any) {
      setError(e.message || "Sem conexão. Tentando de novo...")
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (!u) return setPhase("login")
        setName(u.name)
        setPhase(u.permissions.includes("courier") ? "app" : "noaccess")
      })
      .catch(() => setPhase("login"))
  }, [])

  // atualiza sozinho a cada minuto e quando o app volta para a tela
  useEffect(() => {
    if (phase !== "app") return
    load()
    const t = setInterval(load, 60000)
    const onVisible = () => document.visibilityState === "visible" && load()
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      clearInterval(t)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [phase, load])

  async function login() {
    setLoggingIn(true)
    setLoginError(null)
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || "Não foi possível entrar.")
      setPassword("")
      setName(json.name)
      setPhase(json.permissions.includes("courier") ? "app" : "noaccess")
    } catch (e: any) {
      setLoginError(e.message)
    }
    setLoggingIn(false)
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" })
    setDeliveries([])
    setPhase("login")
  }

  async function act(d: DeliveryView, status: "out" | "delivered" | "failed", extra: Record<string, string> = {}) {
    setBusy(d.id)
    setError(null)
    try {
      const res = await fetch("/api/admin/courier", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: d.id, status, ...extra }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.status === 401) return setPhase("login")
      if (!res.ok) throw new Error(json.error || "Não foi possível salvar.")
      setSheet(null)
      setReceivedBy("")
      setNote("")
      await load()
    } catch (e: any) {
      setError(e.message)
    }
    setBusy(null)
  }

  const todo = useMemo(
    () =>
      deliveries
        .filter((d) => d.status !== "delivered")
        .sort(
          (a, b) =>
            Number(b.status === "out") - Number(a.status === "out") ||
            a.dueDate.localeCompare(b.dueDate) ||
            a.customer.neighborhood.localeCompare(b.customer.neighborhood) ||
            a.customer.street.localeCompare(b.customer.street)
        ),
    [deliveries]
  )
  const done = useMemo(() => deliveries.filter((d) => d.status === "delivered"), [deliveries])
  const onRoute = todo.filter((d) => d.status === "out").length
  const list = tab === "todo" ? todo : done

  // ---------- telas ----------
  if (phase === "checking") {
    return <div className="min-h-screen bg-amber-50 flex items-center justify-center text-muted-foreground">Carregando...</div>
  }

  if (phase === "login" || phase === "noaccess") {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-5">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 space-y-4 text-center">
          <div className="text-5xl">🚚</div>
          <h1 className="text-xl font-bold">Caipirovos Entregas</h1>
          {phase === "noaccess" ? (
            <>
              <p className="text-sm text-muted-foreground">Esta senha não é de entregador. Para o painel de administração, use /admin.</p>
              <button className="w-full h-12 rounded-xl border font-medium" onClick={logout}>
                Sair e entrar com outra senha
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Digite a sua senha de entregador</p>
              <input
                type="password"
                className="w-full border rounded-xl px-4 h-12 text-base"
                placeholder="Senha"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && password && login()}
              />
              {loginError && <p className="text-sm text-red-600">{loginError}</p>}
              <button
                className="w-full h-12 rounded-xl bg-black text-white font-semibold disabled:opacity-50"
                disabled={loggingIn || !password}
                onClick={login}
              >
                {loggingIn ? "Entrando..." : "Entrar"}
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  const input = "w-full border rounded-xl px-4 h-12 text-base bg-white"

  return (
    <div className="min-h-screen bg-amber-50 pb-24">
      <header className="sticky top-0 z-20 bg-yellow-400 px-4 py-3 shadow">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-black/70">Olá, {name}</p>
            <h1 className="font-bold text-lg leading-tight">🚚 Minhas entregas</h1>
          </div>
          <div className="flex gap-2">
            <button className="h-10 px-3 rounded-lg bg-black/10 text-sm font-medium" onClick={load} disabled={loading}>
              {loading ? "..." : "Atualizar"}
            </button>
            <button className="h-10 px-3 rounded-lg bg-black/10 text-sm font-medium" onClick={logout}>
              Sair
            </button>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          {(
            [
              ["todo", `Para entregar (${todo.length})`],
              ["done", `Entregues hoje (${done.length})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 h-10 rounded-lg text-sm font-semibold ${tab === id ? "bg-black text-white" : "bg-white/70"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "todo" && onRoute > 0 && <p className="text-xs mt-2 text-black/70">🚚 {onRoute} em rota agora</p>}
      </header>

      <main className="p-4 space-y-4">
        {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}

        {list.length === 0 && (
          <div className="text-center text-muted-foreground py-16">
            <div className="text-5xl mb-3">{tab === "todo" ? "🎉" : "🥚"}</div>
            <p>{tab === "todo" ? "Nenhuma entrega pendente. Bom trabalho!" : "Nenhuma entrega concluída hoje ainda."}</p>
          </div>
        )}

        {list.map((d) => {
          const c = d.customer
          const info = STATUS_INFO[d.status]
          const due = dueLabel(d.dueDate, today)
          const wa = whatsappUrl(c.phone, whatsappMessage(d.status, c.name))
          const isBusy = busy === d.id
          return (
            <article key={d.id} className={`bg-white rounded-2xl shadow p-4 space-y-3 border-l-4 ${d.status === "out" ? "border-l-purple-500" : d.status === "delivered" ? "border-l-green-500" : due.late ? "border-l-red-500" : "border-l-yellow-400"}`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${info.badge}`}>
                  {info.emoji} {info.label}
                </span>
                {d.status !== "delivered" && (
                  <span className={`text-xs font-semibold ${due.late ? "text-red-600" : "text-muted-foreground"}`}>📅 {due.text}</span>
                )}
              </div>

              <div>
                <h2 className="text-lg font-bold leading-snug">{c.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {c.plan} · {c.eggs} ovos{c.trays ? ` (${c.trays} placa${c.trays !== 1 ? "s" : ""} de 30)` : ""}
                </p>
              </div>

              <div className="text-sm space-y-0.5">
                <p className="font-medium">
                  📍 {c.street}, {c.number}
                  {c.complement ? ` — ${c.complement}` : ""}
                </p>
                <p className="text-muted-foreground">
                  {c.neighborhood}
                  {c.cep ? ` · CEP ${c.cep}` : ""}
                </p>
                {c.reference && <p>🧭 {c.reference}</p>}
                {(c.preferredDay || c.preferredPeriod) && (c.preferredDay !== "Sem preferência" || c.preferredPeriod !== "Sem preferência") && (
                  <p className="text-muted-foreground">
                    🗓️ Prefere: {c.preferredDay || "—"} · {c.preferredPeriod || "—"}
                  </p>
                )}
              </div>

              {c.instructions && (
                <p className="text-sm bg-amber-50 border border-amber-200 rounded-xl p-3">📝 {c.instructions}</p>
              )}
              {d.note && <p className="text-sm bg-blue-50 border border-blue-200 rounded-xl p-3">💬 {d.note}</p>}
              {d.status === "failed" && d.failedReason && (
                <p className="text-sm bg-red-50 border border-red-200 rounded-xl p-3">⚠️ Última tentativa: {d.failedReason}</p>
              )}
              {d.status === "delivered" && (
                <p className="text-sm text-green-700">
                  Entregue{d.deliveredAt ? ` às ${new Date(d.deliveredAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Bahia" })}` : ""}
                  {d.deliveredTo ? ` · recebido por ${d.deliveredTo}` : ""}
                </p>
              )}

              {d.status !== "delivered" && (
                <div className="grid grid-cols-3 gap-2">
                  <a href={mapsUrl(c)} target="_blank" rel="noreferrer" className="h-11 rounded-xl border flex items-center justify-center text-sm font-medium">
                    📍 Mapa
                  </a>
                  {c.phone ? (
                    <a href={`tel:${c.phone.replace(/\D/g, "")}`} className="h-11 rounded-xl border flex items-center justify-center text-sm font-medium">
                      📞 Ligar
                    </a>
                  ) : (
                    <span className="h-11 rounded-xl border flex items-center justify-center text-sm text-muted-foreground">Sem telefone</span>
                  )}
                  {wa ? (
                    <a href={wa} target="_blank" rel="noreferrer" className="h-11 rounded-xl border flex items-center justify-center text-sm font-medium">
                      💬 WhatsApp
                    </a>
                  ) : (
                    <span />
                  )}
                </div>
              )}

              {(d.status === "accepted" || d.status === "preparing") && (
                <button
                  className="w-full h-14 rounded-xl bg-purple-600 text-white text-base font-bold disabled:opacity-60"
                  disabled={isBusy}
                  onClick={() => act(d, "out")}
                >
                  {isBusy ? "Salvando..." : "🚚 Saí para entrega"}
                </button>
              )}
              {d.status === "failed" && (
                <button
                  className="w-full h-14 rounded-xl bg-purple-600 text-white text-base font-bold disabled:opacity-60"
                  disabled={isBusy}
                  onClick={() => act(d, "out")}
                >
                  {isBusy ? "Salvando..." : "🔁 Tentar de novo"}
                </button>
              )}
              {d.status === "out" && (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    className="col-span-2 h-14 rounded-xl bg-green-600 text-white text-base font-bold disabled:opacity-60"
                    disabled={isBusy}
                    onClick={() => {
                      setSheet({ kind: "delivered", d })
                      setReceivedBy("")
                      setNote("")
                    }}
                  >
                    ✅ Entregue
                  </button>
                  <button
                    className="h-14 rounded-xl border-2 border-red-300 text-red-700 text-sm font-bold disabled:opacity-60"
                    disabled={isBusy}
                    onClick={() => {
                      setSheet({ kind: "failed", d })
                      setReason(FAIL_REASONS[0])
                      setNote("")
                    }}
                  >
                    ⚠️ Não consegui
                  </button>
                </div>
              )}
            </article>
          )
        })}
      </main>

      {sheet && (
        <div className="fixed inset-0 z-30 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => setSheet(null)}>
          <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold">
              {sheet.kind === "delivered" ? "✅ Confirmar entrega" : "⚠️ Não consegui entregar"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {sheet.d.customer.name} · {sheet.d.customer.street}, {sheet.d.customer.number}
            </p>
            {sheet.kind === "delivered" ? (
              <input className={input} placeholder="Quem recebeu? (opcional)" value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} />
            ) : (
              <select className={input} value={reason} onChange={(e) => setReason(e.target.value)}>
                {FAIL_REASONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            )}
            <input className={input} placeholder="Observação (opcional)" value={note} maxLength={200} onChange={(e) => setNote(e.target.value)} />
            <div className="grid grid-cols-2 gap-2">
              <button className="h-12 rounded-xl border font-medium" onClick={() => setSheet(null)}>
                Voltar
              </button>
              <button
                className={`h-12 rounded-xl text-white font-bold disabled:opacity-60 ${sheet.kind === "delivered" ? "bg-green-600" : "bg-red-600"}`}
                disabled={busy === sheet.d.id}
                onClick={() =>
                  sheet.kind === "delivered"
                    ? act(sheet.d, "delivered", { receivedBy, note })
                    : act(sheet.d, "failed", { reason, note })
                }
              >
                {busy === sheet.d.id ? "Salvando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

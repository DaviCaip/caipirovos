"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { formatCep, formatCpf, formatPhone, onlyDigits } from "@/lib/br"
import { dayKey, fmtBR, weekdayOf } from "@/lib/dates"
import { DELIVERY_DAYS, DELIVERY_PERIODS } from "@/lib/delivery"
import { formatBRL } from "@/lib/plans"
import type { CustomerDelivery } from "@/lib/customers"

const WHATSAPP = "5575983409912"
const helpLink = (text: string) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`

interface Sub {
  id: string
  plan: string
  eggs: number
  priceCents: number
  status: string
  paymentMethod: "card" | "pix"
  cancelAtPeriodEnd: boolean
  periodEnd: string | null
  createdAt: string
  cep: string
  street: string
  number: string
  neighborhood: string
  complement: string
  reference: string
  deliveryDay: string
  deliveryPeriod: string
  instructions: string
}
interface Me {
  customer: { name: string; cpfMasked: string; email: string | null; phone: string | null; mustChangePassword: boolean }
  subscriptions: Sub[]
  deliveries: CustomerDelivery[]
  plans: { name: string; eggs: number; priceInCents: number }[]
  now: string
}

const STEPS = [
  { key: "accepted", label: "Pedido aceito", emoji: "📥" },
  { key: "preparing", label: "Em preparo", emoji: "🧺" },
  { key: "out", label: "Saiu para entrega", emoji: "🚚" },
  { key: "delivered", label: "Entregue", emoji: "✅" },
]
const STEP_INDEX: Record<string, number> = { accepted: 0, preparing: 1, out: 2, failed: 2, delivered: 3 }
const MESSAGE: Record<string, string> = {
  accepted: "Recebemos o seu pedido! Estamos organizando a sua entrega.",
  preparing: "Estamos separando os seus ovos fresquinhos. 🥚",
  out: "O entregador saiu com o seu pedido! 🚚",
  failed: "Tentamos entregar e não conseguimos. Vamos entrar em contato com você.",
  delivered: "Entregue! Esperamos que goste. 🎉",
}

const dateBR = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Bahia" }) : "")
const timeBR = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Bahia", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""
const weekdayName = (key: string) => ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"][weekdayOf(key)]

class ApiError extends Error {
  status: number
  constructor(m: string, s: number) {
    super(m)
    this.status = s
  }
}

type Api = (path: string, init?: RequestInit) => Promise<any>

export default function AccountPage() {
  const [phase, setPhase] = useState<"checking" | "login" | "app">("checking")
  const [me, setMe] = useState<Me | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [cpf, setCpf] = useState("")
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loggingIn, setLoggingIn] = useState(false)

  const api: Api = useCallback(async (path, init) => {
    const res = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers || {}) } })
    const json = await res.json().catch(() => ({}))
    if (res.status === 401 && path !== "/api/account/login") {
      setPhase("login")
      throw new ApiError("Sua sessão expirou. Entre de novo.", 401)
    }
    if (!res.ok) throw new ApiError(json.error || "Algo deu errado.", res.status)
    return json
  }, [])

  const load = useCallback(async () => {
    try {
      const json: Me = await api("/api/account/me")
      setMe(json)
      setPhase("app")
      setError(null)
    } catch (e: any) {
      if (e.status !== 401) setError(e.message)
    }
  }, [api])

  useEffect(() => {
    load().finally(() => setPhase((p) => (p === "checking" ? "login" : p)))
  }, [load])

  async function login() {
    setLoggingIn(true)
    setLoginError(null)
    try {
      await api("/api/account/login", { method: "POST", body: JSON.stringify({ cpf, password }) })
      setPassword("")
      await load()
    } catch (e: any) {
      setLoginError(e.message)
    }
    setLoggingIn(false)
  }

  async function logout() {
    await fetch("/api/account/logout", { method: "POST" })
    setMe(null)
    setNotice(null)
    setPhase("login")
  }

  if (phase === "checking") return <div className="min-h-screen bg-amber-50 flex items-center justify-center text-muted-foreground">Carregando...</div>

  if (phase === "login") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-white to-yellow-50 flex items-center justify-center p-5">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 space-y-4">
          <div className="text-center space-y-1">
            <div className="text-5xl">🥚</div>
            <h1 className="text-xl font-bold">Minha conta Caipirovos</h1>
            <p className="text-sm text-muted-foreground">Acompanhe sua entrega e gerencie sua assinatura</p>
          </div>
          <input
            className="w-full border rounded-xl px-4 h-12 text-base"
            placeholder="Seu CPF"
            inputMode="numeric"
            autoComplete="username"
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
          />
          <input
            type="password"
            className="w-full border rounded-xl px-4 h-12 text-base"
            placeholder="Sua senha"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && cpf && password && login()}
          />
          {loginError && <p className="text-sm text-red-600">{loginError}</p>}
          <button
            className="w-full h-12 rounded-xl bg-black text-white font-semibold disabled:opacity-50"
            disabled={loggingIn || onlyDigits(cpf).length !== 11 || !password}
            onClick={login}
          >
            {loggingIn ? "Entrando..." : "Entrar"}
          </button>
          <p className="text-xs text-center text-muted-foreground">
            A senha é a que você criou ao assinar.{" "}
            <a className="underline" target="_blank" rel="noreferrer" href={helpLink("Olá! Esqueci a senha da minha conta do Caipirovos.")}>
              Esqueci minha senha
            </a>{" "}
            (a equipe envia uma provisória pelo WhatsApp).
          </p>
          <p className="text-xs text-center">
            <a className="underline" href="/">
              ← Voltar ao site
            </a>
          </p>
        </div>
      </div>
    )
  }

  if (!me) return <div className="min-h-screen bg-amber-50 p-6 text-center text-red-600">{error || "Não foi possível carregar sua conta."}</div>

  return (
    <div className="min-h-screen bg-amber-50 pb-16">
      <header className="bg-yellow-400 px-4 py-4 shadow">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-black/70">Minha conta</p>
            <h1 className="font-bold text-lg">Olá, {me.customer.name.split(" ")[0]} 👋</h1>
          </div>
          <div className="flex gap-2">
            <a href="/" className="h-10 px-3 rounded-lg bg-black/10 text-sm font-medium flex items-center">
              Site
            </a>
            <button className="h-10 px-3 rounded-lg bg-black/10 text-sm font-medium" onClick={logout}>
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-5">
        {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}
        {notice && <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-xl p-3">{notice}</p>}

        {me.customer.mustChangePassword ? (
          <PasswordCard
            api={api}
            forced
            onDone={() => {
              setNotice("Senha criada! Agora é só aproveitar a sua conta.")
              load()
            }}
          />
        ) : (
          <>
            <AccountBody me={me} api={api} reload={load} setNotice={setNotice} setError={setError} />
            <PasswordSection api={api} setNotice={setNotice} />
          </>
        )}
      </main>
    </div>
  )
}

function PasswordSection({ api, setNotice }: { api: Api; setNotice: (s: string | null) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <section className="bg-white rounded-2xl shadow p-5 space-y-3">
      <button className="w-full flex items-center justify-between font-semibold" onClick={() => setOpen((o) => !o)}>
        🔒 Trocar minha senha <span className="text-muted-foreground text-sm">{open ? "fechar" : "abrir"}</span>
      </button>
      {open && (
        <PasswordCard
          api={api}
          onDone={() => {
            setOpen(false)
            setNotice("Senha alterada com sucesso.")
          }}
        />
      )}
    </section>
  )
}

function PasswordCard({ api, forced, onDone }: { api: Api; forced?: boolean; onDone: () => void }) {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [next2, setNext2] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const input = "w-full border rounded-xl px-4 h-12 text-base bg-white"

  async function save() {
    if (next.length < 6) return setError("A nova senha precisa ter pelo menos 6 caracteres.")
    if (next !== next2) return setError("As duas senhas novas não são iguais.")
    setSaving(true)
    setError(null)
    try {
      await api("/api/account/password", { method: "POST", body: JSON.stringify({ current, next }) })
      onDone()
    } catch (e: any) {
      setError(e.message)
    }
    setSaving(false)
  }

  return (
    <div className={forced ? "bg-white rounded-2xl shadow p-5 space-y-3" : "space-y-3"}>
      {forced && (
        <>
          <h2 className="text-lg font-bold">Escolha a sua senha</h2>
          <p className="text-sm text-muted-foreground">Você entrou com uma senha provisória. Crie uma senha só sua para continuar.</p>
        </>
      )}
      <input type="password" className={input} placeholder={forced ? "Senha provisória (a que você recebeu)" : "Senha atual"} value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
      <input type="password" className={input} placeholder="Nova senha (mínimo 6 caracteres)" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
      <input type="password" className={input} placeholder="Repita a nova senha" value={next2} onChange={(e) => setNext2(e.target.value)} autoComplete="new-password" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="w-full h-12 rounded-xl bg-black text-white font-semibold disabled:opacity-50" disabled={saving || !current || !next} onClick={save}>
        {saving ? "Salvando..." : "Salvar nova senha"}
      </button>
    </div>
  )
}

function AccountBody({ me, api, reload, setNotice, setError }: { me: Me; api: Api; reload: () => Promise<void>; setNotice: (s: string | null) => void; setError: (s: string | null) => void }) {
  const today = dayKey(me.now)
  const primary = useMemo(
    () => me.subscriptions.find((s) => s.status === "active") || me.subscriptions.find((s) => s.status === "pending") || me.subscriptions[0] || null,
    [me.subscriptions]
  )
  const others = me.subscriptions.filter((s) => s.id !== primary?.id)

  // entrega em destaque: a que está em andamento (a mais antiga em aberto), senão a última entregue
  const open = me.deliveries.filter((d) => d.status !== "delivered" && d.status !== "canceled").sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  const delivered = me.deliveries.filter((d) => d.status === "delivered").sort((a, b) => (b.deliveredAt || "").localeCompare(a.deliveredAt || ""))
  const current = open[0] || delivered[0] || null

  if (!primary) {
    return (
      <section className="bg-white rounded-2xl shadow p-6 text-center space-y-3">
        <div className="text-4xl">🥚</div>
        <p className="font-semibold">Você ainda não tem assinatura nesta conta.</p>
        <a href="/#assinatura" className="inline-block px-5 h-11 leading-[2.75rem] rounded-xl bg-black text-white font-semibold">
          Ver planos
        </a>
      </section>
    )
  }

  return (
    <>
      <DeliveryCard current={current} primary={primary} today={today} />
      <SubscriptionCard key={primary.id + primary.plan + primary.status + String(primary.cancelAtPeriodEnd)} sub={primary} me={me} api={api} reload={reload} setNotice={setNotice} setError={setError} />
      <DataCard key={primary.id + primary.street + primary.number + (me.customer.phone || "")} sub={primary} me={me} api={api} reload={reload} setNotice={setNotice} />
      {delivered.length > 0 && (
        <section className="bg-white rounded-2xl shadow p-5 space-y-2">
          <h2 className="font-bold">📦 Entregas anteriores</h2>
          <ul className="divide-y text-sm">
            {delivered.slice(0, 12).map((d) => (
              <li key={d.id} className="py-2">
                ✅ {d.plan || "Assinatura"} · entregue em {dateBR(d.deliveredAt)}
              </li>
            ))}
          </ul>
        </section>
      )}
      {others.length > 0 && (
        <section className="bg-white rounded-2xl shadow p-5 space-y-2">
          <h2 className="font-bold">Pedidos anteriores</h2>
          <ul className="divide-y text-sm">
            {others.map((s) => (
              <li key={s.id} className="py-2 flex justify-between gap-3">
                <span>
                  {s.plan} · {dateBR(s.createdAt)} · {s.paymentMethod === "pix" ? "Pix" : "Cartão"}
                </span>
                <span className="text-muted-foreground">{s.status === "active" ? "Pago" : s.status === "pending" ? "Aguardando Pix" : "Encerrado"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

function DeliveryCard({ current, primary, today }: { current: CustomerDelivery | null; primary: Sub; today: string }) {
  if (!current) {
    return (
      <section className="bg-white rounded-2xl shadow p-5 space-y-2">
        <h2 className="font-bold">🚚 Minha entrega</h2>
        <p className="text-sm text-muted-foreground">
          {primary.status === "pending"
            ? "Estamos aguardando o pagamento do seu Pix. Assim que ele for confirmado, sua entrega aparece aqui."
            : primary.status === "active"
              ? "Sua próxima entrega aparece aqui assim que o pagamento do mês for confirmado."
              : "Você não tem entregas em andamento."}
        </p>
      </section>
    )
  }
  const idx = STEP_INDEX[current.status] ?? 0
  const stamps = [current.acceptedAt, current.preparingAt, current.outAt, current.deliveredAt]
  const failed = current.status === "failed"
  const due = current.dueDate
  return (
    <section className="bg-white rounded-2xl shadow p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-bold">🚚 Minha entrega</h2>
          <p className="text-sm text-muted-foreground">{current.plan}</p>
        </div>
        {current.status !== "delivered" && (
          <span className="text-sm font-medium bg-yellow-100 text-yellow-900 rounded-full px-3 py-1">
            Previsão: {weekdayName(due)}, {fmtBR(due)}
            {due === today ? " (hoje)" : ""}
          </span>
        )}
      </div>

      <ol className="grid grid-cols-4 gap-1 text-center">
        {STEPS.map((s, i) => {
          const done = i <= idx && !(failed && i === 2)
          const active = i === idx
          return (
            <li key={s.key} className="space-y-1">
              <div
                className={`mx-auto h-10 w-10 rounded-full flex items-center justify-center text-lg ${
                  failed && i === 2 ? "bg-red-100" : done ? (active ? "bg-green-500 text-white ring-4 ring-green-100" : "bg-green-100") : "bg-muted opacity-60"
                }`}
              >
                {failed && i === 2 ? "⚠️" : s.emoji}
              </div>
              <p className={`text-[11px] leading-tight ${done ? "font-semibold" : "text-muted-foreground"}`}>{s.label}</p>
              <p className="text-[10px] text-muted-foreground">{done && stamps[i] ? timeBR(stamps[i]) : ""}</p>
            </li>
          )
        })}
      </ol>

      <p className={`text-sm rounded-xl p-3 ${failed ? "bg-red-50 border border-red-200 text-red-800" : "bg-green-50 border border-green-200 text-green-900"}`}>
        {MESSAGE[current.status] || MESSAGE.accepted}
        {failed && current.failedReason ? ` (${current.failedReason})` : ""}
      </p>
    </section>
  )
}

function SubscriptionCard({ sub, me, api, reload, setNotice, setError }: { sub: Sub; me: Me; api: Api; reload: () => Promise<void>; setNotice: (s: string | null) => void; setError: (s: string | null) => void }) {
  const [busy, setBusy] = useState<string | null>(null)
  const [dialog, setDialog] = useState<null | "cancel" | "plan" | "pix">(null)
  const [plan, setPlan] = useState(sub.plan)
  const [pix, setPix] = useState<{ qrCode: string; qrCodeBase64: string; amountCents: number } | null>(null)
  const [copied, setCopied] = useState(false)

  const ended = sub.status === "canceled"
  const pending = sub.status === "pending"
  const card = sub.paymentMethod === "card"

  async function run(action: string, extra: Record<string, unknown> = {}, ok?: string) {
    setBusy(action)
    setError(null)
    try {
      const json = await api("/api/account/subscription", { method: "POST", body: JSON.stringify({ subscriptionId: sub.id, action, ...extra }) })
      if (action === "portal" && json.url) {
        window.location.href = json.url
        return
      }
      setDialog(null)
      if (ok) setNotice(ok)
      await reload()
    } catch (e: any) {
      setError(e.message)
      setDialog(null)
    }
    setBusy(null)
  }

  async function generatePix() {
    setBusy("pix")
    setError(null)
    try {
      const json = await api("/api/account/renew-pix", { method: "POST", body: JSON.stringify({ subscriptionId: sub.id, plan }) })
      setPix({ qrCode: json.qrCode, qrCodeBase64: json.qrCodeBase64 || "", amountCents: json.amountCents })
    } catch (e: any) {
      setError(e.message)
      setDialog(null)
    }
    setBusy(null)
  }

  async function copyPix() {
    if (!pix) return
    try {
      await navigator.clipboard.writeText(pix.qrCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {}
  }

  const chip = pending
    ? { t: "⏳ Aguardando Pix", c: "bg-orange-100 text-orange-800" }
    : ended
      ? { t: "❌ Encerrada", c: "bg-red-100 text-red-800" }
      : sub.cancelAtPeriodEnd
        ? { t: "⚠️ Cancelamento agendado", c: "bg-amber-100 text-amber-800" }
        : { t: "✅ Ativa", c: "bg-green-100 text-green-800" }
  const btn = "h-11 px-4 rounded-xl border font-medium text-sm disabled:opacity-50"

  return (
    <section className="bg-white rounded-2xl shadow p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-bold">📋 Minha assinatura</h2>
          <p className="text-lg font-semibold">
            {sub.plan} · {sub.eggs} ovos
          </p>
          <p className="text-sm text-muted-foreground">
            {formatBRL(sub.priceCents)} por mês · {card ? "Cartão de crédito" : "Pix"}
          </p>
        </div>
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${chip.c}`}>{chip.t}</span>
      </div>

      {card && !ended && !pending && sub.periodEnd && (
        <p className="text-sm bg-muted/60 rounded-xl p-3">
          {sub.cancelAtPeriodEnd
            ? `Sua assinatura termina em ${dateBR(sub.periodEnd)}. A entrega do mês já pago continua garantida.`
            : `Próxima cobrança em ${dateBR(sub.periodEnd)}.`}
        </p>
      )}
      {!card && !pending && !ended && (
        <p className="text-sm bg-muted/60 rounded-xl p-3">No Pix você paga mês a mês. Quando quiser renovar, é só gerar o Pix do próximo mês.</p>
      )}

      <div className="flex gap-2 flex-wrap">
        {card && !ended && !pending && (
          <>
            {sub.cancelAtPeriodEnd ? (
              <button className={`${btn} bg-black text-white border-black`} disabled={!!busy} onClick={() => run("resume", {}, "Assinatura retomada! Ela continua normalmente.")}>
                {busy === "resume" ? "Salvando..." : "Retomar assinatura"}
              </button>
            ) : (
              <>
                <button
                  className={btn}
                  disabled={!!busy}
                  onClick={() => {
                    setPlan(sub.plan)
                    setDialog("plan")
                  }}
                >
                  Trocar de plano
                </button>
                <button className={`${btn} text-red-600 border-red-200`} disabled={!!busy} onClick={() => setDialog("cancel")}>
                  Cancelar assinatura
                </button>
              </>
            )}
            <button className={btn} disabled={!!busy} onClick={() => run("portal")}>
              {busy === "portal" ? "Abrindo..." : "💳 Gerenciar cartão e faturas"}
            </button>
          </>
        )}
        {!card && !pending && (
          <button
            className={`${btn} bg-black text-white border-black`}
            disabled={!!busy}
            onClick={() => {
              setPlan(sub.plan)
              setPix(null)
              setDialog("pix")
            }}
          >
            Gerar Pix do próximo mês
          </button>
        )}
        {card && ended && (
          <a href="/#assinatura" className={`${btn} bg-black text-white border-black flex items-center`}>
            Assinar novamente
          </a>
        )}
      </div>

      {dialog && (
        <div className="fixed inset-0 z-30 bg-black/50 flex items-end sm:items-center justify-center" onClick={() => !pix && setDialog(null)}>
          <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {dialog === "cancel" && (
              <>
                <h3 className="text-lg font-bold">Cancelar a assinatura?</h3>
                <p className="text-sm text-muted-foreground">
                  Você continua recebendo a entrega do mês que já pagou
                  {sub.periodEnd ? ` e a assinatura termina em ${dateBR(sub.periodEnd)}` : ""}. Depois disso não há mais cobranças. Dá para retomar antes do fim.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button className={btn} onClick={() => setDialog(null)}>
                    Voltar
                  </button>
                  <button
                    className="h-11 rounded-xl bg-red-600 text-white font-semibold disabled:opacity-50"
                    disabled={!!busy}
                    onClick={() => run("cancel", {}, "Cancelamento agendado. Você continua com a entrega do mês pago.")}
                  >
                    {busy === "cancel" ? "Salvando..." : "Cancelar assinatura"}
                  </button>
                </div>
              </>
            )}

            {dialog === "plan" && (
              <>
                <h3 className="text-lg font-bold">Trocar de plano</h3>
                <div className="space-y-2">
                  {me.plans.map((p) => (
                    <label key={p.name} className={`flex items-center justify-between border-2 rounded-xl p-3 cursor-pointer ${plan === p.name ? "border-black" : "border-transparent bg-muted/50"}`}>
                      <span>
                        <input type="radio" className="mr-2" checked={plan === p.name} onChange={() => setPlan(p.name)} />
                        <strong>{p.name}</strong> · {p.eggs} ovos
                        {p.name === sub.plan ? " (atual)" : ""}
                      </span>
                      <span className="text-sm">{formatBRL(p.priceInCents)}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">O novo plano vale a partir da próxima cobrança{sub.periodEnd ? ` (${dateBR(sub.periodEnd)})` : ""}. A entrega deste mês não muda.</p>
                <div className="grid grid-cols-2 gap-2">
                  <button className={btn} onClick={() => setDialog(null)}>
                    Voltar
                  </button>
                  <button
                    className="h-11 rounded-xl bg-black text-white font-semibold disabled:opacity-50"
                    disabled={!!busy || plan === sub.plan}
                    onClick={() => run("change_plan", { plan }, `Plano alterado para ${plan}. Vale a partir da próxima cobrança.`)}
                  >
                    {busy === "change_plan" ? "Salvando..." : "Confirmar troca"}
                  </button>
                </div>
              </>
            )}

            {dialog === "pix" && !pix && (
              <>
                <h3 className="text-lg font-bold">Pix do próximo mês</h3>
                <div className="space-y-2">
                  {me.plans.map((p) => (
                    <label key={p.name} className={`flex items-center justify-between border-2 rounded-xl p-3 cursor-pointer ${plan === p.name ? "border-black" : "border-transparent bg-muted/50"}`}>
                      <span>
                        <input type="radio" className="mr-2" checked={plan === p.name} onChange={() => setPlan(p.name)} />
                        <strong>{p.name}</strong> · {p.eggs} ovos
                      </span>
                      <span className="text-sm">{formatBRL(p.priceInCents)}</span>
                    </label>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button className={btn} onClick={() => setDialog(null)}>
                    Voltar
                  </button>
                  <button className="h-11 rounded-xl bg-black text-white font-semibold disabled:opacity-50" disabled={!!busy} onClick={generatePix}>
                    {busy === "pix" ? "Gerando..." : "Gerar Pix"}
                  </button>
                </div>
              </>
            )}

            {dialog === "pix" && pix && (
              <div className="space-y-3 text-center">
                <h3 className="text-lg font-bold">Pague com Pix · {formatBRL(pix.amountCents)}</h3>
                {pix.qrCodeBase64 && <img src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code Pix" className="mx-auto w-48 h-48" />}
                <p className="text-xs break-all bg-muted rounded-lg p-3 select-all">{pix.qrCode}</p>
                <button className={`${btn} w-full`} onClick={copyPix}>
                  {copied ? "Código copiado!" : "Copiar código Pix"}
                </button>
                <p className="text-xs text-muted-foreground">Assim que o pagamento for confirmado, sua entrega aparece aqui.</p>
                <button
                  className={`${btn} w-full`}
                  onClick={() => {
                    setDialog(null)
                    setPix(null)
                    reload()
                  }}
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function DataCard({ sub, me, api, reload, setNotice }: { sub: Sub; me: Me; api: Api; reload: () => Promise<void>; setNotice: (s: string | null) => void }) {
  const [editing, setEditing] = useState(false)
  const [f, setF] = useState({
    phone: me.customer.phone || "",
    email: me.customer.email || "",
    cep: sub.cep,
    street: sub.street,
    number: sub.number,
    neighborhood: sub.neighborhood,
    complement: sub.complement,
    reference: sub.reference,
    deliveryDay: sub.deliveryDay || DELIVERY_DAYS[0],
    deliveryPeriod: sub.deliveryPeriod || DELIVERY_PERIODS[0],
    instructions: sub.instructions,
  })
  const [error, setError] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [cepInfo, setCepInfo] = useState<string | null>(null)
  const input = "w-full border rounded-xl px-3 h-11 text-sm bg-white"
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }))

  async function lookupCep(value: string) {
    const d = onlyDigits(value)
    if (d.length !== 8) return
    setCepInfo(null)
    try {
      const j = await (await fetch(`https://viacep.com.br/ws/${d}/json/`)).json()
      if (j.erro) return setCepInfo("CEP não encontrado")
      if ((j.localidade || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() !== "feira de santana") {
        return setCepInfo(`Esse CEP é de ${j.localidade}. Entregamos só em Feira de Santana.`)
      }
      setF((p) => ({ ...p, street: j.logradouro || p.street, neighborhood: j.bairro || p.neighborhood }))
    } catch {}
  }

  async function save() {
    setSaving(true)
    setError(null)
    setFields({})
    const res = await fetch("/api/account/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) }).catch(() => null)
    const json = res ? await res.json().catch(() => ({})) : {}
    if (res && res.ok) {
      setEditing(false)
      setNotice("Dados atualizados! A próxima entrega já usa as novas informações.")
      await reload()
    } else {
      setError(json.error || "Não foi possível salvar. Tente de novo.")
      if (json.fields) setFields(json.fields)
    }
    setSaving(false)
  }

  const err = (k: string) => (fields[k] ? <p className="text-xs text-red-500 mt-0.5">{fields[k]}</p> : null)

  return (
    <section className="bg-white rounded-2xl shadow p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">👤 Meus dados</h2>
        {!editing && (
          <button className="text-sm underline" onClick={() => setEditing(true)}>
            Editar
          </button>
        )}
      </div>

      {!editing ? (
        <div className="text-sm space-y-1">
          <p>
            <strong>{me.customer.name}</strong> · CPF {me.customer.cpfMasked}
          </p>
          <p className="text-muted-foreground">
            {me.customer.phone || "—"} · {me.customer.email || "—"}
          </p>
          <p>
            📍 {sub.street}, {sub.number}
            {sub.complement ? ` — ${sub.complement}` : ""} · {sub.neighborhood} · CEP {sub.cep}
          </p>
          {sub.reference && <p className="text-muted-foreground">🧭 {sub.reference}</p>}
          <p className="text-muted-foreground">
            🗓️ Prefere: {sub.deliveryDay || "—"} · {sub.deliveryPeriod || "—"}
          </p>
          {sub.instructions && <p className="text-muted-foreground">📝 {sub.instructions}</p>}
          <p className="text-xs text-muted-foreground pt-1">
            Para mudar nome ou CPF, fale com a equipe.{" "}
            <a className="underline" target="_blank" rel="noreferrer" href={helpLink("Olá! Preciso corrigir meu nome/CPF na minha conta do Caipirovos.")}>
              WhatsApp
            </a>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <input className={input} placeholder="WhatsApp" value={f.phone} inputMode="tel" onChange={(e) => set("phone", formatPhone(e.target.value))} />
              {err("phone")}
            </div>
            <div>
              <input className={input} placeholder="E-mail" value={f.email} onChange={(e) => set("email", e.target.value)} />
              {err("email")}
            </div>
          </div>
          <div>
            <input
              className={input}
              placeholder="CEP"
              value={f.cep}
              inputMode="numeric"
              onChange={(e) => {
                const v = formatCep(e.target.value)
                set("cep", v)
                if (onlyDigits(v).length === 8) lookupCep(v)
              }}
            />
            {err("cep")}
            {cepInfo && <p className="text-xs text-red-500 mt-0.5">{cepInfo}</p>}
          </div>
          <div>
            <input className={input} placeholder="Rua" value={f.street} onChange={(e) => set("street", e.target.value)} />
            {err("street")}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <input className={input} placeholder="Número" value={f.number} onChange={(e) => set("number", e.target.value)} />
              {err("number")}
            </div>
            <div className="col-span-2">
              <input className={input} placeholder="Bairro" value={f.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} />
              {err("neighborhood")}
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input className={input} placeholder="Complemento" value={f.complement} onChange={(e) => set("complement", e.target.value)} />
            <input className={input} placeholder="Ponto de referência" value={f.reference} onChange={(e) => set("reference", e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <select className={input} value={f.deliveryDay} onChange={(e) => set("deliveryDay", e.target.value)}>
              {DELIVERY_DAYS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
            <select className={input} value={f.deliveryPeriod} onChange={(e) => set("deliveryPeriod", e.target.value)}>
              {DELIVERY_PERIODS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
          {err("deliveryDay")}
          <textarea
            className="w-full border rounded-xl px-3 py-2 text-sm bg-white"
            rows={2}
            maxLength={300}
            placeholder="Instruções para o entregador"
            value={f.instructions}
            onChange={(e) => set("instructions", e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-2 gap-2">
            <button
              className="h-11 rounded-xl border font-medium text-sm"
              onClick={() => {
                setEditing(false)
                setError(null)
                setFields({})
              }}
            >
              Cancelar
            </button>
            <button className="h-11 rounded-xl bg-black text-white font-semibold text-sm disabled:opacity-50" disabled={saving} onClick={save}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

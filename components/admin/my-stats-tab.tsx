"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatBRL } from "@/lib/plans"

type Api = (path: string, init?: RequestInit) => Promise<any>

interface Purchase {
  at: string
  plan: string
  eggs: number
  code: string
  discountCents: number
}
interface CouponInfo {
  code: string
  discount_type: "percent" | "fixed"
  discount_value: number
  active: boolean
  starts_at: string | null
  expires_at: string | null
  max_uses: number | null
  used_count: number
}
interface Payload {
  account: { id: string; name: string; monthlyGoal: number }
  coupons: CouponInfo[]
  purchases: Purchase[]
  now: string
}

const TZ = "America/Bahia"
const DAY = 86400000
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
const WEEKDAYS_LONG = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"]

// Níveis com a cara do Caipirovos: quanto mais compras com o cupom, mais o bichinho cresce.
const LEVELS = [
  { min: 0, name: "Ovo chocando", emoji: "🥚" },
  { min: 1, name: "Pintinho", emoji: "🐣" },
  { min: 5, name: "Franguinho", emoji: "🐥" },
  { min: 15, name: "Galinha caipira", emoji: "🐔" },
  { min: 30, name: "Galo garnisé", emoji: "🐓" },
  { min: 60, name: "Rei do terreiro", emoji: "👑" },
]

// ---------- datas (sempre no horário da Bahia) ----------
const dayKey = (d: string | number | Date) => new Date(d).toLocaleDateString("sv-SE", { timeZone: TZ }) // AAAA-MM-DD
const addDays = (key: string, n: number) => new Date(Date.parse(`${key}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10)
const weekdayOf = (key: string) => new Date(`${key}T00:00:00Z`).getUTCDay()
const fmtShort = (key: string) => `${key.slice(8, 10)}/${key.slice(5, 7)}`

function ago(iso: string, nowMs: number): string {
  const s = Math.max(0, (nowMs - Date.parse(iso)) / 1000)
  if (s < 60) return "agora mesmo"
  const m = Math.floor(s / 60)
  if (m < 60) return `há ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  return d === 1 ? "ontem" : `há ${d} dias`
}

function useCountUp(target: number, ms = 900) {
  const [v, setV] = useState(0)
  useEffect(() => {
    let raf = 0
    const start = performance.now()
    const tick = () => {
      const p = Math.min(1, Math.max(0, (performance.now() - start) / ms))
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

function BigNumber({ value, money }: { value: number; money?: boolean }) {
  const v = useCountUp(value)
  return <>{money ? formatBRL(v) : v.toLocaleString("pt-BR")}</>
}

function describeCoupon(c: CouponInfo) {
  return c.discount_type === "percent"
    ? `${c.discount_value}% de desconto`
    : `${formatBRL(c.discount_value)} de desconto`
}

function couponStatus(c: CouponInfo, nowMs: number): { text: string; tone: "ok" | "warn" | "off" } {
  if (!c.active) return { text: "⏸️ Desligado", tone: "off" }
  if (c.expires_at && Date.parse(c.expires_at) < nowMs) return { text: "⌛ Expirado", tone: "off" }
  if (c.starts_at && Date.parse(c.starts_at) > nowMs) {
    const d = Math.ceil((Date.parse(c.starts_at) - nowMs) / DAY)
    return { text: `🗓️ Começa em ${d} dia${d !== 1 ? "s" : ""}`, tone: "warn" }
  }
  if (c.expires_at) {
    const d = Math.ceil((Date.parse(c.expires_at) - nowMs) / DAY)
    return { text: `⏳ Expira em ${d} dia${d !== 1 ? "s" : ""}`, tone: d <= 7 ? "warn" : "ok" }
  }
  return { text: "✅ Valendo, sem data final", tone: "ok" }
}

export function MyStatsTab({ api, accountId }: { api: Api; accountId?: string }) {
  const [data, setData] = useState<Payload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [range, setRange] = useState<7 | 30 | 90 | 0>(30)
  const [ready, setReady] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const json = await api(`/api/admin/my-stats${accountId ? `?account=${accountId}` : ""}`)
      setData(json)
      setError(null)
      setReady(false)
      setTimeout(() => setReady(true), 60)
    } catch (e: any) {
      setError(e.message)
    }
  }, [api, accountId])

  useEffect(() => {
    setData(null)
    load()
  }, [load])

  const stats = useMemo(() => {
    if (!data) return null
    const nowMs = Date.parse(data.now)
    const today = dayKey(nowMs)
    const all = data.purchases
    const inRange = range === 0 ? all : all.filter((p) => Date.parse(p.at) >= nowMs - range * DAY)

    // compras por dia (tudo)
    const perDay = new Map<string, number>()
    for (const p of all) perDay.set(dayKey(p.at), (perDay.get(dayKey(p.at)) || 0) + 1)

    // gráfico de barras
    const chartDays = range === 0 ? 90 : range
    const bars = Array.from({ length: chartDays }, (_, i) => {
      const key = addDays(today, -(chartDays - 1 - i))
      return { key, count: perDay.get(key) || 0 }
    })
    const barMax = Math.max(1, ...bars.map((b) => b.count))

    // calendário de calor: 16 semanas, colunas começando no domingo
    const WEEKS = 16
    const start = addDays(today, -(weekdayOf(today) + (WEEKS - 1) * 7))
    const cells = Array.from({ length: WEEKS * 7 }, (_, i) => {
      const key = addDays(start, i)
      return { key, count: perDay.get(key) || 0, future: key > today }
    })
    const heatMax = Math.max(1, ...cells.map((c) => c.count))

    // dia da semana
    const weekday = Array(7).fill(0)
    for (const p of inRange) weekday[weekdayOf(dayKey(p.at))]++
    const bestWeekday = weekday.indexOf(Math.max(...weekday))

    // planos
    const plans = new Map<string, number>()
    for (const p of inRange) plans.set(p.plan || "—", (plans.get(p.plan || "—") || 0) + 1)

    // sequência de dias seguidos
    let streak = 0
    let cursor = perDay.has(today) ? today : addDays(today, -1)
    while (perDay.has(cursor)) {
      streak++
      cursor = addDays(cursor, -1)
    }

    const monthKey = today.slice(0, 7)
    const thisMonth = all.filter((p) => dayKey(p.at).slice(0, 7) === monthKey).length
    const total = all.length
    const levelIdx = LEVELS.reduce((acc, l, i) => (total >= l.min ? i : acc), 0)

    return {
      nowMs,
      today,
      inRange,
      bars,
      barMax,
      cells,
      heatMax,
      weekday,
      bestWeekday,
      plans: Array.from(plans.entries()).sort((a, b) => b[1] - a[1]),
      streak,
      thisMonth,
      total,
      levelIdx,
      eggs: inRange.reduce((s, p) => s + p.eggs, 0),
      saved: inRange.reduce((s, p) => s + p.discountCents, 0),
      last: all[0]?.at ?? null,
      feed: [...all].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 8),
    }
  }, [data, range])

  async function copy(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 2200)
    } catch {}
  }

  if (error) return <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>
  if (!data || !stats) return <p className="text-center text-muted-foreground py-10">Carregando seus resultados...</p>

  const { account, coupons } = data
  const level = LEVELS[stats.levelIdx]
  const next = LEVELS[stats.levelIdx + 1]
  const levelProgress = next ? ((stats.total - level.min) / (next.min - level.min)) * 100 : 100
  const goal = account.monthlyGoal
  const goalPct = goal > 0 ? Math.min(100, (stats.thisMonth / goal) * 100) : 0
  const R = 46
  const C = 2 * Math.PI * R
  const heat = (count: number) =>
    count === 0 ? undefined : `color-mix(in srgb, var(--secondary) ${25 + Math.round((count / stats.heatMax) * 75)}%, #fff)`

  return (
    <div className="space-y-6">
      {/* Faixa de boas-vindas */}
      <div className="rounded-2xl bg-secondary text-secondary-foreground p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-sm opacity-80">{accountId ? "Painel de" : "Olá,"}</p>
          <h2 className="text-2xl md:text-3xl font-bold">
            {account.name} {level.emoji}
          </h2>
          <p className="text-sm mt-1 opacity-90">
            {stats.total === 0
              ? "Seu cupom está pronto para brilhar. Compartilhe e acompanhe tudo por aqui. 🚀"
              : `Seu cupom já virou ${stats.total} compra${stats.total !== 1 ? "s" : ""}. Bora pra próxima! 🔥`}
          </p>
        </div>
        <div className="flex gap-1 bg-black/20 rounded-full p-1 self-start">
          {([7, 30, 90, 0] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                range === r ? "bg-white text-black" : "text-white/90 hover:bg-white/10"
              }`}
            >
              {r === 0 ? "Tudo" : `${r} dias`}
            </button>
          ))}
        </div>
      </div>

      {/* Números principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-3xl font-bold">
              <BigNumber value={stats.inRange.length} />
            </p>
            <p className="text-sm text-muted-foreground">🛒 compras com seu cupom</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-3xl font-bold">
              <BigNumber value={stats.eggs} />
            </p>
            <p className="text-sm text-muted-foreground">🥚 ovos que você ajudou a entregar</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-3xl font-bold text-green-700">
              <BigNumber value={stats.saved} money />
            </p>
            <p className="text-sm text-muted-foreground">💚 que seus seguidores economizaram</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-3xl font-bold">{stats.streak > 0 ? `🔥 ${stats.streak}` : stats.last ? ago(stats.last, stats.nowMs) : "—"}</p>
            <p className="text-sm text-muted-foreground">
              {stats.streak > 0 ? `dia${stats.streak !== 1 ? "s" : ""} seguidos com compras` : "último uso do cupom"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Nível + meta */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="text-5xl">{level.emoji}</div>
              <div>
                <p className="text-xs text-muted-foreground">Seu nível</p>
                <p className="text-xl font-bold">{level.name}</p>
              </div>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-secondary transition-[width] duration-1000 ease-out"
                style={{ width: ready ? `${levelProgress}%` : "0%" }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {next
                ? `Faltam ${next.min - stats.total} compra${next.min - stats.total !== 1 ? "s" : ""} para virar ${next.emoji} ${next.name}`
                : "Você chegou ao topo do terreiro! 👑"}
            </p>
            <div className="flex gap-1 flex-wrap pt-1">
              {LEVELS.map((l, i) => (
                <span
                  key={l.name}
                  title={`${l.name} (${l.min}+ compras)`}
                  className={`text-xl px-1.5 rounded-lg ${i <= stats.levelIdx ? "" : "opacity-25 grayscale"}`}
                >
                  {l.emoji}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-5">
            {goal > 0 ? (
              <>
                <svg viewBox="0 0 120 120" className="w-32 h-32 shrink-0 -rotate-90">
                  <circle cx="60" cy="60" r={R} fill="none" stroke="currentColor" strokeWidth="12" className="text-muted" />
                  <circle
                    cx="60"
                    cy="60"
                    r={R}
                    fill="none"
                    strokeWidth="12"
                    strokeLinecap="round"
                    stroke="var(--secondary)"
                    strokeDasharray={C}
                    strokeDashoffset={ready ? C - (goalPct / 100) * C : C}
                    style={{ transition: "stroke-dashoffset 1.2s ease-out" }}
                  />
                  <text x="60" y="60" textAnchor="middle" dominantBaseline="central" className="rotate-90 origin-center fill-current font-bold" fontSize="22">
                    {Math.round(goalPct)}%
                  </text>
                </svg>
                <div>
                  <p className="text-xs text-muted-foreground">Meta do mês</p>
                  <p className="text-2xl font-bold">
                    {stats.thisMonth} <span className="text-base font-normal text-muted-foreground">de {goal} compras</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stats.thisMonth >= goal
                      ? "Meta batida! 🎉 Agora é só lucro."
                      : `Faltam ${goal - stats.thisMonth} para bater a meta. Dá tempo! 💪`}
                  </p>
                </div>
              </>
            ) : (
              <div>
                <p className="text-xs text-muted-foreground">Este mês</p>
                <p className="text-3xl font-bold">{stats.thisMonth} compras</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico por dia */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <h3 className="font-semibold">📈 Compras por dia</h3>
            <p className="text-xs text-muted-foreground">últimos {stats.bars.length} dias</p>
          </div>
          <div className="overflow-x-auto">
            <div className="flex items-end gap-[3px] h-40 min-w-[560px]">
              {stats.bars.map((b) => (
                <div key={b.key} className="flex-1 h-full flex items-end group relative" title={`${fmtShort(b.key)}: ${b.count} compra${b.count !== 1 ? "s" : ""}`}>
                  <div
                    className="w-full rounded-t transition-[height] duration-700 ease-out"
                    style={{
                      height: ready ? `${b.count === 0 ? 3 : Math.max(8, (b.count / stats.barMax) * 100)}%` : "0%",
                      background: b.count === 0 ? "var(--muted)" : b.key === stats.today ? "var(--primary)" : "var(--secondary)",
                    }}
                  />
                  {b.count > 0 && (
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold opacity-0 group-hover:opacity-100">
                      {b.count}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1 min-w-[560px]">
              <span>{fmtShort(stats.bars[0].key)}</span>
              <span>{fmtShort(stats.bars[Math.floor(stats.bars.length / 2)].key)}</span>
              <span>hoje</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendário de calor + dia da semana */}
      <div className="grid lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold">🗓️ Seu calendário (16 semanas)</h3>
            <div className="overflow-x-auto">
              <div className="flex gap-1">
                <div className="flex flex-col gap-1 text-[10px] text-muted-foreground pr-1">
                  {WEEKDAYS.map((d, i) => (
                    <span key={d} className="h-4 leading-4">
                      {i % 2 === 1 ? d : ""}
                    </span>
                  ))}
                </div>
                <div className="grid grid-flow-col grid-rows-7 gap-1">
                  {stats.cells.map((c) => (
                    <div
                      key={c.key}
                      title={c.future ? "" : `${fmtShort(c.key)}: ${c.count} compra${c.count !== 1 ? "s" : ""}`}
                      className={`w-4 h-4 rounded-[4px] ${c.future ? "opacity-0" : "bg-muted"} ${c.key === stats.today ? "ring-2 ring-primary" : ""}`}
                      style={{ background: c.future ? undefined : heat(c.count) }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              menos
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="w-3 h-3 rounded-[3px] bg-muted"
                  style={{ background: i === 0 ? undefined : `color-mix(in srgb, var(--secondary) ${25 + i * 25}%, #fff)` }}
                />
              ))}
              mais
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold">📅 Dia da semana campeão</h3>
            <div className="flex items-end gap-2 h-28">
              {stats.weekday.map((n, i) => {
                const max = Math.max(1, ...stats.weekday)
                const best = n > 0 && i === stats.bestWeekday
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1" title={`${WEEKDAYS_LONG[i]}: ${n}`}>
                    <span className="text-[10px] font-semibold">{n || ""}</span>
                    <div
                      className="w-full rounded-t transition-[height] duration-700"
                      style={{
                        height: ready ? `${n === 0 ? 4 : Math.max(10, (n / max) * 100)}%` : "0%",
                        background: best ? "var(--primary)" : n === 0 ? "var(--muted)" : "var(--secondary)",
                      }}
                    />
                    <span className={`text-[10px] ${best ? "font-bold" : "text-muted-foreground"}`}>{WEEKDAYS[i]}</span>
                  </div>
                )
              })}
            </div>
            <p className="text-sm text-muted-foreground">
              {stats.inRange.length === 0
                ? "Quando as compras chegarem, você descobre o dia que mais vende."
                : `Seu público compra mais na ${WEEKDAYS_LONG[stats.bestWeekday]}. Poste nesse dia! 🔥`}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Planos + últimas compras */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold">📦 Planos que você trouxe</h3>
            {stats.plans.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda sem compras neste período.</p>
            ) : (
              stats.plans.map(([plan, n]) => (
                <div key={plan}>
                  <div className="flex justify-between text-sm">
                    <span>{plan}</span>
                    <span className="font-semibold">{n}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-secondary transition-[width] duration-1000"
                      style={{ width: ready ? `${(n / stats.inRange.length) * 100}%` : "0%" }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold">🎉 Últimas compras</h3>
            {stats.feed.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nada por aqui ainda. A primeira compra vai aparecer aqui na hora!</p>
            ) : (
              <ul className="space-y-2">
                {stats.feed.map((p, i) => (
                  <li key={i} className="flex items-center justify-between text-sm bg-muted/50 rounded-lg px-3 py-2">
                    <span>
                      🛒 Plano <strong>{p.plan || "—"}</strong> · <span className="font-mono text-xs">{p.code}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{ago(p.at, stats.nowMs)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cupons */}
      <div className="space-y-3">
        <h3 className="font-semibold">🎟️ {coupons.length > 1 ? "Seus cupons" : "Seu cupom"}</h3>
        {coupons.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              {accountId ? "Esta conta ainda não tem cupom associado." : "Você ainda não tem um cupom. Fale com o Davi para receber o seu!"}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {coupons.map((c) => {
              const st = couponStatus(c, stats.nowMs)
              const uses = data.purchases.filter((p) => p.code === c.code).length
              const msg = `Use o cupom ${c.code} e ganhe ${describeCoupon(c)} na sua assinatura de ovos caipiras frescos! 🥚 ${typeof window !== "undefined" ? window.location.origin : ""}`
              return (
                <Card key={c.code} className="border-2 border-dashed">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="font-mono text-2xl font-bold tracking-wider">{c.code}</p>
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          st.tone === "ok" ? "bg-green-100 text-green-800" : st.tone === "warn" ? "bg-orange-100 text-orange-800" : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {st.text}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {describeCoupon(c)} · usado em <strong>{uses}</strong> compra{uses !== 1 ? "s" : ""}
                      {c.max_uses !== null ? ` (limite de ${c.max_uses})` : ""}
                    </p>
                    {c.max_uses !== null && (
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className="h-full bg-secondary" style={{ width: `${Math.min(100, (c.used_count / c.max_uses) * 100)}%` }} />
                      </div>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => copy(`c-${c.code}`, c.code)}>
                        {copied === `c-${c.code}` ? "Copiado! ✓" : "Copiar cupom"}
                      </Button>
                      <Button size="sm" onClick={() => copy(`m-${c.code}`, msg)}>
                        {copied === `m-${c.code}` ? "Copiado! ✓" : "Copiar mensagem pronta"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <div className="text-center">
        <Button variant="ghost" size="sm" onClick={load}>
          Atualizar números
        </Button>
      </div>
    </div>
  )
}

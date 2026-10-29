"use client"

import { useCallback, useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CouponsTab } from "@/components/admin/coupons-tab"
import { ThemeTab } from "@/components/admin/theme-tab"
import { InfluencersTab } from "@/components/admin/influencers-tab"
import { MyStatsTab } from "@/components/admin/my-stats-tab"
import { CashbackTab } from "@/components/admin/cashback-tab"
import { DeliveriesTab } from "@/components/admin/deliveries-tab"
import { getDeliveryDays } from "@/lib/plans"
import {
  CheckCircle,
  Clock,
  History,
  LogOut,
  Palette,
  Pencil,
  Settings,
  Sparkles,
  Sprout,
  KeyRound,
  PiggyBank,
  Store,
  Tag,
  Trash2,
  TrendingUp,
  Truck,
  Users,
  X,
} from "lucide-react"

type Permission = "subscriptions" | "delete_subscriptions" | "registrations" | "coupons" | "theme" | "influencers" | "my_stats" | "cashback" | "deliveries" | "courier"
type Tab = "subscriptions" | "resellers" | "producers" | "coupons" | "theme" | "influencers" | "mystats" | "cashback" | "deliveries"

interface Subscription {
  id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  customer_cpf: string
  plan_name: string
  status: string
  street: string
  number: string
  cep: string
  observation: string
  last_delivered_at: string | null
  next_delivery_at: string | null
  created_at: string
  neighborhood?: string | null
  city?: string | null
  reference_point?: string | null
  delivery_day?: string | null
  delivery_period?: string | null
  delivery_instructions?: string | null
  payment_method?: string | null
  coupon_code?: string | null
  amount_cents?: number | null
  discount_cents?: number | null
}
interface DeliveryHistory {
  id: string
  subscription_id: string
  delivered_at: string
}
interface Reseller {
  id: string
  business_name: string
  contact_name: string
  email: string
  phone: string
  business_type: string
  city: string
  state: string
  estimated_monthly_demand: number
  message: string
  created_at: string
}
interface Producer {
  id: string
  name: string
  email: string
  phone: string
  farm_name: string
  location: string
  production_capacity: number
  experience_years: number
  message: string
  created_at: string
}

// Cores dos status: verde = ativo, laranja = aguardando Pix, vermelho = não ativo
function statusInfo(status: string) {
  if (status === "active") return { label: "✅ Ativo", badge: "bg-green-100 text-green-800", border: "border-l-green-500" }
  if (status === "pending") return { label: "⏳ Aguardando Pix", badge: "bg-orange-100 text-orange-800", border: "border-l-orange-500" }
  return { label: "❌ Não ativo", badge: "bg-red-100 text-red-800", border: "border-l-red-500" }
}

const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export default function AdminPage() {
  const [checking, setChecking] = useState(true)
  const [user, setUser] = useState<{ name: string; permissions: Permission[] } | null>(null)
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState<string | null>(null)
  const [loggingIn, setLoggingIn] = useState(false)

  const [tab, setTab] = useState<Tab>("subscriptions")
  const [loading, setLoading] = useState(true)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [history, setHistory] = useState<Record<string, DeliveryHistory[]>>({})
  const [resellers, setResellers] = useState<Reseller[]>([])
  const [producers, setProducers] = useState<Producer[]>([])
  const [filter, setFilter] = useState<"all" | "active" | "pending" | "canceled">("all")
  const [openHistory, setOpenHistory] = useState<string | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ type: "delete" | "edit"; table: string; id: string } | null>(null)
  const [confirmPassword, setConfirmPassword] = useState("")
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [editData, setEditData] = useState<any>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [access, setAccess] = useState<{ sub: Subscription; loading: boolean; error?: string; temp?: string; created?: boolean } | null>(null)
  const [accessCopied, setAccessCopied] = useState(false)

  const can = useCallback((p: Permission) => !!user?.permissions.includes(p), [user])

  // Todas as chamadas ao servidor passam por aqui. Se a sessão expirar, volta para a tela de senha.
  const api = useCallback(async (path: string, init?: RequestInit) => {
    const res = await fetch(path, {
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    })
    const json = await res.json().catch(() => ({}))
    if (res.status === 401) {
      setUser(null)
      throw new ApiError("Sua sessão expirou. Entre de novo.", 401)
    }
    if (!res.ok) throw new ApiError(json.error || "Algo deu errado.", res.status)
    return json
  }, [])

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => u && setUser(u))
      .finally(() => setChecking(false))
  }, [])

  const loadData = useCallback(async () => {
    if (!user) return
    setPageError(null)
    try {
      if (user.permissions.includes("subscriptions")) {
        const json = await api("/api/admin/subscriptions")
        setSubscriptions(json.subscriptions)
        const byId: Record<string, DeliveryHistory[]> = {}
        for (const h of json.history as DeliveryHistory[]) {
          if (!byId[h.subscription_id]) byId[h.subscription_id] = []
          byId[h.subscription_id].push(h)
        }
        setHistory(byId)
      }
      if (user.permissions.includes("registrations")) {
        const json = await api("/api/admin/registrations")
        setResellers(json.resellers)
        setProducers(json.producers)
      }
    } catch (e: any) {
      setPageError(e.message)
    }
    setLoading(false)
  }, [user, api])

  useEffect(() => {
    if (!user) return
    // abre na primeira aba que a senha libera
    const first: Tab | undefined = user.permissions.includes("my_stats") && !user.permissions.includes("influencers")
      ? "mystats"
      : user.permissions.includes("subscriptions")
        ? "subscriptions"
        : user.permissions.includes("registrations")
          ? "resellers"
          : user.permissions.includes("deliveries")
            ? "deliveries"
          : user.permissions.includes("coupons")
            ? "coupons"
            : user.permissions.includes("theme")
              ? "theme"
              : undefined
    if (first) setTab(first)
    loadData()
  }, [user, loadData])

  async function handleLogin() {
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
      setLoading(true)
      setUser(json)
    } catch (e: any) {
      setLoginError(e.message)
    }
    setLoggingIn(false)
  }

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" })
    setUser(null)
    setSubscriptions([])
    setResellers([])
    setProducers([])
    setPassword("")
  }

  async function subscriptionAction(action: "deliver" | "clear", id: string) {
    try {
      await api("/api/admin/subscriptions", { method: "POST", body: JSON.stringify({ action, id }) })
      loadData()
    } catch (e: any) {
      setPageError(e.message)
    }
  }

  function getDaysUntilDelivery(nextDeliveryAt: string | null) {
    if (!nextDeliveryAt) return null
    return Math.ceil((new Date(nextDeliveryAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  }

  function openAction(type: "delete" | "edit", table: string, id: string, data?: any) {
    setOpenMenu(null)
    setConfirmPassword("")
    setConfirmError(null)
    setEditData(type === "edit" ? { ...data } : null)
    setConfirmAction({ type, table, id })
  }

  async function handleConfirmAction() {
    if (!confirmAction) return
    try {
      if (confirmAction.type === "delete" && confirmAction.table === "subscriptions") {
        await api("/api/admin/subscriptions", {
          method: "DELETE",
          body: JSON.stringify({ id: confirmAction.id, confirmPassword }),
        })
      } else if (confirmAction.type === "delete") {
        await api("/api/admin/registrations", {
          method: "DELETE",
          body: JSON.stringify({ table: confirmAction.table, id: confirmAction.id, confirmPassword }),
        })
      } else {
        await api("/api/admin/registrations", {
          method: "PATCH",
          body: JSON.stringify({ table: confirmAction.table, id: confirmAction.id, data: editData, confirmPassword }),
        })
      }
      setConfirmAction(null)
      setConfirmPassword("")
      setEditData(null)
      loadData()
    } catch (e: any) {
      setConfirmError(e.message)
    }
  }

  const isInactive = (s: Subscription) => s.status !== "active" && s.status !== "pending"
  async function createAccess(sub: Subscription) {
    setAccess({ sub, loading: true })
    try {
      const json = await api("/api/admin/customers", { method: "POST", body: JSON.stringify({ subscriptionId: sub.id }) })
      setAccess({ sub, loading: false, temp: json.tempPassword, created: json.created })
    } catch (e: any) {
      setAccess({ sub, loading: false, error: e.message })
    }
  }

  const filtered = subscriptions.filter((s) =>
    filter === "all" ? true : filter === "canceled" ? isInactive(s) : s.status === filter
  )
  const active = subscriptions.filter((s) => s.status === "active").length
  const counts = {
    all: subscriptions.length,
    active,
    pending: subscriptions.filter((s) => s.status === "pending").length,
    canceled: subscriptions.filter(isInactive).length,
  }

  if (checking) {
    return <div className="min-h-screen bg-muted/30 flex items-center justify-center text-muted-foreground">Carregando...</div>
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="text-4xl mb-2">🥚</div>
            <CardTitle>Painel Caipirovos</CardTitle>
            <p className="text-sm text-muted-foreground">Digite a sua senha para continuar</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Senha"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
            {loginError && <p className="text-sm text-red-600">{loginError}</p>}
            <Button className="w-full" onClick={handleLogin} disabled={loggingIn || !password}>
              {loggingIn ? "Entrando..." : "Entrar"}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Quem só tem senha de entregador usa o app do celular, não o painel
  if (user.permissions.length === 1 && user.permissions[0] === "courier") {
    if (typeof window !== "undefined") window.location.replace("/entregador")
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6 text-center">
        <div className="space-y-3">
          <div className="text-4xl">🚚</div>
          <p>Abrindo o app do entregador...</p>
          <a className="underline text-sm" href="/entregador">
            Toque aqui se não abrir
          </a>
        </div>
      </div>
    )
  }

  const tabs: { id: Tab; label: string; icon: any; show: boolean }[] = [
    { id: "mystats", label: "Meu painel", icon: Sparkles, show: can("my_stats") && !can("influencers") },
    { id: "subscriptions", label: "Assinaturas", icon: Users, show: can("subscriptions") },
    { id: "deliveries", label: "Entregas", icon: Truck, show: can("deliveries") },
    { id: "resellers", label: "Revendedores", icon: Store, show: can("registrations") },
    { id: "producers", label: "Produtores", icon: Sprout, show: can("registrations") },
    { id: "coupons", label: "Cupons", icon: Tag, show: can("coupons") },
    { id: "theme", label: "Personalizar", icon: Palette, show: can("theme") },
    { id: "cashback", label: "Cashback", icon: PiggyBank, show: can("cashback") },
    { id: "influencers", label: "Acessos", icon: KeyRound, show: can("influencers") },
  ]

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-8" onClick={() => setOpenMenu(null)}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">🥚 Painel Caipirovos</h1>
            <p className="text-muted-foreground text-sm">Olá, {user.name}</p>
          </div>
          <div className="flex gap-2">
            {(can("subscriptions") || can("registrations")) && (
              <Button variant="outline" size="sm" onClick={loadData}>
                Atualizar
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-1" /> Sair
            </Button>
          </div>
        </div>

        {(can("subscriptions") || can("registrations")) && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {can("subscriptions") && (
              <>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-full">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{subscriptions.length}</p>
                      <p className="text-xs text-muted-foreground">Assinantes</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-full">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">{active}</p>
                      <p className="text-xs text-muted-foreground">Ativas</p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
            {can("registrations") && (
              <>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="bg-yellow-100 p-2 rounded-full">
                      <Store className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-600">{resellers.length}</p>
                      <p className="text-xs text-muted-foreground">Revendedores</p>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-full">
                      <Sprout className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-emerald-600">{producers.length}</p>
                      <p className="text-xs text-muted-foreground">Produtores</p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        <div className="flex gap-2 border-b pb-2 flex-wrap">
          {tabs
            .filter((t) => t.show)
            .map((t) => (
              <Button key={t.id} size="sm" variant={tab === t.id ? "default" : "ghost"} onClick={() => setTab(t.id)}>
                <t.icon className="h-4 w-4 mr-1" /> {t.label}
              </Button>
            ))}
        </div>

        {pageError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{pageError}</p>}

        {tab === "coupons" && can("coupons") && <CouponsTab api={api} />}
        {tab === "theme" && can("theme") && <ThemeTab api={api} />}
        {tab === "deliveries" && can("deliveries") && <DeliveriesTab api={api} />}
        {tab === "cashback" && can("cashback") && <CashbackTab api={api} />}
        {tab === "influencers" && can("influencers") && <InfluencersTab api={api} />}
        {tab === "mystats" && can("my_stats") && !can("influencers") && <MyStatsTab api={api} />}

        {(tab === "subscriptions" || tab === "resellers" || tab === "producers") &&
          (loading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : (
            <>
              {tab === "subscriptions" && can("subscriptions") && (
                <div className="space-y-4">
                  <div className="flex gap-2 flex-wrap">
                    {(["all", "active", "pending", "canceled"] as const).map((f) => (
                      <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
                        {f === "all" ? "Todos" : f === "active" ? "Ativos" : f === "pending" ? "Aguardando Pix" : "Não ativos"} ({counts[f]})
                      </Button>
                    ))}
                  </div>
                  {filtered.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">Nenhuma assinatura encontrada.</CardContent>
                    </Card>
                  ) : (
                    filtered.map((sub) => {
                      const daysLeft = getDaysUntilDelivery(sub.next_delivery_at)
                      const isDelivered = sub.last_delivered_at && daysLeft !== null && daysLeft > 0
                      const subHistory = history[sub.id] || []
                      return (
                        <Card
                          key={sub.id}
                          className={`border-l-4 ${statusInfo(sub.status).border}`}
                        >
                          <CardContent className="p-5">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="font-semibold text-lg">{sub.customer_name}</h3>
                                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusInfo(sub.status).badge}`}>
                                    {statusInfo(sub.status).label}
                                  </span>
                                  <Badge variant="outline">{sub.plan_name}</Badge>
                                  <Badge variant="secondary">🔄 {getDeliveryDays(sub.plan_name)} dias</Badge>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm text-muted-foreground">
                                  <p>📧 {sub.customer_email}</p>
                                  <p>📱 {sub.customer_phone}</p>
                                  <p>CPF: {sub.customer_cpf}</p>
                                  <p>
                                    📍 {sub.street}, {sub.number}
                                    {sub.neighborhood ? ` — ${sub.neighborhood}` : ""}
                                    {sub.city ? `, ${sub.city}` : ""} — CEP {sub.cep}
                                  </p>
                                  {sub.reference_point && <p>🧭 Referência: {sub.reference_point}</p>}
                                  {(sub.delivery_day || sub.delivery_period) && (
                                    <p>
                                      🗓️ Prefere: {sub.delivery_day || "—"} / {sub.delivery_period || "—"}
                                    </p>
                                  )}
                                  {sub.delivery_instructions && <p>📝 {sub.delivery_instructions}</p>}
                                  {sub.payment_method && (
                                    <p>
                                      💳 {sub.payment_method === "pix" ? "Pix" : "Cartão"}
                                      {sub.amount_cents ? ` — 1º pagamento R$ ${(sub.amount_cents / 100).toFixed(2).replace(".", ",")}` : ""}
                                      {sub.coupon_code ? ` (cupom ${sub.coupon_code})` : ""}
                                    </p>
                                  )}
                                  {sub.observation && <p>💬 {sub.observation}</p>}
                                  <p>📅 Desde {new Date(sub.created_at).toLocaleDateString("pt-BR")}</p>
                                </div>
                                {isDelivered && daysLeft !== null && (
                                  <div
                                    className={`text-sm font-medium px-3 py-1 rounded-full inline-block ${
                                      daysLeft <= 1
                                        ? "bg-red-100 text-red-700"
                                        : daysLeft <= 3
                                          ? "bg-yellow-100 text-yellow-700"
                                          : "bg-green-100 text-green-700"
                                    }`}
                                  >
                                    🚚 Próxima entrega em {daysLeft} dia{daysLeft !== 1 ? "s" : ""}
                                  </div>
                                )}
                                {subHistory.length > 0 && (
                                  <div>
                                    <button
                                      className="text-xs text-primary underline flex items-center gap-1 mt-1"
                                      onClick={() => setOpenHistory(openHistory === sub.id ? null : sub.id)}
                                    >
                                      <History className="h-3 w-3" />
                                      {openHistory === sub.id ? "Ocultar" : `Ver histórico (${subHistory.length} entregas)`}
                                    </button>
                                    {openHistory === sub.id && (
                                      <div className="mt-2 bg-muted/50 rounded-lg p-3 space-y-1">
                                        <p className="text-xs font-semibold text-muted-foreground mb-2">Histórico de entregas:</p>
                                        {subHistory.map((h, i) => (
                                          <div key={h.id} className="text-xs flex items-center gap-2">
                                            <span className="text-green-600">✓</span>
                                            <span>
                                              Entrega #{subHistory.length - i} — {new Date(h.delivered_at).toLocaleString("pt-BR")}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                              {sub.status !== "pending" && (
                                <div className="flex flex-col gap-2 min-w-[160px]">
                                  <Button size="sm" variant="outline" onClick={() => createAccess(sub)}>
                                    🔑 Acesso do cliente
                                  </Button>
                                </div>
                              )}
                              {sub.status !== "active" && can("delete_subscriptions") && (
                                <div className="flex flex-col gap-2 min-w-[160px]">
                                  <p className="text-xs text-muted-foreground">
                                    {sub.status === "pending" ? "Pix pendente" : "Não ativa"} há {daysSince(sub.created_at)} dia
                                    {daysSince(sub.created_at) !== 1 ? "s" : ""}
                                  </p>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                    disabled={sub.status === "pending" && daysSince(sub.created_at) < 2}
                                    onClick={() => openAction("delete", "subscriptions", sub.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" /> Excluir assinatura
                                  </Button>
                                  {sub.status === "pending" && daysSince(sub.created_at) < 2 && (
                                    <p className="text-xs text-muted-foreground">O Pix ainda pode ser pago. Dá para excluir depois de 2 dias.</p>
                                  )}
                                </div>
                              )}
                              {sub.status === "active" && (
                                <div className="flex flex-col gap-2 min-w-[160px]">
                                  {!isDelivered ? (
                                    <Button
                                      size="sm"
                                      className="bg-green-600 hover:bg-green-700 text-white"
                                      onClick={() => subscriptionAction("deliver", sub.id)}
                                    >
                                      <Truck className="h-4 w-4 mr-1" /> Marcar entregue
                                    </Button>
                                  ) : (
                                    <Button size="sm" variant="outline" onClick={() => subscriptionAction("clear", sub.id)}>
                                      <CheckCircle className="h-4 w-4 mr-1" /> Limpar entrega
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  )}
                </div>
              )}

              {tab === "resellers" && can("registrations") && (
                <div className="space-y-4">
                  {resellers.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">Nenhum revendedor cadastrado.</CardContent>
                    </Card>
                  ) : (
                    resellers.map((r) => (
                      <Card key={r.id} className="border-l-4 border-l-yellow-400">
                        <CardContent className="p-5 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-lg">{r.business_name}</h3>
                              <Badge variant="outline">{r.business_type || "Tipo não informado"}</Badge>
                            </div>
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              <button className="p-1 rounded-full hover:bg-muted" onClick={() => setOpenMenu(openMenu === r.id ? null : r.id)}>
                                <Settings className="h-4 w-4 text-muted-foreground" />
                              </button>
                              {openMenu === r.id && (
                                <div className="absolute right-0 top-7 bg-white border rounded-lg shadow-lg z-10 min-w-[140px]">
                                  <button
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                                    onClick={() =>
                                      openAction("edit", "resellers", r.id, {
                                        business_name: r.business_name,
                                        contact_name: r.contact_name,
                                        email: r.email,
                                        phone: r.phone,
                                        city: r.city,
                                        state: r.state,
                                      })
                                    }
                                  >
                                    <Pencil className="h-4 w-4" /> Editar
                                  </button>
                                  <button
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                    onClick={() => openAction("delete", "resellers", r.id)}
                                  >
                                    <Trash2 className="h-4 w-4" /> Excluir
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm text-muted-foreground">
                            <p>👤 Responsável: {r.contact_name}</p>
                            <p>📧 {r.email}</p>
                            <p>📱 {r.phone}</p>
                            <p>
                              📍 {r.city || "—"}, {r.state || "—"}
                            </p>
                            <p>📦 Volume estimado: {r.estimated_monthly_demand || "Não informado"} bandejas/mês</p>
                            <p>📅 Cadastro: {new Date(r.created_at).toLocaleDateString("pt-BR")}</p>
                            {r.message && <p className="col-span-2">💬 {r.message}</p>}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}

              {tab === "producers" && can("registrations") && (
                <div className="space-y-4">
                  {producers.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center text-muted-foreground">Nenhum produtor cadastrado.</CardContent>
                    </Card>
                  ) : (
                    producers.map((p) => (
                      <Card key={p.id} className="border-l-4 border-l-emerald-500">
                        <CardContent className="p-5 space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-lg">{p.name}</h3>
                              <Badge variant="outline">🌾 {p.farm_name}</Badge>
                            </div>
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                              <button className="p-1 rounded-full hover:bg-muted" onClick={() => setOpenMenu(openMenu === p.id ? null : p.id)}>
                                <Settings className="h-4 w-4 text-muted-foreground" />
                              </button>
                              {openMenu === p.id && (
                                <div className="absolute right-0 top-7 bg-white border rounded-lg shadow-lg z-10 min-w-[140px]">
                                  <button
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                                    onClick={() =>
                                      openAction("edit", "producers", p.id, {
                                        name: p.name,
                                        email: p.email,
                                        phone: p.phone,
                                        farm_name: p.farm_name,
                                        location: p.location,
                                      })
                                    }
                                  >
                                    <Pencil className="h-4 w-4" /> Editar
                                  </button>
                                  <button
                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                    onClick={() => openAction("delete", "producers", p.id)}
                                  >
                                    <Trash2 className="h-4 w-4" /> Excluir
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-sm text-muted-foreground">
                            <p>📧 {p.email}</p>
                            <p>📱 {p.phone}</p>
                            <p>📍 {p.location || "Localização não informada"}</p>
                            <p>🥚 Produção: {p.production_capacity || "—"} ovos/dia</p>
                            <p>⏳ Experiência: {p.experience_years || "—"} anos</p>
                            <p>📅 Cadastro: {new Date(p.created_at).toLocaleDateString("pt-BR")}</p>
                            {p.message && <p className="col-span-2">💬 {p.message}</p>}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              )}
            </>
          ))}
      </div>

      {access && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">🔑 Acesso de {access.sub.customer_name}</h3>
              <button onClick={() => setAccess(null)}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {access.loading && <p className="text-sm text-muted-foreground">Gerando...</p>}
            {access.error && <p className="text-sm text-red-600">{access.error}</p>}
            {access.temp && (
              <>
                <p className="text-sm text-muted-foreground">
                  {access.created ? "Acesso criado." : "Senha redefinida."} Passe para o cliente. Ele entra com o CPF e esta senha provisória e escolhe uma nova senha no primeiro acesso.
                </p>
                <p className="text-center text-2xl font-mono font-bold tracking-wider bg-muted rounded-lg py-3">{access.temp}</p>
                <p className="text-xs text-amber-700">Anote agora: depois que você fechar, não dá para ver de novo (só gerar outra).</p>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={async () => {
                      const text = `Olá, ${access.sub.customer_name.split(/\s+/)[0]}! Seu acesso à área do assinante Caipirovos:\n${window.location.origin}/conta\nCPF: o mesmo da assinatura\nSenha provisória: ${access.temp}\n(no primeiro acesso você escolhe a sua senha)`
                      try {
                        await navigator.clipboard.writeText(text)
                        setAccessCopied(true)
                        setTimeout(() => setAccessCopied(false), 2000)
                      } catch {}
                    }}
                  >
                    {accessCopied ? "Copiado! ✓" : "Copiar mensagem"}
                  </Button>
                  {access.sub.customer_phone && (
                    <Button variant="outline" asChild>
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href={`https://wa.me/55${access.sub.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá, ${access.sub.customer_name.split(/\s+/)[0]}! Seu acesso à área do assinante Caipirovos:\n${typeof window !== "undefined" ? window.location.origin : ""}/conta\nCPF: o mesmo da assinatura\nSenha provisória: ${access.temp}\n(no primeiro acesso você escolhe a sua senha)`)}`}
                      >
                        WhatsApp
                      </a>
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">{confirmAction.type === "delete" ? "🗑️ Confirmar exclusão" : "✏️ Editar registro"}</h3>
              <button
                onClick={() => {
                  setConfirmAction(null)
                  setConfirmPassword("")
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {confirmAction.type === "edit" && editData && (
              <div className="space-y-2">
                {Object.keys(editData).map((key) => (
                  <div key={key}>
                    <label className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, " ")}</label>
                    <input
                      className="w-full border rounded-lg px-3 py-1.5 text-sm"
                      value={editData[key] || ""}
                      onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            )}

            {confirmAction.type === "delete" && (
              <p className="text-sm text-muted-foreground">
                {confirmAction.table === "subscriptions"
                  ? "Isso apaga a assinatura e o histórico de entregas dela. Esta ação não pode ser desfeita."
                  : "Tem certeza? Esta ação não pode ser desfeita."}
              </p>
            )}

            <div>
              <label className="text-xs text-muted-foreground">Digite a sua senha para confirmar</label>
              <input
                type="password"
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
                placeholder="Senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleConfirmAction()}
              />
            </div>
            {confirmError && <p className="text-sm text-red-600">{confirmError}</p>}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setConfirmAction(null)
                  setConfirmPassword("")
                }}
              >
                Cancelar
              </Button>
              <Button
                className={`flex-1 ${confirmAction.type === "delete" ? "bg-red-600 hover:bg-red-700" : ""}`}
                onClick={handleConfirmAction}
              >
                {confirmAction.type === "delete" ? "Excluir" : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

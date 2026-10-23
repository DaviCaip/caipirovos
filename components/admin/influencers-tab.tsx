"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MyStatsTab } from "@/components/admin/my-stats-tab"

type Api = (path: string, init?: RequestInit) => Promise<any>

interface Account {
  id: string
  name: string
  role: "influencer" | "team"
  active: boolean
  permissions: string[]
  monthly_goal: number
  created_at: string
  last_login_at: string | null
  coupons: string[]
  total: number
  last30: number
  lastUseAt: string | null
}
interface CouponRef {
  code: string
  active: boolean
  influencer_id: string | null
}

const AREAS = [
  { id: "subscriptions", label: "Assinaturas", warn: "mostra CPF, telefone e endereço dos clientes" },
  { id: "registrations", label: "Revendedores e produtores", warn: "mostra contatos dos cadastros" },
  { id: "coupons", label: "Cupons", warn: "pode criar e desligar qualquer cupom" },
  { id: "theme", label: "Personalizar o site", warn: "pode trocar o tema do site inteiro" },
]

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
  const bytes = new Uint32Array(10)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => chars[b % chars.length]).join("")
}

function ago(iso: string | null) {
  if (!iso) return "nunca"
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86400000)
  return d <= 0 ? "hoje" : d === 1 ? "ontem" : `há ${d} dias`
}

interface FormValues {
  name: string
  password: string
  monthlyGoal: string
  permissions: string[]
  couponCodes: string[]
  active: boolean
}

function AccountForm({
  initial,
  role,
  coupons,
  editingId,
  saving,
  error,
  onSave,
  onCancel,
}: {
  initial: FormValues
  role: "influencer" | "team"
  coupons: CouponRef[]
  editingId: string | null
  saving: boolean
  error: string | null
  onSave: (v: FormValues) => void
  onCancel: () => void
}) {
  const [v, setV] = useState<FormValues>(initial)
  const toggle = (key: "permissions" | "couponCodes", value: string) =>
    setV((p) => ({ ...p, [key]: p[key].includes(value) ? p[key].filter((x) => x !== value) : [...p[key], value] }))
  const input = "w-full border rounded-lg px-3 py-2 text-sm"
  const selectable = coupons.filter((c) => !c.influencer_id || c.influencer_id === editingId)

  return (
    <div className="space-y-4">
      <div className={`grid gap-3 ${role === "team" ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
        <div>
          <label className="text-xs text-muted-foreground">{role === "team" ? "Nome do acesso" : "Nome do influencer"}</label>
          <input className={input} value={v.name} maxLength={60} placeholder={role === "team" ? "Ex.: Equipe" : "Ex.: Maria Fit"} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">{editingId ? "Nova senha (deixe vazio para manter)" : "Senha de acesso"}</label>
          <div className="flex gap-2">
            <input className={input} value={v.password} maxLength={60} placeholder="mín. 6 caracteres" onChange={(e) => setV({ ...v, password: e.target.value })} />
            <Button type="button" variant="outline" size="sm" onClick={() => setV({ ...v, password: generatePassword() })}>
              Gerar
            </Button>
          </div>
        </div>
        {role === "influencer" && (
          <div>
            <label className="text-xs text-muted-foreground">Meta de compras por mês</label>
            <input className={input} type="number" min={0} value={v.monthlyGoal} onChange={(e) => setV({ ...v, monthlyGoal: e.target.value })} />
          </div>
        )}
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-1">
          {role === "influencer"
            ? "O painel de resultados do cupom já vem liberado. Marque só o que mais essa pessoa pode ver (o resto nem aparece para ela):"
            : "Marque o que essa senha pode ver (o resto nem aparece para quem entrar):"}
        </p>
        <div className="grid md:grid-cols-2 gap-2">
          {AREAS.map((a) => (
            <label key={a.id} className="flex items-start gap-2 text-sm border rounded-lg p-2.5">
              <input type="checkbox" className="mt-1" checked={v.permissions.includes(a.id)} onChange={() => toggle("permissions", a.id)} />
              <span>
                {a.label}
                {v.permissions.includes(a.id) && <span className="block text-xs text-amber-700">⚠️ {a.warn}</span>}
              </span>
            </label>
          ))}
        </div>
      </div>

      {role === "influencer" && (
      <div>
        <p className="text-xs text-muted-foreground mb-1">Cupons desta pessoa (só aparecem os que ainda não são de outro influencer):</p>
        {selectable.length === 0 ? (
          <p className="text-sm text-muted-foreground border rounded-lg p-3">
            Nenhum cupom livre. Crie um na aba Cupons e escolha este influencer lá, ou volte aqui depois.
          </p>
        ) : (
          <div className="flex gap-2 flex-wrap">
            {selectable.map((c) => (
              <label
                key={c.code}
                className={`flex items-center gap-2 text-sm border rounded-full px-3 py-1.5 cursor-pointer ${
                  v.couponCodes.includes(c.code) ? "bg-black text-white border-black" : ""
                }`}
              >
                <input type="checkbox" className="hidden" checked={v.couponCodes.includes(c.code)} onChange={() => toggle("couponCodes", c.code)} />
                <span className="font-mono">{c.code}</span>
                {!c.active && <span className="text-xs opacity-70">(desligado)</span>}
              </label>
            ))}
          </div>
        )}
      </div>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

      <div className="flex gap-2">
        <Button
          onClick={() => onSave(v)}
          disabled={saving || !v.name.trim() || (!editingId && v.password.length < 6) || (role === "team" && v.permissions.length === 0)}
        >
          {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar conta"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}

export function InfluencersTab({ api }: { api: Api }) {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [coupons, setCoupons] = useState<CouponRef[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState<"list" | "new" | { edit: string } | { preview: Account }>("list")
  const [newRole, setNewRole] = useState<"influencer" | "team">("team")
  const [created, setCreated] = useState<{ name: string; password: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Account | null>(null)
  const [confirmPassword, setConfirmPassword] = useState("")
  const [confirmError, setConfirmError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const json = await api("/api/admin/influencers")
      setAccounts(json.accounts)
      setCoupons(json.coupons)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }, [api])

  useEffect(() => {
    load()
  }, [load])

  async function save(v: FormValues, editingId: string | null) {
    setSaving(true)
    setFormError(null)
    try {
      const body: any = {
        name: v.name,
        monthlyGoal: v.monthlyGoal,
        permissions: v.permissions,
        couponCodes: v.couponCodes,
      }
      if (!editingId) body.role = newRole
      if (v.password) body.password = v.password
      if (editingId) {
        await api("/api/admin/influencers", { method: "PATCH", body: JSON.stringify({ id: editingId, ...body }) })
        if (v.password) setCreated({ name: v.name, password: v.password })
      } else {
        await api("/api/admin/influencers", { method: "POST", body: JSON.stringify(body) })
        setCreated({ name: v.name, password: v.password })
      }
      setMode("list")
      load()
    } catch (e: any) {
      setFormError(e.message)
    }
    setSaving(false)
  }

  async function toggleActive(a: Account) {
    try {
      await api("/api/admin/influencers", { method: "PATCH", body: JSON.stringify({ id: a.id, active: !a.active }) })
      load()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function remove() {
    if (!confirmDelete) return
    try {
      await api("/api/admin/influencers", { method: "DELETE", body: JSON.stringify({ id: confirmDelete.id, confirmPassword }) })
      setConfirmDelete(null)
      setConfirmPassword("")
      setConfirmError(null)
      load()
    } catch (e: any) {
      setConfirmError(e.message)
    }
  }

  async function copyAccess() {
    if (!created) return
    const text = `Seu acesso ao painel Caipirovos:\n${window.location.origin}/admin\nSenha: ${created.password}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {}
  }

  if (typeof mode === "object" && "preview" in mode) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => setMode("list")}>
          ← Voltar para influencers
        </Button>
        <p className="text-sm text-muted-foreground">Assim {mode.preview.name} enxerga o painel dela:</p>
        <MyStatsTab api={api} accountId={mode.preview.id} />
      </div>
    )
  }

  const rank = [...accounts].filter((a) => a.last30 > 0).sort((a, b) => b.last30 - a.last30)
  const rankMax = Math.max(1, ...rank.map((a) => a.last30))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-semibold text-lg">🔑 Acessos</h2>
        {mode === "list" && <Button onClick={() => { setMode("new"); setFormError(null) }}>➕ Novo acesso</Button>}
      </div>

      {created && (
        <Card className="border-green-300 bg-green-50">
          <CardContent className="p-4 space-y-2">
            <p className="font-semibold text-green-800">Acesso de {created.name} pronto!</p>
            <p className="text-sm text-green-900">
              Senha: <span className="font-mono font-bold">{created.password}</span>
            </p>
            <p className="text-xs text-green-800">Anote agora: depois que você sair desta tela, a senha não dá mais para ver (só trocar por outra).</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={copyAccess}>
                {copied ? "Copiado! ✓" : "Copiar link e senha"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setCreated(null)}>
                Fechar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

      {mode === "new" && (
        <Card>
          <CardContent className="p-5">
            <h3 className="font-semibold mb-3">Novo acesso</h3>
            <div className="flex gap-2 mb-4 flex-wrap">
              {([
                ["team", "👥 Equipe", "uma senha que abre só as áreas que você marcar"],
                ["influencer", "🌟 Influencer", "painel dos resultados do cupom dela"],
              ] as const).map(([id, label, hint]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setNewRole(id)}
                  className={`text-left border-2 rounded-xl px-4 py-2 ${newRole === id ? "border-black bg-muted/50" : "border-transparent bg-muted/30"}`}
                >
                  <span className="font-medium text-sm">{label}</span>
                  <span className="block text-xs text-muted-foreground">{hint}</span>
                </button>
              ))}
            </div>
            <AccountForm
              key={newRole}
              role={newRole}
              initial={{ name: "", password: "", monthlyGoal: "10", permissions: [], couponCodes: [], active: true }}
              coupons={coupons}
              editingId={null}
              saving={saving}
              error={formError}
              onSave={(v) => save(v, null)}
              onCancel={() => setMode("list")}
            />
          </CardContent>
        </Card>
      )}

      {rank.length > 0 && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <h3 className="font-semibold">🏆 Ranking dos últimos 30 dias</h3>
            {rank.map((a, i) => (
              <div key={a.id}>
                <div className="flex justify-between text-sm">
                  <span>
                    {["🥇", "🥈", "🥉"][i] || `${i + 1}º`} {a.name}
                  </span>
                  <span className="font-semibold">
                    {a.last30} compra{a.last30 !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-secondary" style={{ width: `${(a.last30 / rankMax) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-center text-muted-foreground py-6">Carregando...</p>
      ) : accounts.length === 0 && mode !== "new" ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Nenhum acesso criado ainda. Crie um de equipe (para quem ajuda no dia a dia) ou de influencer (para acompanhar o cupom).
          </CardContent>
        </Card>
      ) : (
        accounts.map((a) => (
          <Card key={a.id} className={`border-l-4 ${a.active ? "border-l-green-500" : "border-l-gray-400"}`}>
            <CardContent className="p-5 space-y-3">
              {typeof mode === "object" && "edit" in mode && mode.edit === a.id ? (
                <>
                  <h3 className="font-semibold">Editar {a.name}</h3>
                  <AccountForm
                    role={a.role}
                    initial={{
                      name: a.name,
                      password: "",
                      monthlyGoal: String(a.monthly_goal),
                      permissions: a.permissions,
                      couponCodes: a.coupons,
                      active: a.active,
                    }}
                    coupons={coupons}
                    editingId={a.id}
                    saving={saving}
                    error={formError}
                    onSave={(v) => save(v, a.id)}
                    onCancel={() => setMode("list")}
                  />
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-lg">{a.name}</h3>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-100 text-blue-800">
                      {a.role === "team" ? "👥 Equipe" : "🌟 Influencer"}
                    </span>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${a.active ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-700"}`}>
                      {a.active ? "✅ Ativo" : "⏸️ Desligado"}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-1 text-sm text-muted-foreground">
                    {a.role === "influencer" && (
                      <>
                        <p>
                          🎟️ Cupons:{" "}
                          {a.coupons.length > 0 ? a.coupons.map((c) => <span key={c} className="font-mono mr-1">{c}</span>) : "nenhum associado"}
                        </p>
                        <p>
                          🛒 {a.total} compra{a.total !== 1 ? "s" : ""} no total · {a.last30} nos últimos 30 dias
                        </p>
                      </>
                    )}
                    <p>🔑 Último acesso: {ago(a.last_login_at)}</p>
                    <p>
                      👁️ Vê também:{" "}
                      {a.permissions.length > 0
                        ? a.permissions.map((p) => AREAS.find((x) => x.id === p)?.label).filter(Boolean).join(", ")
                        : a.role === "team"
                          ? "nada"
                          : "só o painel de resultados"}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {a.role === "influencer" && (
                      <Button size="sm" onClick={() => setMode({ preview: a })}>
                        Ver painel dela
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => { setMode({ edit: a.id }); setFormError(null) }}>
                      Editar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => toggleActive(a)}>
                      {a.active ? "Desligar" : "Ligar"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => { setConfirmDelete(a); setConfirmPassword(""); setConfirmError(null) }}
                    >
                      Excluir
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <h3 className="font-semibold text-lg">🗑️ Excluir {confirmDelete.name}?</h3>
            <p className="text-sm text-muted-foreground">
              A conta deixa de existir e os cupons dela ficam livres (os cupons e as compras continuam). Se só quiser pausar, use “Desligar”.
            </p>
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Digite sua senha para confirmar"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && remove()}
            />
            {confirmError && <p className="text-sm text-red-600">{confirmError}</p>}
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

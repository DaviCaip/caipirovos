"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { THEMES, getTheme, type ThemeId } from "@/lib/themes"

type Api = (path: string, init?: RequestInit) => Promise<any>

export function ThemeTab({ api }: { api: Api }) {
  const [current, setCurrent] = useState<ThemeId>("normal")
  const [currentMessage, setCurrentMessage] = useState("")
  const [selected, setSelected] = useState<ThemeId>("normal")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  useEffect(() => {
    api("/api/admin/theme")
      .then((json) => {
        setCurrent(json.theme)
        setCurrentMessage(json.message)
        setSelected(json.theme)
        setMessage(json.message)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [api])

  async function save(theme: ThemeId, msg: string) {
    setSaving(true)
    setError(null)
    setDone(null)
    try {
      const json = await api("/api/admin/theme", { method: "POST", body: JSON.stringify({ theme, message: msg }) })
      setCurrent(json.theme)
      setCurrentMessage(json.message)
      setSelected(json.theme)
      setMessage(json.message)
      setDone(
        json.theme === "normal"
          ? "O site voltou ao normal."
          : `Tema ${getTheme(json.theme).label} ativado! Pode levar até 1 minuto para aparecer para todo mundo.`
      )
    } catch (e: any) {
      setError(e.message)
    }
    setSaving(false)
  }

  if (loading) return <p className="text-center text-muted-foreground py-8">Carregando...</p>

  const active = getTheme(current)
  const chosen = getTheme(selected)
  const changed = selected !== current || (selected !== "normal" && message.trim() !== currentMessage.trim())

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-muted-foreground">Tema do site agora</p>
            <p className="text-xl font-bold">
              {active.emoji} {active.label}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" asChild>
              <a href="/" target="_blank" rel="noreferrer">
                Ver o site
              </a>
            </Button>
            {current !== "normal" && (
              <Button variant="outline" disabled={saving} onClick={() => save("normal", "")}>
                ↩️ Voltar ao normal
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="font-semibold text-lg mb-3">Escolha uma data comemorativa</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setSelected(t.id)
                setMessage(t.id === current ? currentMessage : "")
              }}
              className={`text-left rounded-xl border-2 p-4 transition-all bg-white hover:shadow-md ${
                selected === t.id ? "border-black shadow-md" : "border-transparent shadow"
              }`}
            >
              <div className="text-3xl mb-2">{t.emoji}</div>
              <p className="font-semibold text-sm">{t.label}</p>
              <div className="flex gap-1 mt-2">
                <span className="h-4 w-8 rounded" style={{ background: t.primary }} />
                <span className="h-4 w-8 rounded" style={{ background: t.secondary }} />
              </div>
              {current === t.id && <p className="text-xs text-green-700 mt-2 font-medium">● No ar agora</p>}
            </button>
          ))}
        </div>
      </div>

      {selected !== "normal" && (
        <Card>
          <CardContent className="p-5 space-y-3">
            <label className="text-sm font-medium">Mensagem do banner no topo do site (opcional)</label>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              maxLength={140}
              placeholder={chosen.message}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Deixe em branco para usar a mensagem padrão. Mudam as cores, aparece uma faixa no topo e caem enfeites
              leves na tela.
            </p>
            <div className="rounded-lg overflow-hidden border text-sm">
              <div className="text-center py-2 px-4 font-medium text-white" style={{ background: chosen.secondary }}>
                {message.trim() || chosen.message}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
      {done && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">{done}</p>}

      <Button size="lg" disabled={saving || !changed} onClick={() => save(selected, message)}>
        {saving ? "Salvando..." : selected === "normal" ? "Voltar ao normal" : `Ativar tema ${chosen.label}`}
      </Button>
    </div>
  )
}

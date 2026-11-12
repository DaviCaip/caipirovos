// Níveis do influencer e a porcentagem de ganho de cada um.
// Quanto mais cupons vendidos (compras pagas com o cupom, no total), mais alto o nível e a porcentagem.
// O Davi edita esta escada no painel (aba Acessos > "Níveis e % de ganho"). Estes valores são só o ponto de partida.

export interface Level {
  /** a partir de quantos cupons vendidos o nível começa */
  min: number
  name: string
  emoji: string
  /** porcentagem de ganho neste nível */
  percent: number
}

export const LEVELS_KEY = "influencer_levels"

export const DEFAULT_LEVELS: Level[] = [
  { min: 0, name: "Ovo chocando", emoji: "🥚", percent: 0 },
  { min: 1, name: "Pintinho", emoji: "🐣", percent: 2 },
  { min: 10, name: "Franguinho", emoji: "🐥", percent: 4 },
  { min: 25, name: "Galinha caipira", emoji: "🐔", percent: 6 },
  { min: 50, name: "Galo garnisé", emoji: "🐓", percent: 8 },
  { min: 100, name: "Rei do terreiro", emoji: "👑", percent: 10 }, // nível máximo: 100 cupons vendidos = 10%
]

export type LevelsResult = { ok: true; levels: Level[] } | { ok: false; error: string }

/** Confere e limpa uma escada de níveis enviada pelo painel. */
export function normalizeLevels(input: unknown): LevelsResult {
  if (!Array.isArray(input) || input.length < 2 || input.length > 10) {
    return { ok: false, error: "A escada precisa ter de 2 a 10 níveis." }
  }
  const levels: Level[] = []
  for (let i = 0; i < input.length; i++) {
    const r: any = input[i] ?? {}
    const min = Number(r.min)
    const percent = Math.round(Number(r.percent) * 10) / 10
    const name = typeof r.name === "string" ? r.name.trim() : ""
    const emoji = typeof r.emoji === "string" && r.emoji.trim() ? r.emoji.trim().slice(0, 8) : "⭐"
    if (!Number.isInteger(min) || min < 0 || min > 100000) return { ok: false, error: `Nível ${i + 1}: "a partir de" deve ser um número inteiro de cupons.` }
    if (!name || name.length > 30) return { ok: false, error: `Nível ${i + 1}: dê um nome de até 30 letras.` }
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) return { ok: false, error: `Nível ${i + 1}: a porcentagem deve ficar entre 0 e 100.` }
    levels.push({ min, name, emoji, percent })
  }
  if (levels[0].min !== 0) return { ok: false, error: "O primeiro nível precisa começar em 0 cupons." }
  for (let i = 1; i < levels.length; i++) {
    if (levels[i].min <= levels[i - 1].min) return { ok: false, error: `Nível ${i + 1}: precisa começar depois do nível anterior (${levels[i - 1].min} cupons).` }
    if (levels[i].percent < levels[i - 1].percent) return { ok: false, error: `Nível ${i + 1}: a porcentagem não pode ser menor que a do nível anterior.` }
  }
  return { ok: true, levels }
}

export function levelFor(total: number, levels: Level[] = DEFAULT_LEVELS) {
  let index = 0
  levels.forEach((l, i) => {
    if (total >= l.min) index = i
  })
  const level = levels[index]
  const next = levels[index + 1] ?? null
  return { index, level, next, toNext: next ? next.min - total : 0 }
}

export const formatPercent = (n: number) => `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`

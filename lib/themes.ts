// Temas de datas comemorativas. As cores de cada tema ficam em app/globals.css (html[data-theme="..."]).
// Aqui ficam o nome, a mensagem padrão do banner e os enfeites que caem na tela.

export type ThemeId = "normal" | "natal" | "halloween" | "saojoao" | "pascoa" | "maes" | "pais"

export interface ThemeInfo {
  id: ThemeId
  label: string
  emoji: string
  /** Mensagem padrão do banner no topo do site (vazio = sem banner) */
  message: string
  /** Emojis que caem suavemente na tela (vazio = sem enfeites) */
  decor: string[]
  /** Só para a prévia no admin */
  primary: string
  secondary: string
}

export const THEMES: ThemeInfo[] = [
  { id: "normal", label: "Normal", emoji: "🥚", message: "", decor: [], primary: "#facc15", secondary: "#16a34a" },
  {
    id: "natal",
    label: "Natal",
    emoji: "🎄",
    message: "🎄 Feliz Natal! Ovos caipiras fresquinhos para a sua ceia.",
    decor: ["❄️", "🎄", "⭐"],
    primary: "#f87171",
    secondary: "#166534",
  },
  {
    id: "halloween",
    label: "Halloween",
    emoji: "🎃",
    message: "🎃 Halloween Caipirovos: doce ou ovo caipira?",
    decor: ["🎃", "🦇", "👻"],
    primary: "#fb923c",
    secondary: "#6d28d9",
  },
  {
    id: "saojoao",
    label: "São João",
    emoji: "🌽",
    message: "🌽 Arraiá Caipirovos! Ovo caipira fresquinho para a sua festa junina.",
    decor: ["🌽", "🎈", "🎶"],
    primary: "#fbbf24",
    secondary: "#dc2626",
  },
  {
    id: "pascoa",
    label: "Páscoa",
    emoji: "🐰",
    message: "🐰 Feliz Páscoa! Ovos caipiras de verdade, direto do campo.",
    decor: ["🐰", "🥚", "🌷"],
    primary: "#c084fc",
    secondary: "#db2777",
  },
  {
    id: "maes",
    label: "Dia das Mães",
    emoji: "💐",
    message: "💐 Dia das Mães: presenteie com ovos caipiras frescos.",
    decor: ["💐", "🌸", "💖"],
    primary: "#fb7185",
    secondary: "#be185d",
  },
  {
    id: "pais",
    label: "Dia dos Pais",
    emoji: "💙",
    message: "💙 Feliz Dia dos Pais! Café da manhã com ovo caipira.",
    decor: ["💙", "⭐", "🎁"],
    primary: "#60a5fa",
    secondary: "#1e3a8a",
  },
]

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEMES.some((t) => t.id === value)
}

export function getTheme(id: string | null | undefined): ThemeInfo {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}

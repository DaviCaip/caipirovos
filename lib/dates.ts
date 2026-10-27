// Datas sempre no horário da Bahia (UTC-3, sem horário de verão), para "hoje" ser o mesmo dia para todo mundo.
export const TZ = "America/Bahia"
const DAY = 86400000

/** AAAA-MM-DD do momento informado, no horário da Bahia */
export const dayKey = (d: string | number | Date = Date.now()) =>
  new Date(d).toLocaleDateString("sv-SE", { timeZone: TZ })

export const addDays = (key: string, n: number) =>
  new Date(Date.parse(`${key}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10)

/** 0 = domingo ... 6 = sábado */
export const weekdayOf = (key: string) => new Date(`${key}T00:00:00Z`).getUTCDay()

export const diffDays = (a: string, b: string) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / DAY)

export const fmtBR = (key: string) => `${key.slice(8, 10)}/${key.slice(5, 7)}`

export const WEEKDAY_NUMBER: Record<string, number> = {
  "Segunda-feira": 1,
  "Terça-feira": 2,
  "Quarta-feira": 3,
  "Quinta-feira": 4,
  "Sexta-feira": 5,
  "Sábado": 6,
}

/** "Hoje", "Amanhã", "Atrasada há 2 dias" ou a data */
export function dueLabel(due: string, today = dayKey()): { text: string; late: boolean } {
  const d = diffDays(due, today)
  if (d === 0) return { text: "Hoje", late: false }
  if (d === 1) return { text: "Amanhã", late: false }
  if (d < 0) return { text: `Atrasada há ${-d} dia${-d !== 1 ? "s" : ""}`, late: true }
  return { text: fmtBR(due), late: false }
}

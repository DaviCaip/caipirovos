import type { NextRequest } from "next/server"

/** Escapa HTML (evita que texto digitado vire código dentro do e-mail) e limita o tamanho. */
export function escapeHtml(value: unknown, max = 500): string {
  return String(value ?? "")
    .slice(0, max)
    .replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
}

/** Para assuntos de e-mail: uma linha só, tamanho limitado. */
export function oneLine(value: unknown, max = 100): string {
  return String(value ?? "").replace(/[\r\n]+/g, " ").slice(0, max)
}

/** Barreira básica: só aceita requisições vindas do próprio site (não de outros sites). */
export function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin")
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host")
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

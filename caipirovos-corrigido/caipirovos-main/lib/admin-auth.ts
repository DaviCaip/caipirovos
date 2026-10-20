import crypto from "crypto"
import type { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const ADMIN_COOKIE = "admin_session"
const MAX_AGE_SECONDS = 60 * 60 * 8 // sessão dura 8 horas

export const adminCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: MAX_AGE_SECONDS,
}

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD
  if (!s) throw new Error("ADMIN_PASSWORD não configurada")
  return s
}

function sign(value: string): string {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex")
}

function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest()
  const hb = crypto.createHash("sha256").update(b).digest()
  return crypto.timingSafeEqual(ha, hb)
}

export function checkPassword(input: unknown): boolean {
  const real = process.env.ADMIN_PASSWORD
  return !!real && typeof input === "string" && safeEqual(input, real)
}

export function createSession(): string {
  const exp = String(Date.now() + MAX_AGE_SECONDS * 1000)
  return `${exp}.${sign(exp)}`
}

export function hasSession(req: NextRequest): boolean {
  try {
    const cookie = req.cookies.get(ADMIN_COOKIE)?.value
    if (!cookie) return false
    const [exp, sig] = cookie.split(".")
    if (!exp || !sig || Number(exp) < Date.now()) return false
    return safeEqual(sig, sign(exp))
  } catch {
    return false
  }
}

/** Cliente Supabase com acesso total — usar SOMENTE em código de servidor (rotas /api). */
export function adminDb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

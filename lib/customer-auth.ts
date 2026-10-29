import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Conta do assinante: CPF + senha que o próprio cliente cria ao assinar.
// - A senha é guardada só como hash com "sal" (scrypt), impossível de reverter.
// - Sessão em cookie assinado, que o JavaScript do navegador não consegue ler.
// - 5 senhas erradas bloqueiam a conta por 15 minutos.

export const CUSTOMER_COOKIE = "cv_customer"
export const SESSION_DAYS = 14
export const MAX_FAILED = 5
export const LOCK_MINUTES = 15

export interface CustomerRow {
  id: string
  cpf_digits: string
  name: string
  email: string | null
  phone: string | null
  must_change_password: boolean
}

export function validatePassword(pw: unknown): string | null {
  if (typeof pw !== "string" || pw.length < 6) return "A senha precisa ter pelo menos 6 caracteres."
  if (pw.length > 60) return "A senha pode ter no máximo 60 caracteres."
  return null
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16)
  const hash = scryptSync(password, salt, 32)
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  const [alg, saltB64, hashB64] = (stored || "").split("$")
  if (alg !== "scrypt" || !saltB64 || !hashB64) return false
  const expected = Buffer.from(hashB64, "base64")
  const actual = scryptSync(password, Buffer.from(saltB64, "base64"), expected.length)
  return timingSafeEqual(actual, expected)
}

/** Gasta o mesmo tempo de uma conferência real (para não dar para descobrir se um CPF tem conta pelo tempo de resposta). */
export function burnTime() {
  verifyPassword("x", "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
}

function key(): Buffer | null {
  const s = process.env.ADMIN_SESSION_SECRET
  return s && s.length >= 16 ? createHmac("sha256", s).update("customer-session-v1").digest() : null
}

export function createCustomerToken(customerId: string): string | null {
  const k = key()
  if (!k) return null
  const payload = Buffer.from(JSON.stringify({ c: customerId, exp: Date.now() + SESSION_DAYS * 86400000 })).toString("base64url")
  return `${payload}.${createHmac("sha256", k).update(payload).digest("base64url")}`
}

export function setCustomerCookie(res: NextResponse, token: string) {
  res.cookies.set(CUSTOMER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  })
}

export function clearCustomerCookie(res: NextResponse) {
  res.cookies.set(CUSTOMER_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 })
}

export async function getCustomer(req: NextRequest): Promise<CustomerRow | null> {
  const k = key()
  const token = req.cookies.get(CUSTOMER_COOKIE)?.value
  if (!k || !token) return null
  const [payload, sig] = token.split(".")
  if (!payload || !sig) return null
  const expected = createHmac("sha256", k).update(payload).digest("base64url")
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))
    if (typeof data.c !== "string" || typeof data.exp !== "number" || data.exp < Date.now()) return null
    const { data: row } = await createAdminClient()
      .from("customers")
      .select("id, cpf_digits, name, email, phone, must_change_password")
      .eq("id", data.c)
      .maybeSingle()
    return (row as CustomerRow) ?? null
  } catch {
    return null
  }
}

type Auth = { customer: CustomerRow } | { error: NextResponse }

export async function requireCustomer(req: NextRequest): Promise<Auth> {
  if (req.method !== "GET") {
    const origin = req.headers.get("origin")
    if (origin) {
      try {
        if (new URL(origin).host !== req.headers.get("host")) {
          return { error: NextResponse.json({ error: "Origem não permitida." }, { status: 403 }) }
        }
      } catch {
        return { error: NextResponse.json({ error: "Origem inválida." }, { status: 403 }) }
      }
    }
  }
  const customer = await getCustomer(req)
  if (!customer) return { error: NextResponse.json({ error: "Faça login novamente." }, { status: 401 }) }
  return { customer }
}

// Limite por IP (em memória) além do bloqueio por conta, que fica no banco.
const ipAttempts = new Map<string, { count: number; first: number }>()
const IP_WINDOW = 10 * 60 * 1000
const IP_MAX = 20

export function ipBlocked(ip: string): boolean {
  const a = ipAttempts.get(ip)
  if (!a) return false
  if (Date.now() - a.first > IP_WINDOW) {
    ipAttempts.delete(ip)
    return false
  }
  return a.count >= IP_MAX
}

export function ipFailure(ip: string) {
  const a = ipAttempts.get(ip)
  if (!a || Date.now() - a.first > IP_WINDOW) ipAttempts.set(ip, { count: 1, first: Date.now() })
  else a.count += 1
}

/** Conta uma senha errada; no 5º erro seguido bloqueia a conta por 15 minutos. Devolve true se ficou bloqueada. */
export async function recordPasswordFailure(customerId: string, previousAttempts: number): Promise<boolean> {
  const attempts = previousAttempts + 1
  const lock = attempts >= MAX_FAILED
  await createAdminClient()
    .from("customers")
    .update(
      lock
        ? { failed_attempts: 0, locked_until: new Date(Date.now() + LOCK_MINUTES * 60000).toISOString() }
        : { failed_attempts: attempts }
    )
    .eq("id", customerId)
  return lock
}

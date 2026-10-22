import { createHash, createHmac, timingSafeEqual } from "crypto"
import { NextRequest, NextResponse } from "next/server"

// Cada senha abre áreas diferentes do admin. As senhas ficam SÓ no servidor (variável ADMIN_USERS na Vercel).
//
// ADMIN_USERS = [
//   {"name":"Davi","password":"...","permissions":["*"]},
//   {"name":"Entregas","password":"...","permissions":["subscriptions"]}
// ]
// "*" = tudo. Áreas: subscriptions, delete_subscriptions (excluir assinaturas), registrations, coupons, theme.
//
// ADMIN_SESSION_SECRET = texto aleatório com 32+ caracteres (assina o cookie de login).

export type Permission = "subscriptions" | "delete_subscriptions" | "registrations" | "coupons" | "theme"
export const ALL_PERMISSIONS: Permission[] = ["subscriptions", "delete_subscriptions", "registrations", "coupons", "theme"]

export const COOKIE_NAME = "cv_admin"
export const SESSION_HOURS = 12

export interface AdminUser {
  name: string
  password: string
  permissions: Permission[]
}

export function loadUsers(): AdminUser[] {
  try {
    const raw = JSON.parse(process.env.ADMIN_USERS || "[]")
    if (!Array.isArray(raw)) return []
    const users: AdminUser[] = []
    for (const u of raw) {
      if (!u || typeof u.name !== "string" || typeof u.password !== "string" || !u.name || !u.password) continue
      const perms: string[] = Array.isArray(u.permissions) ? u.permissions : []
      const permissions = perms.includes("*")
        ? ALL_PERMISSIONS
        : ALL_PERMISSIONS.filter((p) => perms.includes(p))
      users.push({ name: u.name, password: u.password, permissions })
    }
    return users
  } catch {
    return []
  }
}

function digest(v: string) {
  return createHash("sha256").update(v).digest()
}

function safeEqual(a: string, b: string) {
  return timingSafeEqual(digest(a), digest(b))
}

export function findUserByPassword(password: string): AdminUser | undefined {
  let found: AdminUser | undefined
  for (const u of loadUsers()) {
    if (safeEqual(password, u.password) && !found) found = u
  }
  return found
}

export function verifyUserPassword(name: string, password: string): boolean {
  const u = loadUsers().find((x) => x.name === name)
  return !!u && safeEqual(password || "", u.password)
}

function secret(): string | null {
  const s = process.env.ADMIN_SESSION_SECRET
  return s && s.length >= 16 ? s : null
}

function sign(data: string, key: string) {
  return createHmac("sha256", key).update(data).digest("base64url")
}

export function createSessionToken(name: string): string | null {
  const key = secret()
  if (!key) return null
  const payload = Buffer.from(JSON.stringify({ n: name, exp: Date.now() + SESSION_HOURS * 3600 * 1000 })).toString(
    "base64url"
  )
  return `${payload}.${sign(payload, key)}`
}

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  })
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 })
}

/** Lê o cookie, confere a assinatura e devolve o usuário ATUAL (permissões vêm da configuração, não do cookie). */
export function getSession(req: NextRequest): AdminUser | null {
  const key = secret()
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!key || !token) return null
  const [payload, sig] = token.split(".")
  if (!payload || !sig) return null
  const expected = sign(payload, key)
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"))
    if (typeof data.n !== "string" || typeof data.exp !== "number" || data.exp < Date.now()) return null
    return loadUsers().find((u) => u.name === data.n) ?? null
  } catch {
    return null
  }
}

type AuthResult = { user: AdminUser } | { error: NextResponse }

/** Use no começo de cada rota do admin. */
export function requireAdmin(req: NextRequest, permission?: Permission): AuthResult {
  // Proteção extra: pedidos que alteram dados só valem se vierem do próprio site.
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
  const user = getSession(req)
  if (!user) return { error: NextResponse.json({ error: "Faça login novamente." }, { status: 401 }) }
  if (permission && !user.permissions.includes(permission)) {
    return { error: NextResponse.json({ error: "Sua senha não dá acesso a esta área." }, { status: 403 }) }
  }
  return { user }
}

// Limite de tentativas de senha errada (por IP). Em memória: ajuda, mas não substitui uma senha forte.
const attempts = new Map<string, { count: number; first: number }>()
const WINDOW_MS = 10 * 60 * 1000
const MAX_ATTEMPTS = 5

export function clientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
}

export function isBlocked(ip: string): boolean {
  const a = attempts.get(ip)
  if (!a) return false
  if (Date.now() - a.first > WINDOW_MS) {
    attempts.delete(ip)
    return false
  }
  return a.count >= MAX_ATTEMPTS
}

export function registerFailure(ip: string) {
  const a = attempts.get(ip)
  if (!a || Date.now() - a.first > WINDOW_MS) attempts.set(ip, { count: 1, first: Date.now() })
  else a.count += 1
}

export function clearFailures(ip: string) {
  attempts.delete(ip)
}

export function isConfigured(): boolean {
  return loadUsers().length > 0 && secret() !== null
}

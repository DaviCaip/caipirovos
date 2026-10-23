import { createHash, createHmac, timingSafeEqual } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

// Dois tipos de conta:
//  1) Contas fixas, na variável ADMIN_USERS da Vercel (a do Davi e a da equipe).
//  2) Contas de influencer, criadas no painel (aba Influencers) e guardadas no banco.
//
// ADMIN_USERS = [
//   {"name":"Davi","password":"...","permissions":["*"]},
//   {"name":"Equipe","password":"...","permissions":["subscriptions","registrations"]}
// ]
// "*" = tudo (inclusive o que for criado no futuro).
//
// ADMIN_SESSION_SECRET = texto aleatório com 32+ caracteres. Assina o cookie de login e protege as senhas das contas
// de influencer. NÃO TROQUE depois de criar influencers (senão as senhas deles param de funcionar).

export type Permission =
  | "subscriptions" // ver assinaturas
  | "delete_subscriptions" // excluir assinaturas não ativas
  | "registrations" // revendedores e produtores
  | "coupons" // criar/gerenciar cupons
  | "theme" // personalizar o site
  | "influencers" // criar e gerenciar contas de influencer
  | "my_stats" // painel de resultados do próprio cupom (toda conta de influencer tem)
  | "cashback" // configurar e acompanhar o cashback (só o dono)

export const ALL_PERMISSIONS: Permission[] = [
  "subscriptions",
  "delete_subscriptions",
  "registrations",
  "coupons",
  "theme",
  "influencers",
  "my_stats",
  "cashback",
]

/** Áreas que o Davi pode liberar para uma conta de influencer (as demais são só dele). */
export const GRANTABLE_PERMISSIONS: Permission[] = ["subscriptions", "registrations", "coupons", "theme"]

export const COOKIE_NAME = "cv_admin"
export const SESSION_HOURS = 12

interface EnvUser {
  name: string
  password: string
  permissions: Permission[]
}

/** Quem está logado (nunca carrega senha). */
export interface AdminUser {
  kind: "env" | "db"
  id?: string
  name: string
  permissions: Permission[]
  monthlyGoal?: number
}

function loadEnvUsers(): EnvUser[] {
  try {
    const raw = JSON.parse(process.env.ADMIN_USERS || "[]")
    if (!Array.isArray(raw)) return []
    const users: EnvUser[] = []
    for (const u of raw) {
      if (!u || typeof u.name !== "string" || typeof u.password !== "string" || !u.name || !u.password) continue
      const perms: string[] = Array.isArray(u.permissions) ? u.permissions : []
      const permissions = perms.includes("*") ? ALL_PERMISSIONS : ALL_PERMISSIONS.filter((p) => perms.includes(p))
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

function secret(): string | null {
  const s = process.env.ADMIN_SESSION_SECRET
  return s && s.length >= 16 ? s : null
}

function sign(data: string, key: string) {
  return createHmac("sha256", key).update(data).digest("base64url")
}

/** "Impressão digital" da senha de uma conta de influencer (a senha em si nunca é guardada). */
export function hashLoginPassword(password: string): string | null {
  const s = secret()
  if (!s) return null
  const key = createHmac("sha256", s).update("login-key-v1").digest()
  return createHmac("sha256", key).update(password).digest("hex")
}

/** A senha já é de uma conta fixa? (para não deixar um influencer usar a mesma senha) */
export function isEnvPassword(password: string): boolean {
  return loadEnvUsers().some((u) => safeEqual(password, u.password))
}

export function accountToUser(row: any): AdminUser {
  const extras: string[] = Array.isArray(row.permissions) ? row.permissions : []
  const permissions = GRANTABLE_PERMISSIONS.filter((p) => extras.includes(p))
  // Conta de equipe: só as áreas liberadas. Conta de influencer: também tem o painel de resultados do cupom.
  const isTeam = row.role === "team"
  return {
    kind: "db",
    id: row.id,
    name: row.name,
    permissions: isTeam ? permissions : [...permissions, "my_stats"],
    monthlyGoal: typeof row.monthly_goal === "number" ? row.monthly_goal : 0,
  }
}

export async function findUserByPassword(password: string): Promise<AdminUser | null> {
  let found: EnvUser | undefined
  for (const u of loadEnvUsers()) {
    if (safeEqual(password, u.password) && !found) found = u
  }
  if (found) return { kind: "env", name: found.name, permissions: found.permissions }

  const hash = hashLoginPassword(password)
  if (!hash) return null
  const supabase = createAdminClient()
  const { data } = await supabase.from("admin_accounts").select("*").eq("login_hash", hash).maybeSingle()
  if (!data || !data.active) return null
  supabase.from("admin_accounts").update({ last_login_at: new Date().toISOString() }).eq("id", data.id).then(() => {})
  return accountToUser(data)
}

/** Confere a senha de quem está logado (usada para confirmar edições e exclusões). */
export async function verifyUserPassword(user: AdminUser, password: string): Promise<boolean> {
  if (typeof password !== "string" || !password) return false
  if (user.kind === "env") {
    const u = loadEnvUsers().find((x) => x.name === user.name)
    return !!u && safeEqual(password, u.password)
  }
  const hash = hashLoginPassword(password)
  if (!hash || !user.id) return false
  const { data } = await createAdminClient().from("admin_accounts").select("login_hash").eq("id", user.id).maybeSingle()
  return !!data && safeEqual(hash, data.login_hash)
}

export function createSessionToken(user: AdminUser): string | null {
  const key = secret()
  if (!key) return null
  const payload = Buffer.from(
    JSON.stringify({ n: user.name, k: user.kind, id: user.id, exp: Date.now() + SESSION_HOURS * 3600 * 1000 })
  ).toString("base64url")
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

/**
 * Lê o cookie, confere a assinatura e devolve o usuário ATUAL.
 * As permissões vêm sempre da configuração/banco (não do cookie): desligar ou alterar uma conta vale na hora.
 */
export async function getSession(req: NextRequest): Promise<AdminUser | null> {
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

    if (data.k === "db" && typeof data.id === "string") {
      const { data: row } = await createAdminClient().from("admin_accounts").select("*").eq("id", data.id).maybeSingle()
      if (!row || !row.active) return null
      return accountToUser(row)
    }

    const u = loadEnvUsers().find((x) => x.name === data.n)
    return u ? { kind: "env", name: u.name, permissions: u.permissions } : null
  } catch {
    return null
  }
}

type AuthResult = { user: AdminUser } | { error: NextResponse }

/** Use no começo de cada rota do admin. */
export async function requireAdmin(req: NextRequest, permission?: Permission): Promise<AuthResult> {
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
  const user = await getSession(req)
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
  return loadEnvUsers().length > 0 && secret() !== null
}

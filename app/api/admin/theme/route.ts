import { NextRequest, NextResponse } from "next/server"
import { revalidatePath, revalidateTag } from "next/cache"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { isThemeId } from "@/lib/themes"

export async function GET(req: NextRequest) {
  const auth = requireAdmin(req, "theme")
  if ("error" in auth) return auth.error

  const { data } = await createAdminClient().from("site_settings").select("value").eq("key", "theme").maybeSingle()
  const v: any = data?.value
  return NextResponse.json({
    theme: v && isThemeId(v.theme) ? v.theme : "normal",
    message: typeof v?.message === "string" ? v.message : "",
  })
}

export async function POST(req: NextRequest) {
  const auth = requireAdmin(req, "theme")
  if ("error" in auth) return auth.error

  const { theme, message } = await req.json().catch(() => ({}))
  if (!isThemeId(theme)) return NextResponse.json({ error: "Tema inválido." }, { status: 400 })
  const msg = typeof message === "string" ? message.trim().slice(0, 140) : ""

  const { error } = await createAdminClient()
    .from("site_settings")
    .upsert({ key: "theme", value: { theme, message: msg }, updated_at: new Date().toISOString() }, { onConflict: "key" })
  if (error) return NextResponse.json({ error: "Não foi possível salvar o tema." }, { status: 500 })

  // Faz o site mostrar o novo tema na hora.
  revalidateTag("site-theme")
  revalidatePath("/", "layout")
  return NextResponse.json({ ok: true, theme, message: msg })
}

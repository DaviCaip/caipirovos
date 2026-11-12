import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadLevels } from "@/lib/influencer-stats"
import { LEVELS_KEY, normalizeLevels } from "@/lib/influencer-levels"

// Escada de níveis e % de ganho dos influencers (editada pelo Davi).
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, "influencers")
  if ("error" in auth) return auth.error
  return NextResponse.json(await loadLevels())
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req, "influencers")
  if ("error" in auth) return auth.error

  const b = await req.json().catch(() => ({}))
  const supabase = createAdminClient()

  if (b.reset === true) {
    await supabase.from("site_settings").delete().eq("key", LEVELS_KEY)
    return NextResponse.json({ ok: true, ...(await loadLevels()) })
  }

  const r = normalizeLevels(b.levels)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 })
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: LEVELS_KEY, value: { levels: r.levels }, updated_at: new Date().toISOString() }, { onConflict: "key" })
  if (error) return NextResponse.json({ error: "Não foi possível salvar." }, { status: 500 })
  return NextResponse.json({ ok: true, levels: r.levels, isDefault: false })
}

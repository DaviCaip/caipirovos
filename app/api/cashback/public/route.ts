import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getCashbackSettings } from "@/lib/cashback"

// Sempre consulta na hora (senão o Next congela a resposta no dia do deploy).
export const dynamic = "force-dynamic"

// Só diz ao site se o cashback está ligado e quantos %. Nada de dados de clientes.
export async function GET() {
  try {
    const s = await getCashbackSettings(createAdminClient())
    return NextResponse.json(
      { enabled: s.enabled, percent: s.percent },
      { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
    )
  } catch {
    return NextResponse.json({ enabled: false, percent: 0 })
  }
}

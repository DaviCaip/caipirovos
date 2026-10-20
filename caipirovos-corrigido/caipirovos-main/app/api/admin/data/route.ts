import { NextRequest, NextResponse } from "next/server"
import { adminDb, hasSession } from "@/lib/admin-auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  if (!hasSession(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const db = adminDb()
  const newest = { ascending: false }
  const [subs, hist, resellers, producers] = await Promise.all([
    db.from("subscriptions").select("*").order("created_at", newest),
    db.from("delivery_history").select("*").order("delivered_at", newest),
    db.from("resellers").select("*").order("created_at", newest),
    db.from("producers").select("*").order("created_at", newest),
  ])

  const error = subs.error || hist.error || resellers.error || producers.error
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    subscriptions: subs.data ?? [],
    history: hist.data ?? [],
    resellers: resellers.data ?? [],
    producers: producers.data ?? [],
  })
}

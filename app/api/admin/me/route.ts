import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/admin-auth"

export async function GET(req: NextRequest) {
  const user = getSession(req)
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 })
  return NextResponse.json({ name: user.name, permissions: user.permissions })
}

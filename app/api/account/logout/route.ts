import { NextResponse } from "next/server"
import { clearCustomerCookie } from "@/lib/customer-auth"

export async function POST() {
  const res = NextResponse.json({ ok: true })
  clearCustomerCookie(res)
  return res
}

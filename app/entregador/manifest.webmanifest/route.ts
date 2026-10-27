import { NextResponse } from "next/server"

export const dynamic = "force-static"

export function GET() {
  return NextResponse.json(
    {
      name: "Caipirovos Entregas",
      short_name: "Entregas",
      description: "App do entregador do Caipirovos",
      lang: "pt-BR",
      start_url: "/entregador",
      scope: "/entregador",
      display: "standalone",
      orientation: "portrait",
      background_color: "#fffbeb",
      theme_color: "#facc15",
      icons: [
        { src: "/entregador/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
        { src: "/entregador/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } }
  )
}

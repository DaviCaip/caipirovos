import type { Metadata, Viewport } from "next"

// App do entregador: abre no celular e dá para "instalar" na tela inicial (PWA), sem loja de aplicativos.
export const metadata: Metadata = {
  title: "Caipirovos Entregas",
  manifest: "/entregador/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Entregas", statusBarStyle: "default" },
  icons: { icon: "/entregador/icon-192.png", apple: "/entregador/icon-192.png" },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = {
  themeColor: "#facc15",
  width: "device-width",
  initialScale: 1,
}

export default function CourierLayout({ children }: { children: React.ReactNode }) {
  return children
}

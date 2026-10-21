import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { Suspense } from "react"
import { getSiteTheme } from "@/lib/site-theme"
import { ThemeBanner } from "@/components/theme-banner"
import "./globals.css"

// O site confere o tema pelo menos a cada 1 minuto (e na hora quando você troca no admin).
export const revalidate = 60

export const metadata: Metadata = {
  title: "Caipirovos - O Maior Marketplace de Agricultura Familiar do Brasil",
  description:
    "Conectamos pequenos e médios produtores a um canal sólido de comercialização. Ovos caipiras frescos, sustentáveis e de qualidade direto do campo para sua mesa.",
  generator: "v0.app",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { theme, message } = await getSiteTheme()

  return (
    <html lang="pt-BR" data-theme={theme}>
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <ThemeBanner theme={theme} message={message} />
        <Suspense fallback={null}>{children}</Suspense>
        <Analytics />
      </body>
    </html>
  )
}

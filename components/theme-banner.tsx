"use client"

import { usePathname } from "next/navigation"
import { getTheme } from "@/lib/themes"

// Posições fixas (sem sorteio) para não dar diferença entre servidor e navegador.
const SLOTS = [
  { left: "6%", delay: "0s", duration: "14s", size: "1.4rem" },
  { left: "18%", delay: "4s", duration: "18s", size: "1.1rem" },
  { left: "31%", delay: "9s", duration: "16s", size: "1.6rem" },
  { left: "44%", delay: "2s", duration: "20s", size: "1.2rem" },
  { left: "57%", delay: "7s", duration: "15s", size: "1.5rem" },
  { left: "70%", delay: "11s", duration: "19s", size: "1.1rem" },
  { left: "82%", delay: "5s", duration: "17s", size: "1.4rem" },
  { left: "93%", delay: "13s", duration: "21s", size: "1.2rem" },
]

export function ThemeBanner({ theme, message }: { theme: string; message: string }) {
  const pathname = usePathname()
  if (theme === "normal" || pathname?.startsWith("/admin")) return null

  const info = getTheme(theme)
  const text = message || info.message

  return (
    <>
      {text && (
        <div className="bg-secondary text-secondary-foreground text-center text-sm font-medium py-2 px-4">{text}</div>
      )}
      {info.decor.length > 0 && (
        <div className="theme-decor" aria-hidden="true">
          {SLOTS.map((s, i) => (
            <span
              key={i}
              style={{
                left: s.left,
                animationDelay: s.delay,
                animationDuration: s.duration,
                fontSize: s.size,
              }}
            >
              {info.decor[i % info.decor.length]}
            </span>
          ))}
        </div>
      )}
    </>
  )
}

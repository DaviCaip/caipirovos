import { createClient } from "@supabase/supabase-js"
import { isThemeId, type ThemeId } from "@/lib/themes"

export interface SiteTheme {
  theme: ThemeId
  message: string
}

const NORMAL: SiteTheme = { theme: "normal", message: "" }

// Leitura do tema com cache do Next: renova sozinha a cada 60 segundos e na hora quando você troca o tema
// no admin (revalidateTag "site-theme"). Se o banco estiver fora do ar, o site aparece no tema normal.
function themeClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, next: { revalidate: 60, tags: ["site-theme"] } }),
    },
  })
}

export async function getSiteTheme(): Promise<SiteTheme> {
  try {
    const { data, error } = await themeClient().from("site_settings").select("value").eq("key", "theme").maybeSingle()
    if (error) return NORMAL
    const v: any = data?.value
    if (v && isThemeId(v.theme)) {
      return { theme: v.theme, message: typeof v.message === "string" ? v.message.slice(0, 140) : "" }
    }
    return NORMAL
  } catch {
    return NORMAL
  }
}

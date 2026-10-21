import { unstable_cache } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { isThemeId, type ThemeId } from "@/lib/themes"

export interface SiteTheme {
  theme: ThemeId
  message: string
}

const NORMAL: SiteTheme = { theme: "normal", message: "" }

const readFromDb = unstable_cache(
  async (): Promise<SiteTheme> => {
    const supabase = createAdminClient()
    const { data, error } = await supabase.from("site_settings").select("value").eq("key", "theme").maybeSingle()
    if (error) throw error // não guarda erro no cache
    const v: any = data?.value
    if (v && isThemeId(v.theme)) {
      return { theme: v.theme, message: typeof v.message === "string" ? v.message.slice(0, 140) : "" }
    }
    return NORMAL
  },
  ["site-theme"],
  { tags: ["site-theme"], revalidate: 600 }
)

/** Se o banco estiver fora do ar, o site simplesmente aparece no tema normal. */
export async function getSiteTheme(): Promise<SiteTheme> {
  try {
    return await readFromDb()
  } catch {
    return NORMAL
  }
}

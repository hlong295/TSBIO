import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type HomeHeroSettings = {
  headlineTop: string;
  headlineMid?: string;
  headlineBottom: string;
  heroImageUrl?: string;
  ctaSupportLabel?: string;
  ctaSupportHref?: string;
  searchPlaceholder?: string;
  diagnoseButtonLabel?: string;
};

const DEFAULT_HERO: HomeHeroSettings = {
  headlineTop: "TSBIO - ĐỒNG HÀNH CỨU VƯỜN",
  headlineMid: "HƠN 10.000 NHÀ VƯỜN",
  headlineBottom: "PHỤC HỒI VƯỜN THÀNH CÔNG",
  heroImageUrl: "/tsbio-harvest-hero.jpg",
  ctaSupportLabel: "HỖ TRỢ KỸ THUẬT CHUYÊN SÂU",
  ctaSupportHref: "/cuu-vuon",
  searchPlaceholder: "Vườn bạn đang gặp vấn đề gì?",
  diagnoseButtonLabel: "CHẨN ĐOÁN\nNGAY",
};

async function safeReadSetting(key: string): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();

    // ❗ Chỉ select "value" — KHÔNG lấy created_at (vì DB anh không có cột này)
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", key)
      .limit(1);

    if (error) return null;
    if (!data || data.length === 0) return null;

    const raw = data[0]?.value ?? null;
    if (raw == null) return null;

    // Treat empty/whitespace-only values as unset
    const trimmed = String(raw).trim();
    if (!trimmed) return null;

    // Normalize "\n"
    return trimmed.replace(/\\n/g, "\n");
  } catch {
    return null;
  }
}

export async function getHomeHeroSettings(): Promise<HomeHeroSettings> {
  // Backward compatibility: older patches used camelCase keys.
  async function readFallback(primary: string, ...fallbacks: string[]) {
    const v = await safeReadSetting(primary);
    if (v != null) return v;

    for (const k of fallbacks) {
      const fv = await safeReadSetting(k);
      if (fv != null) return fv;
    }

    return null;
  }

  const [
    top,
    mid,
    bottom,
    imageUrl,
    ctaLabel,
    ctaHref,
    placeholder,
    diagnoseLabel,
  ] = await Promise.all([
    readFallback("home.hero.headline_top", "home.hero.headlineTop", "home.hero.line1"),
    readFallback("home.hero.headline_mid", "home.hero.headlineMid", "home.hero.line2"),
    readFallback("home.hero.headline_bottom", "home.hero.headlineBottom", "home.hero.line3"),
    readFallback("home.hero.image_url", "home.hero.heroImageUrl"),

    // Newer banner admin uses snake_case keys
    readFallback(
      "home.hero.cta_label",
      "home.hero.cta_support_label",
      "home.hero.ctaSupportLabel"
    ),
    readFallback(
      "home.hero.cta_href",
      "home.hero.cta_support_href",
      "home.hero.ctaSupportHref"
    ),

    readFallback("home.hero.search_placeholder", "home.hero.searchPlaceholder"),
    readFallback("home.hero.diagnose_button_label", "home.hero.diagnoseButtonLabel"),
  ]);

  return {
    headlineTop: top ?? DEFAULT_HERO.headlineTop,
    headlineMid: mid ?? DEFAULT_HERO.headlineMid,
    headlineBottom: bottom ?? DEFAULT_HERO.headlineBottom,
    heroImageUrl: imageUrl ?? DEFAULT_HERO.heroImageUrl,
    ctaSupportLabel: ctaLabel ?? DEFAULT_HERO.ctaSupportLabel,
    ctaSupportHref: ctaHref ?? DEFAULT_HERO.ctaSupportHref,
    searchPlaceholder: placeholder ?? DEFAULT_HERO.searchPlaceholder,
    diagnoseButtonLabel: diagnoseLabel ?? DEFAULT_HERO.diagnoseButtonLabel,
  };
}

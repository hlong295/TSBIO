import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type HomeHeroSettings = {
  headlineTop: string;
  headlineMid?: string;
  headlineBottom: string;
  heroImageUrl?: string;
  ctaSupportLabel?: string;
  searchPlaceholder?: string;
  diagnoseButtonLabel?: string;
};

const DEFAULT_HERO: HomeHeroSettings = {
  headlineTop: "TSBIO - ĐỒNG HÀNH CỨU VƯỜN",
  headlineMid: "HƠN 10.000 NHÀ VƯỜN",
  headlineBottom: "PHỤC HỒI VƯỜN THÀNH CÔNG",
  heroImageUrl: "/tsbio-harvest-hero.jpg",
  ctaSupportLabel: "HỖ TRỢ KỸ THUẬT CHUYÊN SÂU",
  searchPlaceholder: "Vườn bạn đang gặp vấn đề gì?",
  diagnoseButtonLabel: "CHẨN ĐOÁN\nNGAY",
};

async function safeReadSetting(key: string): Promise<string | null> {
  try {
  const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();

    if (error) {
      // Common case before DB migration: table missing.
      return null;
    }
    return data?.value ?? null;
  } catch {
    return null;
  }
}

export async function getHomeHeroSettings(): Promise<HomeHeroSettings> {
  const [top, mid, bottom, imageUrl, ctaLabel, placeholder, diagnoseLabel] = await Promise.all([
    safeReadSetting("home.hero.headline_top"),
    safeReadSetting("home.hero.headline_mid"),
    safeReadSetting("home.hero.headline_bottom"),
    safeReadSetting("home.hero.image_url"),
    safeReadSetting("home.hero.cta_support_label"),
    safeReadSetting("home.hero.search_placeholder"),
    safeReadSetting("home.hero.diagnose_button_label"),
  ]);

  return {
    headlineTop: top ?? DEFAULT_HERO.headlineTop,
    headlineMid: mid ?? DEFAULT_HERO.headlineMid,
    headlineBottom: bottom ?? DEFAULT_HERO.headlineBottom,
    heroImageUrl: imageUrl ?? DEFAULT_HERO.heroImageUrl,
    ctaSupportLabel: ctaLabel ?? DEFAULT_HERO.ctaSupportLabel,
    searchPlaceholder: placeholder ?? DEFAULT_HERO.searchPlaceholder,
    diagnoseButtonLabel: diagnoseLabel ?? DEFAULT_HERO.diagnoseButtonLabel,
  };
}

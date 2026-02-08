import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireRootAdmin } from "@/lib/admin/require-root";
import { writeAuditLog } from "@/lib/admin/audit";

const BANNER_KEYS = {
  heroImageUrl: "home.hero.image_url",
  headlineTop: "home.hero.headline_top",
  headlineMid: "home.hero.headline_mid",
  headlineBottom: "home.hero.headline_bottom",
  ctaSupportLabel: "home.hero.cta_support_label",
  searchPlaceholder: "home.hero.search_placeholder",
  diagnoseButtonLabel: "home.hero.diagnose_button_label",
} as const;

type BannerPayload = {
  heroImageUrl?: string;
  headlineTop?: string;
  headlineMid?: string;
  headlineBottom?: string;
  ctaSupportLabel?: string;
  searchPlaceholder?: string;
  diagnoseButtonLabel?: string;
};

async function readSettings() {
    const supabase = getSupabaseAdmin();
  const keys = Object.values(BANNER_KEYS);

  const { data, error } = await supabase
    .from("app_settings")
    .select("key,value")
    .in("key", keys);

  if (error) throw new Error(error.message);

  const map: Record<string, string> = {};
  for (const row of data || []) {
    if (row?.key) map[row.key] = row.value ?? "";
  }

  return {
    heroImageUrl: map[BANNER_KEYS.heroImageUrl] || "",
    headlineTop: map[BANNER_KEYS.headlineTop] || "",
    headlineMid: map[BANNER_KEYS.headlineMid] || "",
    headlineBottom: map[BANNER_KEYS.headlineBottom] || "",
    ctaSupportLabel: map[BANNER_KEYS.ctaSupportLabel] || "",
    searchPlaceholder: map[BANNER_KEYS.searchPlaceholder] || "",
    diagnoseButtonLabel: map[BANNER_KEYS.diagnoseButtonLabel] || "",
  };
}

async function upsertSetting(key: string, value: string) {
    const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("app_settings").upsert({ key, value });
  if (error) throw new Error(error.message);
}

export async function GET(req: Request) {
  try {
    await requireRootAdmin(req.headers);
    const settings = await readSettings();
    return NextResponse.json({ ok: true, settings });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const status = msg === "FORBIDDEN_NOT_ROOT" ? 403 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    const actor = await requireRootAdmin(req.headers);
    const body = (await req.json()) as BannerPayload;

    const next: Record<string, string> = {
      [BANNER_KEYS.heroImageUrl]: String(body.heroImageUrl ?? "").trim(),
      [BANNER_KEYS.headlineTop]: String(body.headlineTop ?? "").trim(),
      [BANNER_KEYS.headlineMid]: String(body.headlineMid ?? "").trim(),
      [BANNER_KEYS.headlineBottom]: String(body.headlineBottom ?? "").trim(),
      [BANNER_KEYS.ctaSupportLabel]: String(body.ctaSupportLabel ?? "").trim(),
      [BANNER_KEYS.searchPlaceholder]: String(body.searchPlaceholder ?? "").trim(),
      [BANNER_KEYS.diagnoseButtonLabel]: String(body.diagnoseButtonLabel ?? "").trim(),
    };

    // Upsert only keys provided in payload (avoid accidental wipes)
    const providedKeys = new Set(Object.keys(body || {}));
    const toWrite: Array<[string, string]> = [];
    for (const [payloadKey, dbKey] of Object.entries(BANNER_KEYS)) {
      if (providedKeys.has(payloadKey)) {
        toWrite.push([dbKey, next[dbKey]]);
      }
    }

    for (const [k, v] of toWrite) {
      await upsertSetting(k, v);
    }

    await writeAuditLog({
      actor_profile_id: actor.profileId,
      action: "banner.update",
      target: "app_settings",
      meta: { keys: toWrite.map(([k]) => k) },
    });

    const settings = await readSettings();
    return NextResponse.json({ ok: true, settings });
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const status = msg === "FORBIDDEN_NOT_ROOT" ? 403 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

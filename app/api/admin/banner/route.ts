import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireRootAdmin } from "@/lib/admin/require-root";
import { writeAuditLog } from "@/lib/admin/audit";
import { getHomeHeroSettings } from "@/lib/app-settings";

const BANNER_KEYS = {
  heroImageUrl: "home.hero.image_url",
  headlineTop: "home.hero.headline_top",
  headlineMid: "home.hero.headline_mid",
  headlineBottom: "home.hero.headline_bottom",
  ctaSupportLabel: "home.hero.cta_support_label",
  ctaSupportHref: "home.hero.cta_support_href",
  searchPlaceholder: "home.hero.search_placeholder",
  diagnoseButtonLabel: "home.hero.diagnose_button_label",
} as const;

type BannerPayload = {
  heroImageUrl?: string;
  headlineTop?: string;
  headlineMid?: string;
  headlineBottom?: string;
  ctaSupportLabel?: string;
  ctaSupportHref?: string;
  searchPlaceholder?: string;
  diagnoseButtonLabel?: string;
};

async function readSettings() {
  // Always return a fully-populated object (defaults included) so Admin UI
  // never starts with empty fields.
  return await getHomeHeroSettings();
}

async function upsertSetting(key: string, value: string) {
  const supabase = getSupabaseAdmin();

  // Some DB snapshots don't enforce UNIQUE(key). If we call `upsert` without a
  // conflict target, Supabase may insert duplicates. That later breaks reads.
  // So we do: UPDATE first; if no rows updated -> INSERT.
  const upd = await supabase
    .from("app_settings")
    .update({ value })
    .eq("key", key)
    .select("key")
    .limit(1);

  if (upd.error) throw new Error(upd.error.message);
  if ((upd.data?.length ?? 0) > 0) return;

  const ins = await supabase.from("app_settings").insert({ key, value });
  if (ins.error) throw new Error(ins.error.message);
}

function normalizeMultiline(v: unknown): string {
  const s = (typeof v === "string" ? v : "").trim();
  // Allow admin to input "\\n" in a single-line field and still render as
  // real line breaks on the Home banner.
  return s.replace(/\\n/g, "\n");
}

export async function GET(req: Request) {
  try {
    await requireRootAdmin(req.headers);
    const settings = await readSettings();
    const res = NextResponse.json({ ok: true, settings });
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const status = msg === "FORBIDDEN_NOT_ROOT" ? 403 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    const actor = await requireRootAdmin(req.headers);
    const raw = (await req.json()) as any;
    // Accept both shapes:
    // - { settings: { ... } } (used by Admin UI)
    // - { ... } (direct payload)
    const body = (raw?.settings ?? raw ?? {}) as any;

    // Accept both legacy field names and current Admin UI field names
    const heroImageUrl = String(body.heroImageUrl ?? body.imageUrl ?? "").trim();
    const ctaSupportLabel = String(body.ctaSupportLabel ?? body.ctaLabel ?? "").trim();
    const ctaSupportHref = String(body.ctaSupportHref ?? body.ctaHref ?? "").trim();
    const headlineTop = body.headlineTop;
    const headlineMid = body.headlineMid;
    const headlineBottom = body.headlineBottom;
    const searchPlaceholder = body.searchPlaceholder;
    const diagnoseButtonLabel = body.diagnoseButtonLabel;

    const next: Record<string, string> = {
      [BANNER_KEYS.heroImageUrl]: heroImageUrl,
      [BANNER_KEYS.headlineTop]: normalizeMultiline(headlineTop),
      [BANNER_KEYS.headlineMid]: normalizeMultiline(headlineMid),
      [BANNER_KEYS.headlineBottom]: normalizeMultiline(headlineBottom),
      [BANNER_KEYS.ctaSupportLabel]: ctaSupportLabel,
      [BANNER_KEYS.ctaSupportHref]: ctaSupportHref,
      [BANNER_KEYS.searchPlaceholder]: String(searchPlaceholder ?? "").trim(),
      [BANNER_KEYS.diagnoseButtonLabel]: String(diagnoseButtonLabel ?? "").trim(),
    };

    // Upsert only keys that were provided (avoid accidental wipes)
    // (consider alias field names too)
    const providedKeys = new Set<string>(Object.keys(body || {}));
    for (const k of Object.keys(raw || {})) providedKeys.add(k);
    if (providedKeys.has("imageUrl")) providedKeys.add("heroImageUrl");
    if (providedKeys.has("ctaLabel")) providedKeys.add("ctaSupportLabel");
    if (providedKeys.has("ctaHref")) providedKeys.add("ctaSupportHref");
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
    const res = NextResponse.json({ ok: true, settings });
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const status = msg === "FORBIDDEN_NOT_ROOT" ? 403 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

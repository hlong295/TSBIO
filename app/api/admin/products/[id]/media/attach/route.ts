import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminRole } from "@/lib/admin/require-role";
import { writeAuditLog } from "@/lib/admin/audit";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";

const BUCKET = "media";

type ProductMediaItem = {
  url: string;
  path: string;
  type: "image" | "video";
  display_order: number;
  thumbnail_url?: string;
};

type AttachItem = { path: string; type?: "image" | "video" };

function guessTypeFromName(name: string): "image" | "video" {
  const lower = name.toLowerCase();
  if (lower.match(/\.(mp4|mov|webm|avi|mkv|m4v)$/)) return "video";
  return "image";
}

function pickExtFromPath(path: string): string {
  const m = path.match(/\.([a-zA-Z0-9]{1,8})$/);
  return (m?.[1] || "bin").toLowerCase();
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function safeMediaArray(row: any): ProductMediaItem[] {
  const raw = row?.media;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as ProductMediaItem[];
  return [];
}

async function loadProduct(admin: ReturnType<typeof getSupabaseAdmin>, id: string) {
  const { data, error } = await admin.from("products").select("id, media, thumbnail_url, video_url").eq("id", id).maybeSingle();
  if (error) throw new Error(`PRODUCT_LOAD_FAILED: ${error.message}`);
  if (!data) throw new Error("NOT_FOUND");
  return data;
}

function computeThumbnailUrl(media: ProductMediaItem[]): string | null {
  const img = media
    .filter((m) => m.type === "image")
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))[0];
  return img?.url || null;
}

function computeVideoUrl(media: ProductMediaItem[]): string | null {
  const vid = media.find((m) => m.type === "video");
  return vid?.url || null;
}

function enforceLimits(current: ProductMediaItem[], adding: AttachItem[]) {
  const currentImages = current.filter((m) => m.type === "image").length;
  const currentVideos = current.filter((m) => m.type === "video").length;
  const addImages = adding.filter((x) => (x.type || guessTypeFromName(x.path)) === "image").length;
  const addVideos = adding.filter((x) => (x.type || guessTypeFromName(x.path)) === "video").length;

  if (currentVideos + addVideos > 1) throw new Error("VIDEO_LIMIT_EXCEEDED");
  if (currentImages + addImages > 10) throw new Error("IMAGE_LIMIT_EXCEEDED");
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const guard = await requireAdminRole(req, ["provider"]);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error, detail: guard.detail }, { status: guard.status });
  }

  try {
    const body = (await req.json().catch(() => null)) as { items?: AttachItem[] } | null;
    const items = body?.items || [];
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "NO_ITEMS" }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    const product = await loadProduct(admin, ctx.params.id);
    const current = safeMediaArray(product);

    // normalize & de-dupe
    const normalized: AttachItem[] = items
      .map((it) => (typeof { path: String(it?.path==="string"?{ path: String(it?.path.trim():String({ path: String(it?.path??"")), type: it?.type }))
      .filter((it) => it.path.length > 0);
    const dedup = Array.from(new Map(normalized.map((x) => [x.path, x])).values());

    enforceLimits(current, dedup);

    const nextMedia: ProductMediaItem[] = [...current];
    let nextOrder = nextMedia.length ? Math.max(...nextMedia.map((m) => m.display_order ?? 0)) + 1 : 0;

    const created: ProductMediaItem[] = [];
    for (const it of dedup) {
      const type: "image" | "video" = (it.type || guessTypeFromName(it.path)) as any;
      const ext = pickExtFromPath(it.path);
      const base = slugify(it.path.split("/").pop() || "media").slice(0, 60) || "media";
      const folder = type === "video" ? "video" : "images";
      const toPath = `products/${ctx.params.id}/${folder}/${nowStamp()}_${base}.${ext}`;

      // Copy within the same bucket. If copy isn't supported in the underlying API, this will throw.
      const { error: copyErr } = await admin.storage.from(BUCKET).copy(it.path, toPath);
      if (copyErr) throw new Error(`COPY_FAILED: ${copyErr.message}`);

      const pub = admin.storage.from(BUCKET).getPublicUrl(toPath);
      const url = pub?.data?.publicUrl;
      if (!url) throw new Error("PUBLIC_URL_FAILED");

      const mediaItem: ProductMediaItem = {
        url,
        path: toPath,
        type,
        display_order: nextOrder++,
      };
      nextMedia.push(mediaItem);
      created.push(mediaItem);
    }

    const thumbnail_url = computeThumbnailUrl(nextMedia);
    const video_url = computeVideoUrl(nextMedia);

    const { error: updErr } = await admin
      .from("products")
      .update({ media: nextMedia, thumbnail_url, video_url })
      .eq("id", ctx.params.id);
    if (updErr) throw new Error(`PRODUCT_UPDATE_FAILED: ${updErr.message}`);

    await writeAuditLog(admin, {
      actor_profile_id: guard.profile_id,
      action: "product.media.update",
      target_type: "product",
      target_id: ctx.params.id,
      meta: { attached_count: created.length, attached: created.map((m) => ({ path: m.path, type: m.type })) },
    });

    return NextResponse.json({ ok: true, attached: created, media: nextMedia, thumbnail_url, video_url });
  } catch (e: any) {
    const msg = e?.message || String(e);
    const status =
      msg === "NOT_FOUND" ? 404 :
      msg === "VIDEO_LIMIT_EXCEEDED" || msg === "IMAGE_LIMIT_EXCEEDED" ? 400 :
      msg === "NO_ITEMS" ? 400 :
      500;
    return NextResponse.json({ error: msg === "NOT_FOUND" ? "NOT_FOUND" : "MEDIA_ATTACH_FAILED", detail: msg }, { status });
  }
}

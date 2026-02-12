import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminRole } from "@/lib/admin/require-role";
import { writeAuditLog } from "@/lib/admin/audit";
import { slugify } from "@/lib/slug";
import { ensureStorageBucket } from "@/lib/media/ensure-bucket";

export const dynamic = "force-dynamic";

// NOTE: We reuse the existing bucket "media" to avoid requiring new infra.
// Paths follow the constitution:
//   /products/{productId}/images/*
//   /products/{productId}/video/*
const BUCKET = "media";

type ProductMediaItem = {
  url: string;
  path?: string | null;
  type: "image" | "video";
  display_order: number;
  // optional future fields
  thumbnail_url?: string;
  is_primary?: boolean;
};

function pickExt(filename: string, mime: string | undefined): string {
  const m = filename.match(/\.([a-zA-Z0-9]{1,8})$/);
  if (m) return m[1].toLowerCase();
  const fromMime = (mime || "").split("/")[1];
  return (fromMime || "bin").toLowerCase();
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function extractStoragePathFromPublicUrl(publicUrl: string): string | null {
  const marker = "/storage/v1/object/public/media/";
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(publicUrl.slice(idx + marker.length));
}

function safeMediaArray(row: any): ProductMediaItem[] {
  const raw = row?.media;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && (m.type === "image" || m.type === "video") && typeof m.url === "string")
    .map((m) => ({
      url: m.url,
      type: m.type,
      display_order: typeof m.display_order === "number" ? m.display_order : 0,
      path: typeof m.path === "string" ? m.path : extractStoragePathFromPublicUrl(m.url),
      thumbnail_url: typeof m.thumbnail_url === "string" ? m.thumbnail_url : undefined,
      is_primary: typeof m.is_primary === "boolean" ? m.is_primary : undefined,
    }));
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

function normalizeMedia(media: ProductMediaItem[]): ProductMediaItem[] {
  const images = media
    .filter((m) => m.type === "image")
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
  const video = media.find((m) => m.type === "video") || null;

  let order = 1;
  const normalizedImages = images.slice(0, 10).map((m, idx) => ({
    ...m,
    display_order: order++,
    is_primary: idx === 0,
    thumbnail_url: idx === 0 ? m.url : m.thumbnail_url,
  }));

  const out: ProductMediaItem[] = video
    ? [...normalizedImages, { ...video, display_order: order++ }]
    : normalizedImages;
  return out;
}

export async function GET(req: Request, ctx: { params: { id: string } }) {
  const guard = await requireAdminRole(req, ["provider"]);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error, detail: guard.detail }, { status: guard.status });
  }

  try {
    const admin = getSupabaseAdmin();
    const product = await loadProduct(admin, ctx.params.id);
    const media = safeMediaArray(product);
    return NextResponse.json({ ok: true, media, thumbnail_url: product.thumbnail_url || computeThumbnailUrl(media), video_url: product.video_url || computeVideoUrl(media) });
  } catch (e: any) {
    const msg = e?.message || String(e);
    const status = msg === "NOT_FOUND" ? 404 : 500;
    return NextResponse.json({ error: msg === "NOT_FOUND" ? "NOT_FOUND" : "MEDIA_GET_FAILED", detail: msg }, { status });
  }
}

// POST: upload media. Query params:
//   kind=image|video
// FormData:
//   files (image, multiple ok)
//   file (video, single)
export async function POST(req: Request, ctx: { params: { id: string } }) {
  const guard = await requireAdminRole(req, ["provider"]);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error, detail: guard.detail }, { status: guard.status });
  }

  const url = new URL(req.url);
  const kind = (url.searchParams.get("kind") || "image").toLowerCase();
  if (kind !== "image" && kind !== "video") {
    return NextResponse.json({ error: "INVALID_KIND" }, { status: 400 });
  }

  try {
    const form = await req.formData();
    const admin = getSupabaseAdmin();
    await ensureStorageBucket(BUCKET, { public: true });
    const product = await loadProduct(admin, ctx.params.id);
    const current = safeMediaArray(product);
    const images = current.filter((m) => m.type === "image");
    const videos = current.filter((m) => m.type === "video");

    if (kind === "video" && videos.length >= 1) {
      return NextResponse.json({ error: "VIDEO_LIMIT_EXCEEDED", detail: "Only 1 video per product" }, { status: 400 });
    }

    let files: File[] = [];
    if (kind === "image") {
      files = (form.getAll("files") || []).filter((x): x is File => x instanceof File);
      if (files.length === 0) {
        const single = form.get("file");
        if (single instanceof File) files = [single];
      }
      if (files.length === 0) {
        return NextResponse.json({ error: "INVALID_FILE" }, { status: 400 });
      }
      if (images.length + files.length > 10) {
        return NextResponse.json(
          { error: "IMAGE_LIMIT_EXCEEDED", detail: `Max 10 images. Remaining: ${Math.max(0, 10 - images.length)}` },
          { status: 400 }
        );
      }
    } else {
      const f = form.get("file");
      if (!(f instanceof File)) {
        return NextResponse.json({ error: "INVALID_FILE" }, { status: 400 });
      }
      files = [f];
    }

    // Validate file types + basic size limits (Pi Browser friendly)
    const maxImageBytes = 8 * 1024 * 1024; // 8MB
    const maxVideoBytes = 80 * 1024 * 1024; // 80MB
    for (const f of files) {
      if (kind === "image" && !f.type?.startsWith("image/")) {
        return NextResponse.json({ error: "INVALID_FILE_TYPE", detail: "Images only" }, { status: 400 });
      }
      if (kind === "video" && !f.type?.startsWith("video/")) {
        return NextResponse.json({ error: "INVALID_FILE_TYPE", detail: "Video only" }, { status: 400 });
      }
      if (kind === "image" && typeof f.size === "number" && f.size > maxImageBytes) {
        return NextResponse.json({ error: "FILE_TOO_LARGE", detail: `Image max ${Math.round(maxImageBytes / 1024 / 1024)}MB` }, { status: 400 });
      }
      if (kind === "video" && typeof f.size === "number" && f.size > maxVideoBytes) {
        return NextResponse.json({ error: "FILE_TOO_LARGE", detail: `Video max ${Math.round(maxVideoBytes / 1024 / 1024)}MB` }, { status: 400 });
      }
    }

    const uploaded: ProductMediaItem[] = [];

    for (const f of files) {
      const ext = pickExt(f.name || "file", f.type);
      const base = slugify((f.name || (kind === "video" ? "video" : "image")).replace(/\.[^/.]+$/, "")).slice(0, 60) || (kind === "video" ? "video" : "image");
      const ts = nowStamp();
      const folder = kind === "video" ? "video" : "images";
      const path = `products/${ctx.params.id}/${folder}/${ts}-${base}.${ext}`;

      const bytes = new Uint8Array(await f.arrayBuffer());
      const up = await admin.storage.from(BUCKET).upload(path, bytes, {
        contentType: f.type || "application/octet-stream",
        upsert: true,
        cacheControl: "31536000",
      });
      if (up.error) {
        return NextResponse.json({ error: "UPLOAD_FAILED", detail: up.error.message }, { status: 500 });
      }

      const pub = admin.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = pub.data.publicUrl;

      uploaded.push({
        type: kind as any,
        path,
        url: publicUrl,
        display_order: 0, // will be normalized below
      });
    }

    // Merge + normalize orders/primary
    const merged = [...current, ...uploaded];
    const normalized = normalizeMedia(merged);

    const thumbnail_url = computeThumbnailUrl(normalized);
    const video_url = computeVideoUrl(normalized);
    const image_url = thumbnail_url;

    const { data, error } = await admin
      .from("products")
      .update({ media: normalized, thumbnail_url, video_url, image_url })
      .eq("id", ctx.params.id)
      .select("id, media, thumbnail_url, video_url, image_url")
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: "DB_UPDATE_FAILED", detail: error.message }, { status: 500 });
    }

    await writeAuditLog({
      actorId: guard.userId,
      action: "product.media.update",
      target: { type: "products", id: ctx.params.id },
      meta: {
        added: uploaded.map((u) => ({ type: u.type, path: u.path })),
        counts: { images: normalized.filter((m) => m.type === "image").length, videos: normalized.filter((m) => m.type === "video").length },
      },
    }).catch(() => null);

    return NextResponse.json({ ok: true, media: data?.media || normalized, thumbnail_url: data?.thumbnail_url || thumbnail_url, video_url: data?.video_url || video_url });
  } catch (e: any) {
    const msg = e?.message || String(e);
    const status = msg === "NOT_FOUND" ? 404 : 500;
    return NextResponse.json({ error: msg === "NOT_FOUND" ? "NOT_FOUND" : "MEDIA_UPLOAD_FAILED", detail: msg }, { status });
  }
}

// DELETE: remove a media item by path (query param: path=...)
export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  const guard = await requireAdminRole(req, ["provider"]);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error, detail: guard.detail }, { status: guard.status });
  }

  const url = new URL(req.url);
  const path = (url.searchParams.get("path") || "").trim();
  if (!path) {
    return NextResponse.json({ error: "MISSING_PATH" }, { status: 400 });
  }

  try {
    const admin = getSupabaseAdmin();
    const product = await loadProduct(admin, ctx.params.id);
    const current = safeMediaArray(product);
    const next = current.filter((m) => m.path !== path);
    if (next.length === current.length) {
      return NextResponse.json({ ok: true, media: current }, { status: 200 });
    }

    // remove from storage (best-effort)
    await admin.storage.from(BUCKET).remove([path]).catch(() => null);

    // normalize orders/primary again
    const normalized = normalizeMedia(next);

    const thumbnail_url = computeThumbnailUrl(normalized);
    const video_url = computeVideoUrl(normalized);
    const image_url = thumbnail_url;

    const { data, error } = await admin
      .from("products")
      .update({ media: normalized, thumbnail_url, video_url, image_url })
      .eq("id", ctx.params.id)
      .select("id, media, thumbnail_url, video_url, image_url")
      .maybeSingle();
    if (error) {
      return NextResponse.json({ error: "DB_UPDATE_FAILED", detail: error.message }, { status: 500 });
    }

    await writeAuditLog({
      actorId: guard.userId,
      action: "product.media.update",
      target: { type: "products", id: ctx.params.id },
      meta: {
        removed: path,
        counts: {
          images: normalized.filter((m) => m.type === "image").length,
          videos: normalized.filter((m) => m.type === "video").length,
        },
      },
    }).catch(() => null);

    return NextResponse.json({ ok: true, media: data?.media || normalized, thumbnail_url: data?.thumbnail_url || thumbnail_url, video_url: data?.video_url || video_url });
  } catch (e: any) {
    const msg = e?.message || String(e);
    const status = msg === "NOT_FOUND" ? 404 : 500;
    return NextResponse.json({ error: msg === "NOT_FOUND" ? "NOT_FOUND" : "MEDIA_DELETE_FAILED", detail: msg }, { status });
  }
}

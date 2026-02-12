import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminRole } from "@/lib/admin/require-role";
import { ensureStorageBucket } from "@/lib/media/ensure-bucket";
import { writeAuditLog } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

type IncomingMedia = {
  kind: "image" | "video";
  // One of these must exist:
  tmp_path?: string;
  url?: string;
  name?: string;
  // Optional video thumbnail (client-generated)
  thumbnail_url?: string;
  thumbnail_tmp_path?: string;
};

type StoredMediaItem = {
  url: string;
  type: "image" | "video";
  display_order: number;
  path?: string | null;
  is_primary?: boolean;
  thumbnail_url?: string;
};

function extractStoragePathFromPublicUrl(publicUrl: string): string | null {
  const marker = "/storage/v1/object/public/media/";
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(publicUrl.slice(idx + marker.length));
}

function safeExtFromName(name: string, fallback: string) {
  const m = (name || "").toLowerCase().match(/\.[a-z0-9]+$/);
  return m ? m[0] : fallback;
}

function safeMediaArray(raw: any): StoredMediaItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((m) => m && (m.type === "image" || m.type === "video") && typeof m.url === "string")
    .map((m) => ({
      url: m.url,
      type: m.type,
      display_order: typeof m.display_order === "number" ? m.display_order : 0,
      path: typeof m.path === "string" ? m.path : extractStoragePathFromPublicUrl(m.url),
      is_primary: typeof m.is_primary === "boolean" ? m.is_primary : undefined,
      thumbnail_url: typeof m.thumbnail_url === "string" ? m.thumbnail_url : undefined,
    }));
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  // Allow provider/editor/admin to manage product media (root_admin always passes).
  const gate = await requireAdminRole(req, ["admin", "editor", "provider", "approval"]);
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error, detail: gate.detail }, { status: gate.status });
  }

  const productId = ctx.params.id;

  const body = (await req.json().catch(() => null)) as { items?: IncomingMedia[] } | null;
  const incoming = Array.isArray(body?.items) ? (body!.items as IncomingMedia[]) : [];

  const incomingImages = incoming.filter((x) => x.kind === "image");
  const incomingVideos = incoming.filter((x) => x.kind === "video");

  if (incomingVideos.length > 1) {
    return NextResponse.json({ ok: false, error: "TOO_MANY_VIDEOS" }, { status: 400 });
  }
  if (incomingImages.length > 10) {
    return NextResponse.json({ ok: false, error: "TOO_MANY_IMAGES" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  await ensureStorageBucket("media", { public: true });

  const { data: product, error: pErr } = await supabase
    .from("products")
    .select("id, image_url, video_url, thumbnail_url, media")
    .eq("id", productId)
    .maybeSingle();

  if (pErr || !product) {
    return NextResponse.json({ ok: false, error: "PRODUCT_NOT_FOUND", detail: pErr?.message }, { status: 404 });
  }

  const existing = safeMediaArray(product.media);
  const existingImages = existing.filter((m) => m.type === "image");
  const existingVideo = existing.find((m) => m.type === "video") || null;

  // Enforce limits considering existing media too.
  if (existingImages.length + incomingImages.length > 10) {
    return NextResponse.json(
      {
        ok: false,
        error: "IMAGE_LIMIT_EXCEEDED",
        detail: `Max 10 images. Remaining: ${Math.max(0, 10 - existingImages.length)}`,
      },
      { status: 400 }
    );
  }
  if (existingVideo && incomingVideos.length > 0) {
    return NextResponse.json(
      { ok: false, error: "VIDEO_LIMIT_EXCEEDED", detail: "Only 1 video per product" },
      { status: 400 }
    );
  }

  async function resolveToFinal(item: IncomingMedia): Promise<{
    path: string | null;
    url: string;
    thumbnail_path?: string | null;
    thumbnail_url?: string | null;
  }> {
    if (item.tmp_path) {
      // v69+: temp objects are stored under `uploads/tmp_<userId>_*` so the library can list them
      // (non-recursive listing under prefix `uploads/`). Keep backward compat with old `tmp/`.
      if (!(item.tmp_path.startsWith("tmp/") || item.tmp_path.startsWith("uploads/tmp_"))) {
        throw new Error("INVALID_TMP_PATH");
      }

      const ext = safeExtFromName(item.name || item.tmp_path, item.kind === "video" ? ".mp4" : ".jpg");
      const base = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const finalPath =
        item.kind === "video"
          ? `products/${productId}/video/${base}${ext}`
          : `products/${productId}/images/${base}${ext}`;

      const moved = await supabase.storage.from("media").move(item.tmp_path, finalPath);
      if (moved.error) {
        const msg = moved.error.message || "";
        if (!msg.toLowerCase().includes("already exists")) {
          throw new Error(`MOVE_FAILED:${moved.error.message}`);
        }
      }

      const { data: pub } = supabase.storage.from("media").getPublicUrl(finalPath);

      // Optional: move video thumbnail if provided
      let thumbPath: string | null = null;
      let thumbUrl: string | null = null;
      if (item.kind === "video" && item.thumbnail_tmp_path) {
        if (!(item.thumbnail_tmp_path.startsWith("tmp/") || item.thumbnail_tmp_path.startsWith("uploads/tmp_"))) {
          throw new Error("INVALID_THUMB_TMP_PATH");
        }
        const thumbExt = safeExtFromName(item.thumbnail_tmp_path, ".jpg");
        const thumbFinal = `products/${productId}/video/thumbnail/${base}${thumbExt}`;
        const movedThumb = await supabase.storage.from("media").move(item.thumbnail_tmp_path, thumbFinal);
        if (movedThumb.error) {
          const msg = movedThumb.error.message || "";
          if (!msg.toLowerCase().includes("already exists")) {
            throw new Error(`MOVE_THUMB_FAILED:${movedThumb.error.message}`);
          }
        }
        const { data: tpub } = supabase.storage.from("media").getPublicUrl(thumbFinal);
        thumbPath = thumbFinal;
        thumbUrl = tpub.publicUrl;
      } else if (item.kind === "video" && item.thumbnail_url) {
        thumbUrl = item.thumbnail_url;
        thumbPath = item.thumbnail_url ? extractStoragePathFromPublicUrl(item.thumbnail_url) : null;
      }

      return { path: finalPath, url: pub.publicUrl, thumbnail_path: thumbPath, thumbnail_url: thumbUrl };
    }

    if (item.url) {
      const path = extractStoragePathFromPublicUrl(item.url);
      const tpath = item.thumbnail_url ? extractStoragePathFromPublicUrl(item.thumbnail_url) : null;
      return { path, url: item.url, thumbnail_path: tpath, thumbnail_url: item.thumbnail_url || null };
    }

    throw new Error("MISSING_MEDIA_SOURCE");
  }

  try {
    const resolvedNewImages: Array<{ path: string | null; url: string }> = [];
    for (const it of incomingImages) {
      resolvedNewImages.push(await resolveToFinal(it));
    }
    let resolvedNewVideo: { path: string | null; url: string; thumbnail_url?: string | null } | null = null;
    if (incomingVideos.length) {
      const src = incomingVideos[0];
      const main = await resolveToFinal(src);
      resolvedNewVideo = { path: main.path, url: main.url, thumbnail_url: main.thumbnail_url || null };
    }

    // Merge: keep existing order, append new at end.
    const mergedImages: StoredMediaItem[] = [
      ...existingImages.map((m) => ({ ...m })),
      ...resolvedNewImages.map((r) => ({ url: r.url, type: "image" as const, path: r.path, display_order: 0 })),
    ].slice(0, 10);

    const mergedVideo: StoredMediaItem | null = resolvedNewVideo
      ? {
          url: resolvedNewVideo.url,
          type: "video" as const,
          path: resolvedNewVideo.path,
          display_order: 0,
          thumbnail_url: resolvedNewVideo.thumbnail_url,
        }
      : existingVideo;

    // Normalize order + primary.
    let order = 1;
    const normalizedImages = mergedImages.map((img, idx) => ({
      ...img,
      display_order: order++,
      is_primary: idx === 0,
      thumbnail_url: idx === 0 ? img.url : img.thumbnail_url,
    }));

    const normalized: StoredMediaItem[] = mergedVideo
      ? [...normalizedImages, { ...mergedVideo, display_order: order++ }]
      : normalizedImages;

    const image_url = normalizedImages[0]?.url || (product as any).image_url || null;
    const thumbnail_url = normalizedImages[0]?.url || (product as any).thumbnail_url || null;
    const video_url = mergedVideo?.url || (product as any).video_url || null;

    const { error: uErr } = await supabase
      .from("products")
      .update({
        media: normalized,
        image_url,
        thumbnail_url,
        video_url,
        updated_at: new Date().toISOString(),
      })
      .eq("id", productId);

    if (uErr) {
      return NextResponse.json({ ok: false, error: "UPDATE_FAILED", detail: uErr.message }, { status: 500 });
    }

    // Best-effort audit (Phase B5 will formalize).
    await writeAuditLog({
      actorId: gate.userId,
      action: "product.media.commit",
      target: { type: "products", id: productId },
      meta: {
        added: { images: resolvedNewImages.length, video: resolvedNewVideo ? 1 : 0 },
        totals: { images: normalizedImages.length, video: mergedVideo ? 1 : 0 },
      },
    }).catch(() => null);

    return NextResponse.json({ ok: true, image_url, thumbnail_url, video_url, media: normalized });
  } catch (e: any) {
    const msg = e?.message || String(e);
    return NextResponse.json({ ok: false, error: "COMMIT_FAILED", detail: msg }, { status: 500 });
  }
}

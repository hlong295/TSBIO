import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminRole } from "@/lib/admin/require-role";

type IncomingMedia = {
  kind: "image" | "video";
  // One of these must exist:
  tmp_path?: string;
  url?: string;
  name?: string;
};

function extractStoragePathFromPublicUrl(publicUrl: string): string | null {
  // Typical public URL:
  // .../storage/v1/object/public/media/<path>
  const marker = "/storage/v1/object/public/media/";
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(publicUrl.slice(idx + marker.length));
}

function safeExtFromName(name: string, fallback: string) {
  const m = name.toLowerCase().match(/\.[a-z0-9]+$/);
  return m ? m[0] : fallback;
}

export async function POST(req: Request, ctx: { params: { id: string } }) {
  const gate = await requireAdminRole(req, ["root_admin", "admin", "editor"]);
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error, detail: gate.detail }, { status: gate.status });
  }

  const productId = ctx.params.id;
  const body = (await req.json().catch(() => null)) as
    | { items?: IncomingMedia[] }
    | null;
  const items = body?.items ?? [];

  const images = items.filter((x) => x.kind === "image");
  const videos = items.filter((x) => x.kind === "video");
  if (videos.length > 1) {
    return NextResponse.json({ ok: false, error: "TOO_MANY_VIDEOS" }, { status: 400 });
  }
  if (images.length > 10) {
    return NextResponse.json({ ok: false, error: "TOO_MANY_IMAGES" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  // Load current product media to merge safely.
  const { data: product, error: pErr } = await supabase
    .from("products")
    .select("id, image_url, video_url, media")
    .eq("id", productId)
    .maybeSingle();

  if (pErr || !product) {
    return NextResponse.json({ ok: false, error: "PRODUCT_NOT_FOUND", detail: pErr?.message }, { status: 404 });
  }

  const finalMedia: Array<{ url: string; type: "image" | "video"; display_order: number; thumbnail_url?: string }> = Array.isArray(product.media)
    ? (product.media as any[])
        .filter((m) => m && (m.type === "image" || m.type === "video") && typeof m.url === "string")
        .slice()
    : [];

  // Helper: move tmp object to final path and return public URL.
  async function resolveToFinal(item: IncomingMedia, order: number) {
    if (item.tmp_path) {
      if (!item.tmp_path.startsWith("tmp/")) {
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
        // If move fails because destination exists (rare), try to keep destination and remove tmp.
        // We keep this best-effort and idempotent-friendly.
        const msg = moved.error.message || "";
        if (!msg.toLowerCase().includes("already exists")) {
          throw new Error(`MOVE_FAILED:${moved.error.message}`);
        }
      }

      const { data: pub } = supabase.storage.from("media").getPublicUrl(finalPath);
      return { path: finalPath, url: pub.publicUrl, order };
    }

    if (item.url) {
      const path = extractStoragePathFromPublicUrl(item.url);
      // If it's not our Storage public URL, we still allow storing the URL.
      return { path: path || null, url: item.url, order };
    }

    throw new Error("MISSING_MEDIA_SOURCE");
  }

  // Resolve new items first.
  const resolvedImages: Array<{ url: string; path: string | null; order: number }> = [];
  for (let i = 0; i < images.length; i++) {
    const r = await resolveToFinal(images[i], i);
    resolvedImages.push(r);
  }
  const resolvedVideo = videos.length ? await resolveToFinal(videos[0], 0) : null;

  // Merge: keep existing images/videos, but enforce limits.
  const existingImages = finalMedia.filter((m) => m.type === "image");
  const existingVideo = finalMedia.find((m) => m.type === "video") || null;

  const nextImages = [...existingImages, ...resolvedImages.map((r) => ({ url: r.url, type: "image" as const, display_order: 0 }))].slice(0, 10);
  const nextVideo = resolvedVideo
    ? { url: resolvedVideo.url, type: "video" as const, display_order: 0 }
    : existingVideo;

  // Reassign display_order and thumbnail.
  let order = 0;
  const normalizedImages = nextImages.map((img) => ({ ...img, display_order: order++ }));
  const imagesWithThumb = normalizedImages.map((img, idx) => ({
    ...img,
    thumbnail_url: idx === 0 ? img.url : img.thumbnail_url,
  }));

  const newMedia = nextVideo ? [...imagesWithThumb, { ...nextVideo, display_order: 0 }] : imagesWithThumb;

  const image_url = imagesWithThumb[0]?.url || product.image_url || null;
  const video_url = nextVideo?.url || product.video_url || null;

  const { error: uErr } = await supabase
    .from("products")
    .update({
      media: newMedia,
      image_url,
      video_url,
      updated_at: new Date().toISOString(),
    })
    .eq("id", productId);

  // Best-effort: mirror media into `product_media` table (if exists).
  // Do not fail the request if this table is missing or RLS blocks it.
  try {
    // Replace all existing rows for this product to match the current media array order.
    await supabase.from("product_media").delete().eq("product_id", productId);

    const rows = (newMedia || []).map((m: any, i: number) => ({
      product_id: productId,
      media_url: m?.url || null,
      media_type: m?.type || null,
      display_order: typeof m?.display_order === "number" ? m.display_order : i,
      is_primary: !!m?.is_primary,
    })).filter((r: any) => !!r.media_url);

    if (rows.length) {
      await supabase.from("product_media").insert(rows);
    }
  } catch {
    // ignore
  }

  if (uErr) {
    return NextResponse.json({ ok: false, error: "UPDATE_FAILED", detail: uErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    image_url,
    video_url,
    media: newMedia,
  });
}

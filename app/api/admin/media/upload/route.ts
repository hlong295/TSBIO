import { NextResponse } from "next/server";

import { requireRootAdmin } from "@/lib/admin/require-root";
import { writeAuditLog } from "@/lib/admin/audit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { slugify } from "@/lib/slug";
import { ensureStorageBucket } from "@/lib/media/ensure-bucket";

export const dynamic = "force-dynamic";

const BUCKET = "media";

function pickExt(name: string): string {
  const m = name.match(/\.([a-zA-Z0-9]{1,8})$/);
  if (!m) return "";
  return m[1].toLowerCase();
}

export async function POST(req: Request) {
  try {
    const { profile } = await requireRootAdmin(req);

    const url = new URL(req.url);
    const folder = (url.searchParams.get("folder") || "banners").trim() || "banners";

    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "INVALID_FILE" }, { status: 400 });
    }

    // Allow images only for banner.
    if (!file.type?.startsWith("image/")) {
      return NextResponse.json({ error: "INVALID_FILE_TYPE" }, { status: 400 });
    }

    const ext = pickExt(file.name) || (file.type.split("/")[1] || "jpg");
    const base = slugify(file.name.replace(/\.[^/.]+$/, "")).slice(0, 60) || "banner";
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const path = `${folder}/${ts}-${base}.${ext}`;

    const supabase = getSupabaseAdmin();
    await ensureStorageBucket(BUCKET, { public: true });
    const bytes = new Uint8Array(await file.arrayBuffer());

    const up = await supabase.storage.from(BUCKET).upload(path, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
      cacheControl: "3600",
    });

    if (up.error) {
      return NextResponse.json(
        { error: "UPLOAD_FAILED", details: up.error.message },
        { status: 500 }
      );
    }

    const pub = supabase.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = pub.data.publicUrl;

    await writeAuditLog({
      actor_profile_id: profile.id,
      action: "media.upload",
      target: `storage:${BUCKET}:${path}`,
      meta: { folder, contentType: file.type, size: file.size },
    });

    return NextResponse.json({ ok: true, path, publicUrl });
  } catch (e: any) {
    const msg = e?.message || String(e);
    if (msg.includes("FORBIDDEN")) {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    return NextResponse.json({ error: "UPLOAD_CRASH", details: msg }, { status: 500 });
  }
}

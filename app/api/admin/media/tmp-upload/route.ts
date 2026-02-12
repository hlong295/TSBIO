import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminRole } from "@/lib/admin/require-role";
import { ensureStorageBucket } from "@/lib/media/ensure-bucket";

function sanitizeName(name: string) {
  // Keep it simple and safe for paths.
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]+/g, "")
    .slice(0, 80);
}

function extFromName(name: string) {
  const i = name.lastIndexOf(".");
  if (i === -1) return "";
  return name.slice(i + 1).toLowerCase();
}

function publicUrlFor(admin: any, path: string) {
  // Bucket is configured public in ensureStorageBucket(). Use Supabase public URL.
  try {
    const { data } = admin.storage.from("media").getPublicUrl(path);
    return data?.publicUrl || "";
  } catch {
    return "";
  }
}

/**
 * POST form-data:
 * - file: File
 * Query:
 * - kind=image|video
 */
export async function POST(req: Request) {
  const gate = await requireAdminRole(req, ["admin", "editor", "provider", "approval"]);
  if (!gate.ok) return NextResponse.json(gate, { status: gate.status });

  const url = new URL(req.url);
  const kind = (url.searchParams.get("kind") || "").toLowerCase();
  if (kind !== "image" && kind !== "video") {
    return NextResponse.json({ ok: false, error: "INVALID_KIND" }, { status: 400 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "MISSING_FILE" }, { status: 400 });
  }

  // Basic size limits (kept conservative for Pi Browser reliability).
  const maxImageBytes = 8 * 1024 * 1024; // 8MB
  const maxVideoBytes = 80 * 1024 * 1024; // 80MB
  if (kind === "image" && file.size > maxImageBytes) {
    return NextResponse.json({ ok: false, error: "FILE_TOO_LARGE", detail: "Max 8MB per image" }, { status: 400 });
  }
  if (kind === "video" && file.size > maxVideoBytes) {
    return NextResponse.json({ ok: false, error: "FILE_TOO_LARGE", detail: "Max 80MB for video" }, { status: 400 });
  }

  const original = file.name || `${kind}`;
  const safeName = sanitizeName(original) || `${kind}.${extFromName(original) || "bin"}`;
  const ext = extFromName(safeName);

  // Very light validation.
  if (kind === "image" && !/^image\//.test(file.type)) {
    return NextResponse.json({ ok: false, error: "INVALID_IMAGE" }, { status: 400 });
  }
  if (kind === "video" && !/^video\//.test(file.type)) {
    return NextResponse.json({ ok: false, error: "INVALID_VIDEO" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  // Ensure bucket exists and is public (CDN-friendly public URLs).
  await ensureStorageBucket("media", { public: true });
  // NOTE: Media library (GET /api/admin/media/list) uses a non-recursive list(prefix).
  // To make temp uploads visible in the library (default prefix: "uploads/"),
  // store temp objects directly under "uploads/" as flat paths.
  const userId = gate.profile?.id || "unknown";
  const ts = Date.now();
  const rnd = Math.random().toString(16).slice(2);
  const path = `uploads/tmp_${userId}_${kind}_${ts}_${rnd}.${ext || "bin"}`;

  const buf = new Uint8Array(await file.arrayBuffer());
  // Cache temp objects briefly; final objects will get longer cache on commit.
  const { error } = await admin.storage.from("media").upload(path, buf, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
    cacheControl: "3600",
  });

  if (error) {
    return NextResponse.json({ ok: false, error: "UPLOAD_FAILED", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    item: {
      kind,
      path,
      url: publicUrlFor(admin, path),
      name: original,
      contentType: file.type,
      size: file.size,
    },
  });
}

export async function DELETE(req: Request) {
  const gate = await requireAdminRole(req, ["admin", "editor", "provider", "approval"]);
  if (!gate.ok) {
    return NextResponse.json({ ok: false, error: gate.error, detail: gate.detail }, { status: gate.status });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get("path") || "";
  // Only allow deleting temp objects created by this profile.
  // Temp paths are flat under uploads/.
  if (!path || !path.startsWith(`uploads/tmp_${gate.profile.id}_`)) {
    return NextResponse.json({ ok: false, error: "INVALID_PATH" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.storage.from("media").remove([path]);
  if (error) {
    return NextResponse.json({ ok: false, error: "TMP_DELETE_FAILED", detail: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

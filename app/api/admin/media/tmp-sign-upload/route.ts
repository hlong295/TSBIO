import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminRole } from "@/lib/admin/require-role";
import { ensureStorageBucket } from "@/lib/media/ensure-bucket";

const BUCKET = "media";

function sanitizeName(name: string) {
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
  try {
    const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
    return data?.publicUrl || "";
  } catch {
    return "";
  }
}

/**
 * Signed upload for TEMP objects (used by Product Create flow).
 *
 * Why: uploading videos via Next Route Handlers using formData can hit
 * hosting body-size limits (often returned as plain text like "Request ..."),
 * causing JSON parse errors on the client. Signed upload streams directly to
 * Supabase Storage and still stays within the "server-guarded" architecture.
 *
 * POST JSON:
 *  - filename: string
 *  - kind: "image" | "video"
 */
export async function POST(req: Request) {
  const gate = await requireAdminRole(req, ["admin", "editor", "provider", "approval"]);
  if (!gate.ok) return NextResponse.json(gate, { status: gate.status });

  const body = await req.json().catch(() => null);
  const kind = String(body?.kind || "").toLowerCase();
  const filename = String(body?.filename || "");
  if ((kind !== "image" && kind !== "video") || !filename) {
    return NextResponse.json({ ok: false, error: "VALIDATION_ERROR" }, { status: 400 });
  }

  const safeName = sanitizeName(filename) || `${kind}.${extFromName(filename) || "bin"}`;
  const ext = extFromName(safeName);

  const admin = getSupabaseAdmin();
  await ensureStorageBucket(BUCKET, { public: true });

  // NOTE: Media library lists only one-level deep for the prefix (non-recursive).
  // To ensure items uploaded from Product Create appear in the library (prefix: "uploads/"),
  // we store temp objects directly under "uploads/" (flat paths).
  const userId = gate.profile?.id || "unknown";
  const ts = Date.now();
  const rnd = Math.random().toString(16).slice(2);
  const path = `uploads/tmp_${userId}_${kind}_${ts}_${rnd}.${ext || "bin"}`;

  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ ok: false, error: "SIGNED_UPLOAD_FAILED", detail: error?.message || null }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    item: {
      kind,
      path,
      url: publicUrlFor(admin, path),
      signedUrl: data.signedUrl,
      token: data.token,
    },
  });
}

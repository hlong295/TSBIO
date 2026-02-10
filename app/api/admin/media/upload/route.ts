import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/require-role";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Server-side upload endpoint (admin only).
 *
 * Why: On Pi Browser / iOS WebViews, signed-url PUT uploads can silently fail.
 * This route uploads using the Supabase admin client (service role), so the client
 * only talks to our own domain.
 *
 * FormData fields:
 * - file: File (required)
 * - folder: string (optional) e.g. "uploads" (default)
 * - prefix: string (optional) e.g. "20260210" or "products/<id>" (default: YYYYMMDD)
 */
export async function POST(req: Request) {
  const guard = await requireAdminRole(req, ["editor", "approval", "provider"]);
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "MISSING_FILE" }, { status: 400 });
    }

    const folderRaw = String(form.get("folder") || "uploads");
    const folder = folderRaw.replace(/^\/+|\/+$/g, "");

    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const defaultPrefix = `${y}${m}${d}`;

    const prefixRaw = String(form.get("prefix") || defaultPrefix);
    const prefix = prefixRaw.replace(/^\/+|\/+$/g, "");

    const safeName = (file.name || "file")
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    const rand = Math.random().toString(36).slice(2, 8);
    const path = `${folder}/${prefix}/${Date.now()}_${rand}_${safeName}`;

    const supabase = getSupabaseAdmin();
    const arr = new Uint8Array(await file.arrayBuffer());

    const { error } = await supabase.storage.from("media").upload(path, arr, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

    if (error) {
      return NextResponse.json(
        {
          error: "UPLOAD_FAILED",
          detail: error.message,
        },
        { status: 500 }
      );
    }

    const { data: pub } = supabase.storage.from("media").getPublicUrl(path);

    return NextResponse.json({ ok: true, path, url: pub?.publicUrl || null });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "UPLOAD_EXCEPTION",
        detail: e?.message || String(e),
      },
      { status: 500 }
    );
  }
}

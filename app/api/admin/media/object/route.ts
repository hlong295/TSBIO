import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminRole } from "@/lib/admin/require-role";

// Admin-only media object management for Supabase Storage bucket "media".
// - DELETE /api/admin/media/object?path=uploads%2F...
// - PATCH  /api/admin/media/object  { from: string, to: string }

function normPath(p: string) {
  return (p || "").trim().replace(/^\/+/, "");
}

function isSafePath(p: string) {
  if (!p) return false;
  if (p.includes("..")) return false;
  if (p.startsWith("http://") || p.startsWith("https://")) return false;
  return true;
}

export async function DELETE(req: Request) {
  const auth = await requireAdminRole(req, ["root_admin", "admin"]);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }

  const url = new URL(req.url);
  const path = normPath(url.searchParams.get("path") || "");
  if (!isSafePath(path)) {
    return NextResponse.json({ ok: false, error: "INVALID_PATH" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from("media").remove([path]);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const auth = await requireAdminRole(req, ["root_admin", "admin"]);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: 401 });
  }

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const from = normPath(body?.from || "");
  const to = normPath(body?.to || "");

  if (!isSafePath(from) || !isSafePath(to)) {
    return NextResponse.json({ ok: false, error: "INVALID_PATH" }, { status: 400 });
  }
  if (from === to) return NextResponse.json({ ok: true });

  const supabase = getSupabaseAdmin();
  const bucket: any = (supabase.storage as any).from("media");

  // Prefer move if supported, fallback to copy+remove.
  if (typeof bucket.move === "function") {
    const { error } = await bucket.move(from, to);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  if (typeof bucket.copy === "function") {
    const { error: copyErr } = await bucket.copy(from, to);
    if (copyErr) {
      return NextResponse.json({ ok: false, error: copyErr.message }, { status: 400 });
    }
    const { error: delErr } = await bucket.remove([from]);
    if (delErr) {
      return NextResponse.json({ ok: false, error: delErr.message }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: "STORAGE_MOVE_UNSUPPORTED" }, { status: 400 });
}

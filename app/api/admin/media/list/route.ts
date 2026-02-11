import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireAdminRole } from "@/lib/admin/require-role";
import { ensureStorageBucket } from "@/lib/media/ensure-bucket";

const BUCKET = "media";

export async function GET(req: Request) {
  // Media library is used across multiple admin modules (products, CMS...).
  // Allow all admin-capable roles. Root always passes.
  const guard = await requireAdminRole(req, ["admin", "editor", "provider", "approval"]);
  if (!guard.ok) {
    return NextResponse.json({ error: guard.error, detail: guard.detail }, { status: guard.status });
  }
  const url = new URL(req.url);
  const prefix = (url.searchParams.get("prefix") || "uploads/").toString();
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 30)));

  const admin = getSupabaseAdmin();
  await ensureStorageBucket(BUCKET, { public: true });
  const { data, error } = await admin.storage.from(BUCKET).list(prefix, { limit, sortBy: { column: "created_at", order: "desc" } });
  if (error) return NextResponse.json({ error: "LIST_FAILED", detail: error.message }, { status: 500 });
  return NextResponse.json({ bucket: BUCKET, prefix, items: data || [] });
}

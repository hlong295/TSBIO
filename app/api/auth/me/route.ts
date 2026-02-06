import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getUserFromBearer } from "@/lib/supabase/server-auth";

export async function GET(req: Request) {
  try {
    const { user } = await getUserFromBearer(req);
    if (!user) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const admin = getSupabaseAdmin();

    const { data: profile, error: pErr } = await admin
      .from("profiles")
      .select("id, username, role, level, full_name, created_at, updated_at")
      .eq("id", user.id)
      .maybeSingle();

    if (pErr) {
      return NextResponse.json({ error: "DB_ERROR", detail: pErr.message }, { status: 500 });
    }

    const { data: wallet, error: wErr } = await admin
      .from("tsb_wallets")
      .select("id, profile_id, balance, locked, created_at, updated_at")
      .eq("profile_id", user.id)
      .maybeSingle();

    if (wErr) {
      return NextResponse.json({ error: "DB_ERROR", detail: wErr.message }, { status: 500 });
    }

    return NextResponse.json({
      auth: {
        id: user.id,
        email: user.email,
        email_confirmed_at: (user as any).email_confirmed_at || null,
      },
      profile: profile || null,
      wallet: wallet || null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "ME_FAILED", message: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

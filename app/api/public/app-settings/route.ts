import { NextResponse } from "next/server";

import { getHomeHeroSettings } from "@/lib/app-settings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const hero = await getHomeHeroSettings();
  const res = NextResponse.json({ hero });
  // Always serve the newest settings right after admin updates.
  res.headers.set("Cache-Control", "no-store, max-age=0");
  return res;
}

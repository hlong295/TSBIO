import { NextResponse } from "next/server";

// Root admin Pi UID (provided by owner). Do NOT change unless you intend to rotate root access.
const ROOT_PI_UID = "ce691dfb-749a-4074-a221-53360ca3c64a";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const accessToken = body?.accessToken;
    const user = body?.user;

    if (!accessToken || !user?.uid || !user?.username) {
      return NextResponse.json(
        { error: "INVALID_PAYLOAD", message: "Missing accessToken or user fields." },
        { status: 400 }
      );
    }

    // Minimal auth “sync” for v0:
    // - Trust Pi SDK in Pi Browser (client already authenticated).
    // - Return role based on Pi UID.
    const role = user.uid === ROOT_PI_UID ? "admin" : "user";

    return NextResponse.json({
      uid: user.uid,
      username: user.username,
      accessToken,
      role,
      createdAt: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "PI_LOGIN_FAILED", message: e?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { timingSafeEqual, createHash } from "crypto";

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  }

  const { password } = body as { password?: string };

  if (typeof password !== "string" || password.length === 0) {
    return NextResponse.json({ error: "Ongeldig wachtwoord" }, { status: 401 });
  }

  const appPassword = process.env.APP_PASSWORD;

  if (!appPassword) {
    console.error("APP_PASSWORD environment variable is not set");
    return NextResponse.json({ error: "Server configuratiefout" }, { status: 500 });
  }

  // Timing-safe comparison: hash both values so lengths are always equal
  const inputHash = createHash("sha256").update(password).digest();
  const expectedHash = createHash("sha256").update(appPassword).digest();

  const isValid = timingSafeEqual(inputHash, expectedHash);

  if (!isValid) {
    return NextResponse.json({ error: "Ongeldig wachtwoord" }, { status: 401 });
  }

  const sessionSecret = process.env.SESSION_SECRET;

  if (!sessionSecret) {
    console.error("SESSION_SECRET environment variable is not set");
    return NextResponse.json({ error: "Server configuratiefout" }, { status: 500 });
  }

  const secret = new TextEncoder().encode(sessionSecret);

  const token = await new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  const isProduction = process.env.NODE_ENV === "production";

  const response = NextResponse.json({ success: true });

  response.cookies.set("nucleus-session", token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days in seconds
  });

  return response;
}

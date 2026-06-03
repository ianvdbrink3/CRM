import { NextRequest, NextResponse } from "next/server";
import { createUserWithProfile, getTotalUserCount } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// POST /api/auth/setup
// Creates the very first owner account. Blocked once any user exists.
export async function POST(request: NextRequest) {
  // Only allowed when no users exist yet
  const count = await getTotalUserCount();
  if (count > 0) {
    return NextResponse.json(
      { error: "Setup is al voltooid" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  }

  const { email, password, displayName } = body as {
    email?: string;
    password?: string;
    displayName?: string;
  };

  if (
    typeof email !== "string" ||
    !email.includes("@") ||
    typeof password !== "string" ||
    password.length < 8 ||
    typeof displayName !== "string" ||
    displayName.trim().length < 2
  ) {
    return NextResponse.json(
      {
        error:
          "E-mailadres, naam (min. 2 tekens) en wachtwoord (min. 8 tekens) zijn verplicht",
      },
      { status: 400 }
    );
  }

  try {
    await createUserWithProfile({
      email,
      password,
      displayName: displayName.trim(),
      role: "owner",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Auto sign in after setup
  const cookieStore = await cookies();
  const response = NextResponse.json({ success: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  await supabase.auth.signInWithPassword({ email, password });
  return response;
}

// GET /api/auth/setup - check if setup is needed
export async function GET() {
  const count = await getTotalUserCount();
  return NextResponse.json({ needsSetup: count === 0 });
}

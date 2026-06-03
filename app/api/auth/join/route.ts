import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUserWithProfile } from "@/lib/auth";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// GET /api/auth/join?token=<token> - validate invite token
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ valid: false, error: "Token ontbreekt" });
  }

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("invitations")
    .select("id, email, role, expires_at, used_at")
    .eq("token", token)
    .single();

  if (!invite) {
    return NextResponse.json({ valid: false, error: "Invite niet gevonden" });
  }

  const inv = invite as {
    id: string;
    email: string | null;
    role: string;
    expires_at: string;
    used_at: string | null;
  };

  if (inv.used_at) {
    return NextResponse.json({ valid: false, error: "Invite is al gebruikt" });
  }
  if (new Date(inv.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: "Invite is verlopen" });
  }

  return NextResponse.json({
    valid: true,
    email: inv.email,
    role: inv.role,
  });
}

// POST /api/auth/join - register via invite
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  }

  const { token, email, password, displayName } = body as {
    token?: string;
    email?: string;
    password?: string;
    displayName?: string;
  };

  if (!token) {
    return NextResponse.json({ error: "Token ontbreekt" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Validate invite
  const { data: invite } = await admin
    .from("invitations")
    .select("id, email, role, expires_at, used_at")
    .eq("token", token)
    .single();

  if (!invite) {
    return NextResponse.json({ error: "Ongeldige invite" }, { status: 400 });
  }

  const inv = invite as {
    id: string;
    email: string | null;
    role: string;
    expires_at: string;
    used_at: string | null;
  };

  if (inv.used_at) {
    return NextResponse.json({ error: "Invite is al gebruikt" }, { status: 400 });
  }
  if (new Date(inv.expires_at) < new Date()) {
    return NextResponse.json({ error: "Invite is verlopen" }, { status: 400 });
  }

  // Validate inputs
  const finalEmail = inv.email ?? email;
  if (
    typeof finalEmail !== "string" ||
    !finalEmail.includes("@") ||
    typeof password !== "string" ||
    password.length < 8 ||
    typeof displayName !== "string" ||
    displayName.trim().length < 2
  ) {
    return NextResponse.json(
      { error: "E-mail, naam (min. 2) en wachtwoord (min. 8 tekens) verplicht" },
      { status: 400 }
    );
  }

  let newUser;
  try {
    newUser = await createUserWithProfile({
      email: finalEmail,
      password,
      displayName: displayName.trim(),
      role: inv.role as "owner" | "admin" | "employee",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // Mark invite as used
  await admin
    .from("invitations")
    .update({ used_at: new Date().toISOString(), used_by: newUser.id } as never)
    .eq("id", inv.id);

  // Auto sign in
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

  await supabase.auth.signInWithPassword({ email: finalEmail, password });
  return response;
}

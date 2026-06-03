import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// POST /api/auth/invite - create an invite token
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  let body: { role?: string; email?: string } = {};
  try {
    body = await request.json();
  } catch {
    // body is optional
  }

  const role = body.role ?? "owner";
  if (!["owner", "admin", "employee"].includes(role)) {
    return NextResponse.json({ error: "Ongeldige rol" }, { status: 400 });
  }

  // Check max user limit (2 for now)
  const admin = createAdminClient();
  const { data: usersData } = await admin.auth.admin.listUsers();
  if ((usersData?.users?.length ?? 0) >= 2) {
    return NextResponse.json(
      { error: "Maximum aantal gebruikers (2) bereikt" },
      { status: 403 }
    );
  }

  // Expire old unused invites from this user
  await supabase
    .from("invitations")
    .update({ used_at: new Date().toISOString() } as never)
    .eq("created_by", user.id)
    .is("used_at", null);

  const { data: invite, error } = await supabase
    .from("invitations")
    .insert({
      role,
      email: body.email ?? null,
      created_by: user.id,
    } as never)
    .select("token, expires_at")
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: "Kon invite niet aanmaken" }, { status: 500 });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ??
    `https://${request.headers.get("host")}`;

  return NextResponse.json({
    token: (invite as { token: string; expires_at: string }).token,
    url: `${baseUrl}/join?token=${(invite as { token: string }).token}`,
    expiresAt: (invite as { expires_at: string }).expires_at,
  });
}

// GET /api/auth/invite - list active invites
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { data } = await supabase
    .from("invitations")
    .select("id, token, email, role, expires_at, used_at, created_at")
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  return NextResponse.json({ invites: data ?? [] });
}

// DELETE /api/auth/invite?id=<uuid> - revoke invite
export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id vereist" }, { status: 400 });
  }

  await supabase
    .from("invitations")
    .delete()
    .eq("id", id)
    .eq("created_by", user.id);

  return NextResponse.json({ success: true });
}

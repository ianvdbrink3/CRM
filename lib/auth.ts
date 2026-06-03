import { createServerSupabaseClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";
import type { UserProfile } from "./supabase/types";

export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data ?? null;
}

export async function getTotalUserCount(): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("user_profiles")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

export async function createUserWithProfile(opts: {
  email: string;
  password: string;
  displayName: string;
  role: "owner" | "admin" | "employee";
}) {
  const admin = createAdminClient();

  const { data: authData, error: authError } =
    await admin.auth.admin.createUser({
      email: opts.email,
      password: opts.password,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    throw new Error(authError?.message ?? "Failed to create user");
  }

  const initials = opts.displayName
    .split(" ")
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  const COLORS = ["#5B6CFF", "#0A84FF", "#30D158", "#FF9F0A", "#FF453A"];
  const avatarColor = COLORS[Math.floor(Math.random() * COLORS.length)];

  const { error: profileError } = await admin
    .from("user_profiles")
    .insert({
      id: authData.user.id,
      email: opts.email,
      display_name: opts.displayName,
      initials,
      role: opts.role,
      avatar_color: avatarColor,
    } as never);

  if (profileError) {
    // Rollback: delete the auth user
    await admin.auth.admin.deleteUser(authData.user.id);
    throw new Error(profileError.message);
  }

  return authData.user;
}

export async function getTeamMembers(): Promise<UserProfile[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("user_profiles")
    .select("*")
    .order("created_at");
  return data ?? [];
}

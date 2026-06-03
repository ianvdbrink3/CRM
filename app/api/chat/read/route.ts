import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const now = new Date().toISOString();

  await supabase
    .from("chat_read_status")
    .upsert({ user_id: user.id, last_read_at: now } as never, {
      onConflict: "user_id",
    });

  return NextResponse.json({ success: true });
}

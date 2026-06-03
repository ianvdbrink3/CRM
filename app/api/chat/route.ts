import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

// GET /api/chat?cursor=<iso-date>&limit=50
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const limit = Math.min(Number(params.get("limit") ?? 50), 100);
  const cursor = params.get("cursor");

  let query = supabase
    .from("chat_messages")
    .select(`
      id,
      content,
      created_at,
      edited_at,
      sender_id,
      user_profiles!inner(display_name, initials, avatar_color)
    `)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ messages: (data ?? []).reverse() });
}

// POST /api/chat - send message
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  }

  const { content } = body as { content?: string };
  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Bericht mag niet leeg zijn" }, { status: 400 });
  }
  if (content.trim().length > 4000) {
    return NextResponse.json({ error: "Bericht te lang (max 4000 tekens)" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .insert({ sender_id: user.id, content: content.trim() } as never)
    .select("id, content, created_at, sender_id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: data });
}

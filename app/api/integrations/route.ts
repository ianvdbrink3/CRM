import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { decryptObject, maskCredentials } from "@/lib/encryption";

// GET /api/integrations - returns all providers with masked credentials
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { data } = await supabase
    .from("integrations")
    .select("id, provider, credential_fields, status, tested_at, error_message, updated_at");

  return NextResponse.json({ integrations: data ?? [] });
}

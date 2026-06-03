import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { encryptObject } from "@/lib/encryption";

const VALID_PROVIDERS = [
  "meta_ads",
  "shopify",
  "claude",
  "openai",
  "google_ads",
  "google_analytics",
] as const;

type Provider = (typeof VALID_PROVIDERS)[number];

const REQUIRED_FIELDS: Record<Provider, string[]> = {
  meta_ads: ["app_id", "app_secret", "access_token", "ad_account_id"],
  shopify: ["store_url", "admin_api_token", "api_key", "api_secret"],
  claude: ["api_key"],
  openai: ["api_key"],
  google_ads: ["client_id", "client_secret", "developer_token", "refresh_token"],
  google_analytics: ["property_id", "service_account_json"],
};

// PUT /api/integrations/[provider] - save credentials
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  if (!VALID_PROVIDERS.includes(provider as Provider)) {
    return NextResponse.json({ error: "Onbekende provider" }, { status: 400 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
  }

  const credentials = body as Record<string, string>;
  const required = REQUIRED_FIELDS[provider as Provider];
  const missing = required.filter((f) => !credentials[f]?.trim());
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Verplichte velden ontbreken: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  const encrypted = encryptObject(
    Object.fromEntries(required.map((f) => [f, credentials[f].trim()]))
  );

  const { error } = await supabase
    .from("integrations")
    .upsert(
      {
        provider,
        encrypted_credentials: encrypted,
        credential_fields: required,
        status: "disconnected",
        created_by: user.id,
      } as never,
      { onConflict: "provider" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/integrations/[provider]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  await supabase.from("integrations").delete().eq("provider", provider);

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { decryptObject } from "@/lib/encryption";

async function testMetaAds(creds: Record<string, string>) {
  const res = await fetch(
    `https://graph.facebook.com/v21.0/me?access_token=${creds.access_token}`,
    { signal: AbortSignal.timeout(8000) }
  );
  const json = await res.json() as { id?: string; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  return `Verbonden als ID ${json.id}`;
}

async function testShopify(creds: Record<string, string>) {
  const storeUrl = creds.store_url.replace(/\/$/, "");
  const url = `${storeUrl.startsWith("https") ? storeUrl : `https://${storeUrl}`}/admin/api/2024-01/shop.json`;
  const res = await fetch(url, {
    headers: { "X-Shopify-Access-Token": creds.admin_api_token },
    signal: AbortSignal.timeout(8000),
  });
  const json = await res.json() as { shop?: { name: string }; errors?: string };
  if (!res.ok || json.errors) throw new Error(json.errors ?? "Verbinding mislukt");
  return `Verbonden met ${json.shop?.name}`;
}

async function testClaude(creds: Record<string, string>) {
  const res = await fetch("https://api.anthropic.com/v1/models", {
    headers: {
      "x-api-key": creds.api_key,
      "anthropic-version": "2023-06-01",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error("Ongeldige API key");
  return "Claude API key geldig";
}

async function testOpenAI(creds: Record<string, string>) {
  const res = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${creds.api_key}` },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error("Ongeldige API key");
  return "OpenAI API key geldig";
}

const TESTERS: Record<string, (c: Record<string, string>) => Promise<string>> = {
  meta_ads: testMetaAds,
  shopify: testShopify,
  claude: testClaude,
  openai: testOpenAI,
  google_ads: async () => "Google Ads verbindingstest niet beschikbaar (vereist OAuth flow)",
  google_analytics: async () => "Google Analytics verbindingstest niet beschikbaar (vereist OAuth flow)",
};

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { data: integration } = await supabase
    .from("integrations")
    .select("encrypted_credentials")
    .eq("provider", provider)
    .single();

  if (!integration || !(integration as { encrypted_credentials: string | null }).encrypted_credentials) {
    return NextResponse.json({ error: "Geen credentials opgeslagen" }, { status: 400 });
  }

  let creds: Record<string, string>;
  try {
    creds = decryptObject((integration as { encrypted_credentials: string }).encrypted_credentials);
  } catch {
    return NextResponse.json({ error: "Decryptie mislukt" }, { status: 500 });
  }

  const tester = TESTERS[provider];
  if (!tester) {
    return NextResponse.json({ error: "Onbekende provider" }, { status: 400 });
  }

  let status: "connected" | "error";
  let message: string;

  try {
    message = await tester(creds);
    status = "connected";
  } catch (err) {
    message = err instanceof Error ? err.message : "Verbinding mislukt";
    status = "error";
  }

  await supabase
    .from("integrations")
    .update({
      status,
      tested_at: new Date().toISOString(),
      error_message: status === "error" ? message : null,
    } as never)
    .eq("provider", provider);

  return NextResponse.json({ status, message });
}

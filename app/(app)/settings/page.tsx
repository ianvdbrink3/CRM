"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Moon, Sun, LogOut, Copy, Check, RefreshCw, Trash2,
  ChevronRight, Eye, EyeOff, Shield, Users, Plug, Palette,
  Info, Link as LinkIcon, CheckCircle, XCircle, Clock,
  AlertCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/providers/ThemeProvider";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  initials: string;
  role: string;
  avatar_color: string;
  created_at: string;
}

interface Invite {
  id: string;
  token: string;
  email: string | null;
  role: string;
  expires_at: string;
  created_at: string;
}

interface Integration {
  id: string;
  provider: string;
  credential_fields: string[];
  status: "connected" | "disconnected" | "error";
  tested_at: string | null;
  error_message: string | null;
  updated_at: string;
}

// ─── Integration config ───────────────────────────────────────────────────────

const INTEGRATIONS_CONFIG = [
  {
    provider: "meta_ads",
    label: "Meta Ads",
    description: "Importeer campagnedata, ROAS en CPA automatisch",
    icon: "📣",
    fields: [
      { key: "app_id", label: "App ID", placeholder: "123456789" },
      { key: "app_secret", label: "App Secret", placeholder: "••••••••••••••••", secret: true },
      { key: "access_token", label: "Access Token", placeholder: "EAABs...", secret: true },
      { key: "ad_account_id", label: "Ad Account ID", placeholder: "act_123456789" },
    ],
  },
  {
    provider: "shopify",
    label: "Shopify",
    description: "Synchroniseer orders, omzet en productprestaties",
    icon: "🛍️",
    fields: [
      { key: "store_url", label: "Store URL", placeholder: "mijnwinkel.myshopify.com" },
      { key: "admin_api_token", label: "Admin API Token", placeholder: "shpat_...", secret: true },
      { key: "api_key", label: "API Key", placeholder: "••••••••••••••••", secret: true },
      { key: "api_secret", label: "API Secret", placeholder: "••••••••••••••••", secret: true },
    ],
  },
  {
    provider: "claude",
    label: "Claude (Anthropic)",
    description: "AI-analyse en geautomatiseerde inzichten",
    icon: "🤖",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "sk-ant-...", secret: true },
    ],
  },
  {
    provider: "openai",
    label: "OpenAI",
    description: "GPT-modellen voor tekst- en dataverwerking",
    icon: "✨",
    fields: [
      { key: "api_key", label: "API Key", placeholder: "sk-...", secret: true },
    ],
  },
  {
    provider: "google_ads",
    label: "Google Ads",
    description: "Google campagnedata en keyword prestaties",
    icon: "🔍",
    fields: [
      { key: "client_id", label: "Client ID", placeholder: "••••••••.apps.googleusercontent.com" },
      { key: "client_secret", label: "Client Secret", placeholder: "••••••••", secret: true },
      { key: "developer_token", label: "Developer Token", placeholder: "••••••••", secret: true },
      { key: "refresh_token", label: "Refresh Token", placeholder: "1//••••••••", secret: true },
    ],
  },
  {
    provider: "google_analytics",
    label: "Google Analytics",
    description: "Websiteverkeer en conversiedata",
    icon: "📊",
    fields: [
      { key: "property_id", label: "Property ID", placeholder: "123456789" },
      { key: "service_account_json", label: "Service Account JSON", placeholder: '{"type":"service_account",...}', secret: true },
    ],
  },
] as const;

// ─── Section card ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-[16px] border overflow-hidden"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>
          {title}
        </h2>
      </div>
      <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
        {children}
      </div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 gap-4">
      {children}
    </div>
  );
}

function RowLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
      {children}
    </span>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ initials, color, size = 32 }: { initials: string; color: string; size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full font-bold text-white flex-shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.35 }}
    >
      {initials}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Integration["status"] }) {
  const cfg = {
    connected: { label: "Verbonden", color: "#30D158", bg: "rgba(48,209,88,0.1)", border: "rgba(48,209,88,0.2)", Icon: CheckCircle },
    disconnected: { label: "Niet verbonden", color: "var(--color-text-tertiary)", bg: "transparent", border: "var(--color-border)", Icon: Clock },
    error: { label: "Fout", color: "#FF453A", bg: "rgba(255,69,58,0.1)", border: "rgba(255,69,58,0.2)", Icon: XCircle },
  }[status];

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      <cfg.Icon size={10} />
      {cfg.label}
    </span>
  );
}

// ─── Integration panel ────────────────────────────────────────────────────────

function IntegrationPanel({
  config,
  integration,
  onSaved,
}: {
  config: typeof INTEGRATIONS_CONFIG[number];
  integration: Integration | undefined;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: "connected" | "error"; message: string } | null>(null);
  const [error, setError] = useState("");

  const isConnected = integration?.status === "connected";
  const hasCredentials = !!integration;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const res = await fetch(`/api/integrations/${config.provider}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    const data = await res.json() as { success?: boolean; error?: string };
    setSaving(false);

    if (data.success) {
      setValues({});
      onSaved();
      setOpen(false);
    } else {
      setError(data.error ?? "Opslaan mislukt");
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    const res = await fetch(`/api/integrations/${config.provider}/test`, { method: "POST" });
    const data = await res.json() as { status: "connected" | "error"; message: string };
    setTestResult(data);
    setTesting(false);
    onSaved();
  }

  async function handleDelete() {
    setDeleting(true);
    await fetch(`/api/integrations/${config.provider}`, { method: "DELETE" });
    setDeleting(false);
    onSaved();
    setOpen(false);
  }

  return (
    <div>
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-white/[0.02]"
      >
        <span className="text-2xl flex-shrink-0" role="img">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              {config.label}
            </span>
            {integration && <StatusBadge status={integration.status} />}
          </div>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
            {config.description}
          </p>
        </div>
        <div className="flex-shrink-0" style={{ color: "var(--color-text-tertiary)" }}>
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
            style={{ borderTop: "1px solid var(--color-border)" }}
          >
            <div className="px-5 py-4 space-y-4">
              {hasCredentials && (
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={handleTest}
                    disabled={testing}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                    style={{ background: "color-mix(in srgb, var(--color-accent) 12%, transparent)", color: "var(--color-accent)", border: "1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)" }}
                  >
                    <RefreshCw size={12} className={testing ? "animate-spin" : ""} />
                    {testing ? "Testen…" : "Test verbinding"}
                  </button>

                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                    style={{ background: "rgba(255,69,58,0.08)", color: "#FF453A", border: "1px solid rgba(255,69,58,0.2)" }}
                  >
                    <Trash2 size={12} />
                    {deleting ? "Verwijderen…" : "Verwijderen"}
                  </button>

                  {testResult && (
                    <span
                      className="text-xs font-medium flex items-center gap-1.5"
                      style={{ color: testResult.status === "connected" ? "#30D158" : "#FF453A" }}
                    >
                      {testResult.status === "connected" ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {testResult.message}
                    </span>
                  )}
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-3">
                <p className="text-xs font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                  {hasCredentials ? "Credentials bijwerken" : "Credentials invoeren"}
                </p>

                {config.fields.map((field) => (
                  <div key={field.key}>
                    <label className="block mb-1 text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
                      {field.label}
                    </label>
                    <div className="relative">
                      <input
                        type={('secret' in field && field.secret) && !showSecrets[field.key] ? "password" : "text"}
                        placeholder={field.placeholder}
                        value={values[field.key] ?? ""}
                        onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none transition-colors"
                        style={{
                          background: "var(--color-surface)",
                          border: "1px solid var(--color-border)",
                          color: "var(--color-text-primary)",
                          paddingRight: ('secret' in field && field.secret) ? 36 : undefined,
                        }}
                        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; }}
                      />
                      {'secret' in field && field.secret && (
                        <button
                          type="button"
                          onClick={() => setShowSecrets((p) => ({ ...p, [field.key]: !p[field.key] }))}
                          style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-tertiary)", background: "none", border: "none", cursor: "pointer" }}
                        >
                          {showSecrets[field.key] ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {error && (
                  <p className="text-xs flex items-center gap-1.5" style={{ color: "#FF453A" }}>
                    <AlertCircle size={12} /> {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={saving || config.fields.every((f) => !values[f.key]?.trim())}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ background: "var(--color-accent)", color: "#fff" }}
                >
                  {saving ? "Opslaan…" : hasCredentials ? "Credentials bijwerken" : "Credentials opslaan"}
                </button>
              </form>

              {integration?.tested_at && (
                <p className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
                  Laatste test: {new Date(integration.tested_at).toLocaleString("nl-NL")}
                </p>
              )}
              {integration?.error_message && integration.status === "error" && (
                <p className="text-xs" style={{ color: "#FF453A" }}>
                  Fout: {integration.error_message}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main settings page ───────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const supabase = createClient();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  // Invite state
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profileRes, teamRes, inviteRes, intRes] = await Promise.all([
      supabase.from("user_profiles").select("*").eq("id", user.id).single(),
      supabase.from("user_profiles").select("*").order("created_at"),
      fetch("/api/auth/invite").then((r) => r.json()),
      fetch("/api/integrations").then((r) => r.json()),
    ]);

    setProfile(profileRes.data as UserProfile | null);
    setTeamMembers((teamRes.data ?? []) as UserProfile[]);
    setInvites(((inviteRes as { invites?: Invite[] }).invites ?? []) as Invite[]);
    setIntegrations(((intRes as { integrations?: Integration[] }).integrations ?? []) as Integration[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  async function generateInvite() {
    setGeneratingInvite(true);
    setInviteUrl(null);
    const res = await fetch("/api/auth/invite", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "owner" }) });
    const data = await res.json() as { url?: string; error?: string };
    if (data.url) {
      setInviteUrl(data.url);
      loadData();
    }
    setGeneratingInvite(false);
  }

  async function copyInvite(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function revokeInvite(id: string) {
    await fetch(`/api/auth/invite?id=${id}`, { method: "DELETE" });
    loadData();
    if (inviteUrl) setInviteUrl(null);
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordError("Wachtwoorden komen niet overeen");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Wachtwoord moet minimaal 8 tekens zijn");
      return;
    }

    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);

    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 4000);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-5 h-5 rounded-full border-2 border-[#5B6CFF] border-t-transparent animate-spin" />
      </div>
    );
  }

  const connectedCount = integrations.filter((i) => i.status === "connected").length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center px-8 py-5 flex-shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div>
          <h1 className="text-[24px] font-bold leading-tight" style={{ color: "var(--color-text-primary)" }}>
            Instellingen
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
            CRM Tool — beheer je account en integraties
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 max-w-2xl w-full space-y-5">

        {/* Profile */}
        <Section title="Profiel">
          <Row>
            <div className="flex items-center gap-3 min-w-0">
              {profile && <Avatar initials={profile.initials} color={profile.avatar_color} size={40} />}
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "var(--color-text-primary)" }}>
                  {profile?.display_name ?? "—"}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--color-text-tertiary)" }}>
                  {profile?.email ?? "—"}
                </p>
              </div>
            </div>
            <span
              className="text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize flex-shrink-0"
              style={{ background: "rgba(91,108,255,0.12)", color: "#5B6CFF" }}
            >
              {profile?.role ?? "owner"}
            </span>
          </Row>
        </Section>

        {/* Theme */}
        <Section title="Weergave">
          <Row>
            <RowLabel>Thema</RowLabel>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
            >
              {theme === "dark" ? <><Moon size={13} /> Donker</> : <><Sun size={13} /> Licht</>}
              <ChevronRight size={12} style={{ color: "var(--color-text-tertiary)" }} />
            </button>
          </Row>
        </Section>

        {/* Team */}
        <Section title="Team">
          {teamMembers.map((member) => (
            <Row key={member.id}>
              <div className="flex items-center gap-3 min-w-0">
                <Avatar initials={member.initials} color={member.avatar_color} size={32} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                    {member.display_name}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--color-text-tertiary)" }}>
                    {member.email}
                  </p>
                </div>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize flex-shrink-0" style={{ background: "rgba(91,108,255,0.1)", color: "#5B6CFF" }}>
                {member.role}
              </span>
            </Row>
          ))}

          {teamMembers.length < 2 && (
            <div className="px-5 py-4 space-y-3">
              <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                Nodig een teamgenoot uit door een invite-link te genereren. De link is 7 dagen geldig en eenmalig bruikbaar.
              </p>

              {invites.length > 0 ? (
                <div className="space-y-2">
                  {invites.map((invite) => (
                    <div key={invite.id} className="flex items-center gap-2 p-2.5 rounded-[10px]" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                      <LinkIcon size={12} style={{ color: "var(--color-text-tertiary)", flexShrink: 0 }} />
                      <span className="flex-1 text-xs truncate font-mono" style={{ color: "var(--color-text-secondary)" }}>
                        {typeof window !== "undefined" ? `${window.location.origin}/join?token=${invite.token.slice(0, 16)}…` : `…/${invite.token.slice(0, 16)}…`}
                      </span>
                      <button
                        onClick={() => copyInvite(`${typeof window !== "undefined" ? window.location.origin : ""}/join?token=${invite.token}`)}
                        className="flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-opacity hover:opacity-70 flex-shrink-0"
                        style={{ background: "color-mix(in srgb, var(--color-accent) 12%, transparent)", color: "var(--color-accent)" }}
                      >
                        {copied ? <><Check size={11} /> Gekopieerd</> : <><Copy size={11} /> Kopiëren</>}
                      </button>
                      <button
                        onClick={() => revokeInvite(invite.id)}
                        className="p-1 rounded transition-opacity hover:opacity-70 flex-shrink-0"
                        style={{ color: "#FF453A" }}
                        title="Intrekken"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <button
                  onClick={generateInvite}
                  disabled={generatingInvite}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ background: "var(--color-accent)", color: "#fff" }}
                >
                  {generatingInvite ? <><RefreshCw size={13} className="animate-spin" /> Genereren…</> : <><LinkIcon size={13} /> Invite-link genereren</>}
                </button>
              )}

              {inviteUrl && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 p-3 rounded-[12px]" style={{ background: "rgba(48,209,88,0.06)", border: "1px solid rgba(48,209,88,0.2)" }}>
                  <CheckCircle size={14} style={{ color: "#30D158", flexShrink: 0 }} />
                  <span className="flex-1 text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>
                    Link klaar — deel deze met je teamgenoot
                  </span>
                  <button
                    onClick={() => copyInvite(inviteUrl)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold flex-shrink-0"
                    style={{ background: "#30D158", color: "#fff" }}
                  >
                    {copied ? <><Check size={11} /> Gekopieerd!</> : <><Copy size={11} /> Kopiëren</>}
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </Section>

        {/* Security */}
        <Section title="Beveiliging">
          <div className="px-5 py-4">
            <p className="text-xs font-semibold mb-3" style={{ color: "var(--color-text-secondary)" }}>
              Wachtwoord wijzigen
            </p>
            <form onSubmit={changePassword} className="space-y-3">
              {[
                { value: newPassword, setter: setNewPassword, placeholder: "Nieuw wachtwoord (min. 8 tekens)", label: "Nieuw wachtwoord" },
                { value: confirmPassword, setter: setConfirmPassword, placeholder: "Bevestig nieuw wachtwoord", label: "Bevestigen" },
              ].map(({ value, setter, placeholder, label }) => (
                <div key={label}>
                  <label className="block mb-1 text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>{label}</label>
                  <input
                    type="password"
                    placeholder={placeholder}
                    value={value}
                    onChange={(e) => setter(e.target.value)}
                    className="w-full rounded-[10px] px-3 py-2.5 text-sm outline-none"
                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; }}
                  />
                </div>
              ))}

              {passwordError && <p className="text-xs" style={{ color: "#FF453A" }}>{passwordError}</p>}
              {passwordSuccess && <p className="text-xs flex items-center gap-1.5" style={{ color: "#30D158" }}><CheckCircle size={12} /> Wachtwoord succesvol gewijzigd</p>}

              <button
                type="submit"
                disabled={changingPassword || !newPassword || !confirmPassword}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                style={{ background: "var(--color-accent)", color: "#fff" }}
              >
                <Shield size={13} />
                {changingPassword ? "Opslaan…" : "Wachtwoord opslaan"}
              </button>
            </form>
          </div>

          <Row>
            <RowLabel>Uitloggen</RowLabel>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: "rgba(255,69,58,0.08)", border: "1px solid rgba(255,69,58,0.2)", color: "#FF453A" }}
            >
              <LogOut size={13} />
              {loggingOut ? "Uitloggen…" : "Uitloggen"}
            </button>
          </Row>
        </Section>

        {/* Integrations */}
        <div
          className="rounded-[16px] border overflow-hidden"
          style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
        >
          <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>
              Integraties
            </h2>
            <span className="text-xs font-semibold" style={{ color: connectedCount > 0 ? "#30D158" : "var(--color-text-tertiary)" }}>
              {connectedCount}/{INTEGRATIONS_CONFIG.length} verbonden
            </span>
          </div>
          <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
            {INTEGRATIONS_CONFIG.map((config) => (
              <IntegrationPanel
                key={config.provider}
                config={config}
                integration={integrations.find((i) => i.provider === config.provider)}
                onSaved={loadData}
              />
            ))}
          </div>
        </div>

        {/* App info */}
        <Section title="Over CRM Tool - Tygo Ian">
          <Row>
            <RowLabel>Versie</RowLabel>
            <span className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>v2.0.0</span>
          </Row>
          <Row>
            <RowLabel>Gebouwd met</RowLabel>
            <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              Next.js 16 · Supabase · TypeScript
            </span>
          </Row>
          <Row>
            <RowLabel>Beveiliging</RowLabel>
            <span className="text-xs flex items-center gap-1.5" style={{ color: "#30D158" }}>
              <Shield size={12} /> Supabase Auth + RLS
            </span>
          </Row>
        </Section>

      </div>
    </div>
  );
}

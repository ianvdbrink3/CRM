"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Moon, Sun, LogOut, Users, Info, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

// ─── Settings Page ────────────────────────────────────────────────────────────

const APP_VERSION = "1.0.0";
const APP_NAME = "CRM Tool - Tygo Ian";

function SectionCard({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-[16px] border overflow-hidden"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      <div
        className="px-5 py-3"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>
          {title}
        </h2>
      </div>
      <div className="divide-y" style={{ borderColor: "var(--color-border)" }}>
        {children}
      </div>
    </motion.div>
  );
}

function SettingsRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-3.5 gap-4">
      <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
        {label}
      </span>
      <div className="flex items-center gap-3 flex-shrink-0">
        {value && (
          <span className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>{value}</span>
        )}
        {children}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("nucleus-theme") as "dark" | "light" | null;
    if (stored) {
      setTheme(stored);
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("nucleus-theme", next);
    // Apply theme to document
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch {
      // Even on error, redirect
      router.push("/login");
    }
    setLoggingOut(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-8 py-5 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div>
          <h1 className="text-[24px] font-bold leading-tight" style={{ color: "var(--color-text-primary)" }}>
            Instellingen
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
            CRM Tool - Tygo Ian configuratie
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6 max-w-2xl w-full mx-auto space-y-5">
        {/* Theme */}
        <SectionCard title="Weergave">
          <SettingsRow label="Thema">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:opacity-80"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            >
              {theme === "dark" ? (
                <>
                  <Moon size={14} />
                  Donker
                </>
              ) : (
                <>
                  <Sun size={14} />
                  Licht
                </>
              )}
              <ChevronRight size={12} style={{ color: "var(--color-text-tertiary)" }} />
            </button>
          </SettingsRow>
        </SectionCard>

        {/* Account */}
        <SectionCard title="Account">
          <SettingsRow label="Gebruikers">
            <div className="flex items-center gap-2">
              <div className="flex items-center -space-x-1">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold text-white ring-2 ring-[var(--color-card)]" style={{ background: "#0A84FF" }}>
                  IA
                </span>
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold text-white ring-2 ring-[var(--color-card)]" style={{ background: "#30D158" }}>
                  TY
                </span>
              </div>
              <span className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                Ian & Tygo
              </span>
            </div>
          </SettingsRow>
          <SettingsRow label="Uitloggen">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{
                background: "color-mix(in srgb, var(--color-danger) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)",
                color: "var(--color-danger)",
              }}
            >
              <LogOut size={14} />
              {loggingOut ? "Uitloggen…" : "Uitloggen"}
            </button>
          </SettingsRow>
        </SectionCard>

        {/* Auth (Future) */}
        <SectionCard title="Authenticatie (toekomst)">
          <SettingsRow label="Supabase Auth">
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
              style={{
                background: "color-mix(in srgb, var(--color-warning) 15%, transparent)",
                color: "var(--color-warning)",
              }}
            >
              TODO
            </span>
          </SettingsRow>
          <div className="px-5 py-3 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
            In een volgende versie: per-user login via Supabase Auth met Row Level Security (RLS). Ian en Tygo krijgen elk een eigen account met bijbehorende rechten.
          </div>
        </SectionCard>

        {/* App info */}
        <SectionCard title="Over CRM Tool - Tygo Ian">
          <SettingsRow label="App naam" value={APP_NAME} />
          <SettingsRow label="Versie" value={`v${APP_VERSION}`} />
          <SettingsRow label="Omschrijving">
            <span className="text-xs text-right max-w-[220px]" style={{ color: "var(--color-text-tertiary)" }}>
              E-commerce OS voor producten, campagnes, leveranciers en operaties.
            </span>
          </SettingsRow>
          <SettingsRow label="Gebouwd met">
            <span className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>
              Next.js 15 · Supabase · TypeScript
            </span>
          </SettingsRow>
        </SectionCard>
      </div>
    </div>
  );
}

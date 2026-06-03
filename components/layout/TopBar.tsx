"use client";

import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Sun, Moon, LogOut } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";

// Map route segments to human-readable Dutch titles
const ROUTE_TITLES: Record<string, string> = {
  "/":           "Dashboard",
  "/products":   "Producten",
  "/campaigns":  "Campagnes",
  "/creatives":  "Creatives",
  "/insights":   "Inzichten",
  "/suppliers":  "Leveranciers",
  "/finance":    "Financiën",
  "/sops":       "SOPs",
  "/tasks":      "Taken",
  "/meetings":   "Vergaderingen",
  "/analyse":    "Analyse & Inzichten",
  "/chat":       "Team Chat",
  "/settings":   "Instellingen",
};

function resolveTitle(pathname: string): string {
  if (pathname === "/") return ROUTE_TITLES["/"];
  // Find the longest matching prefix
  const match = Object.keys(ROUTE_TITLES)
    .filter((k) => k !== "/" && pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];
  return match ? ROUTE_TITLES[match] : "CRM Tool";
}

function IconButton({
  onClick,
  label,
  children,
}: {
  onClick?: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex items-center justify-center rounded-md transition-colors"
      style={{
        width: 32,
        height: 32,
        color: "var(--color-text-secondary)",
        background: "transparent",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.06)";
        e.currentTarget.style.color = "var(--color-text-primary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.color = "var(--color-text-secondary)";
      }}
    >
      {children}
    </button>
  );
}

export function TopBar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const title = resolveTitle(pathname);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <motion.header
      className="flex items-center h-14 flex-shrink-0 px-4 gap-4"
      style={{
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        background: "rgba(22,22,24,0.8)",
        borderBottom: "1px solid var(--color-border)",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      {/* Left: page title */}
      <h1
        className="flex-1 font-semibold truncate"
        style={{
          fontSize: 15,
          color: "var(--color-text-primary)",
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h1>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        {/* ⌘K hint */}
        <button
          aria-label="Open zoekbalk (⌘K)"
          className="hidden sm:flex items-center gap-1.5 rounded-md transition-colors px-2.5"
          style={{
            height: 32,
            fontSize: 12,
            color: "var(--color-text-tertiary)",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--color-border)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.07)";
            e.currentTarget.style.color = "var(--color-text-secondary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.04)";
            e.currentTarget.style.color = "var(--color-text-tertiary)";
          }}
        >
          <span style={{ fontSize: 13 }}>⌘K</span>
          <span style={{ fontSize: 12 }}>Zoeken</span>
        </button>

        {/* Theme toggle */}
        <IconButton onClick={toggleTheme} label={theme === "dark" ? "Licht thema" : "Donker thema"}>
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </IconButton>

        {/* Logout / avatar */}
        <div className="flex items-center gap-2 ml-1">
          <button
            onClick={handleLogout}
            aria-label="Uitloggen"
            className="flex items-center justify-center rounded-full font-semibold text-xs transition-all"
            style={{
              width: 32,
              height: 32,
              background: "rgba(91,108,255,0.18)",
              color: "#5B6CFF",
              border: "1px solid rgba(91,108,255,0.25)",
              fontSize: 11,
              letterSpacing: "0.02em",
            }}
            title="Uitloggen"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,69,58,0.15)";
              e.currentTarget.style.color = "var(--color-danger)";
              e.currentTarget.style.borderColor = "rgba(255,69,58,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(91,108,255,0.18)";
              e.currentTarget.style.color = "#5B6CFF";
              e.currentTarget.style.borderColor = "rgba(91,108,255,0.25)";
            }}
          >
            IT
          </button>
        </div>
      </div>
    </motion.header>
  );
}

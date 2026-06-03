"use client";

import { cn } from "@/lib/utils";

export type PillVariant = "success" | "warning" | "danger" | "info" | "neutral";

// ─── Auto-map from status string to variant ──────────────────────────────────
const STATUS_VARIANT_MAP: Record<string, PillVariant> = {
  // success
  actief: "success",
  winner: "success",
  scaling: "success",
  betaald: "success",
  active: "success",
  // info
  in_test: "info",
  testing: "info",
  deels_betaald: "info",
  // warning
  te_herzien: "warning",
  paused: "warning",
  wachten: "warning",
  trial: "warning",
  // danger
  dead: "danger",
  killed: "danger",
  geblokkeerd: "danger",
  opgezegd: "danger",
  // neutral
  idea: "neutral",
  researching: "neutral",
  planned: "neutral",
  open: "neutral",
  draft: "neutral",
  archief: "neutral",
  gearchiveerd: "neutral",
  pauze: "neutral",
};

// ─── Dutch display labels ─────────────────────────────────────────────────────
export const STATUS_LABELS: Record<string, string> = {
  actief: "Actief",
  winner: "Winner",
  scaling: "Scaling",
  betaald: "Betaald",
  active: "Actief",
  in_test: "In test",
  testing: "Testen",
  deels_betaald: "Deels betaald",
  te_herzien: "Te herzien",
  paused: "Gepauzeerd",
  wachten: "Wachten",
  trial: "Trial",
  dead: "Dood",
  killed: "Gestopt",
  geblokkeerd: "Geblokkeerd",
  opgezegd: "Opgezegd",
  idea: "Idee",
  researching: "Onderzoek",
  planned: "Gepland",
  open: "Open",
  draft: "Concept",
  archief: "Archief",
  gearchiveerd: "Gearchiveerd",
  pauze: "Pauze",
};

// ─── Variant → CSS colour pair ────────────────────────────────────────────────
const VARIANT_STYLES: Record<
  PillVariant,
  { bg: string; color: string }
> = {
  success: {
    bg: "color-mix(in srgb, var(--color-success) 12%, transparent)",
    color: "var(--color-success)",
  },
  warning: {
    bg: "color-mix(in srgb, var(--color-warning) 12%, transparent)",
    color: "var(--color-warning)",
  },
  danger: {
    bg: "color-mix(in srgb, var(--color-danger) 12%, transparent)",
    color: "var(--color-danger)",
  },
  info: {
    bg: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
    color: "var(--color-accent)",
  },
  neutral: {
    bg: "color-mix(in srgb, var(--color-text-tertiary) 12%, transparent)",
    color: "var(--color-text-secondary)",
  },
};

interface StatusPillProps {
  status: string;
  variant?: PillVariant;
  className?: string;
}

export function StatusPill({ status, variant, className }: StatusPillProps) {
  const resolvedVariant =
    variant ?? STATUS_VARIANT_MAP[status.toLowerCase()] ?? "neutral";
  const styles = VARIANT_STYLES[resolvedVariant];
  const label = STATUS_LABELS[status.toLowerCase()] ?? status;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
        className
      )}
      style={{
        background: styles.bg,
        color: styles.color,
      }}
    >
      {label}
    </span>
  );
}

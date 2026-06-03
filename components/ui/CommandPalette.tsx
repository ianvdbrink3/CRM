"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  Package,
  Megaphone,
  Film,
  Lightbulb,
  Truck,
  TrendingUp,
  BookOpen,
  CheckSquare,
  Calendar,
  Settings,
  Plus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommandItem {
  id: string;
  label: string;
  group: "Navigatie" | "Nieuw";
  icon: React.ElementType;
  shortcut?: string;
  action: () => void;
}

// ─── Static command list ──────────────────────────────────────────────────────

function useCommandItems(router: ReturnType<typeof useRouter>): CommandItem[] {
  return [
    // ── Navigatie ──────────────────────────────────────────────────────────
    {
      id: "nav-dashboard",
      label: "Dashboard",
      group: "Navigatie",
      icon: LayoutDashboard,
      shortcut: "G D",
      action: () => router.push("/"),
    },
    {
      id: "nav-products",
      label: "Producten",
      group: "Navigatie",
      icon: Package,
      shortcut: "G P",
      action: () => router.push("/products"),
    },
    {
      id: "nav-campaigns",
      label: "Campagnes",
      group: "Navigatie",
      icon: Megaphone,
      shortcut: "G C",
      action: () => router.push("/campaigns"),
    },
    {
      id: "nav-creatives",
      label: "Creatives",
      group: "Navigatie",
      icon: Film,
      shortcut: "G R",
      action: () => router.push("/creatives"),
    },
    {
      id: "nav-insights",
      label: "Inzichten",
      group: "Navigatie",
      icon: Lightbulb,
      shortcut: "G I",
      action: () => router.push("/insights"),
    },
    {
      id: "nav-suppliers",
      label: "Leveranciers",
      group: "Navigatie",
      icon: Truck,
      shortcut: "G L",
      action: () => router.push("/suppliers"),
    },
    {
      id: "nav-finance",
      label: "Financiën",
      group: "Navigatie",
      icon: TrendingUp,
      shortcut: "G F",
      action: () => router.push("/finance"),
    },
    {
      id: "nav-sops",
      label: "SOPs",
      group: "Navigatie",
      icon: BookOpen,
      shortcut: "G S",
      action: () => router.push("/sops"),
    },
    {
      id: "nav-tasks",
      label: "Taken",
      group: "Navigatie",
      icon: CheckSquare,
      shortcut: "G T",
      action: () => router.push("/tasks"),
    },
    {
      id: "nav-meetings",
      label: "Vergaderingen",
      group: "Navigatie",
      icon: Calendar,
      shortcut: "G V",
      action: () => router.push("/meetings"),
    },
    {
      id: "nav-settings",
      label: "Instellingen",
      group: "Navigatie",
      icon: Settings,
      action: () => router.push("/settings"),
    },
    // ── Nieuw ──────────────────────────────────────────────────────────────
    {
      id: "new-product",
      label: "Nieuw product",
      group: "Nieuw",
      icon: Package,
      shortcut: "N P",
      action: () => router.push("/products?new=1"),
    },
    {
      id: "new-campaign",
      label: "Nieuwe campagne",
      group: "Nieuw",
      icon: Megaphone,
      shortcut: "N C",
      action: () => router.push("/campaigns?new=1"),
    },
    {
      id: "new-creative",
      label: "Nieuw creative",
      group: "Nieuw",
      icon: Film,
      shortcut: "N R",
      action: () => router.push("/creatives?new=1"),
    },
    {
      id: "new-supplier",
      label: "Nieuwe leverancier",
      group: "Nieuw",
      icon: Truck,
      shortcut: "N L",
      action: () => router.push("/suppliers?new=1"),
    },
    {
      id: "new-task",
      label: "Nieuwe taak",
      group: "Nieuw",
      icon: CheckSquare,
      shortcut: "N T",
      action: () => router.push("/tasks?new=1"),
    },
    {
      id: "new-sop",
      label: "Nieuwe SOP",
      group: "Nieuw",
      icon: Plus,
      shortcut: "N S",
      action: () => router.push("/sops?new=1"),
    },
  ];
}

// ─── Keyboard shortcut hint ───────────────────────────────────────────────────

function ShortcutBadge({ shortcut }: { shortcut: string }) {
  return (
    <span className="flex items-center gap-1">
      {shortcut.split(" ").map((key, i) => (
        <kbd
          key={i}
          className="inline-flex items-center justify-center rounded text-[10px] font-medium px-1.5 py-0.5 min-w-[20px]"
          style={{
            background: "var(--color-card)",
            color: "var(--color-text-tertiary)",
            border: "1px solid var(--color-border)",
          }}
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface CommandPaletteProps {
  /** Controlled open state — if omitted the component manages it internally. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CommandPalette({ open: controlledOpen, onOpenChange }: CommandPaletteProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const router = useRouter();
  const items = useCommandItems(router);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const setOpen = useCallback(
    (value: boolean) => {
      setInternalOpen(value);
      onOpenChange?.(value);
    },
    [onOpenChange]
  );

  // ⌘K / Ctrl+K global shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(!isOpen);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, setOpen]);

  function handleSelect(item: CommandItem) {
    setOpen(false);
    // Slight delay so the palette closes before navigation
    setTimeout(() => item.action(), 80);
  }

  const groups = ["Navigatie", "Nieuw"] as const;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="cp-backdrop"
            className="fixed inset-0 z-[100]"
            style={{
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              background: "rgba(0, 0, 0, 0.55)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.div
            key="cp-panel"
            className="fixed left-1/2 top-[20vh] z-[101] w-full max-w-[560px] -translate-x-1/2"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ type: "spring", stiffness: 420, damping: 36 }}
          >
            <Command
              className={cn(
                "rounded-[20px] overflow-hidden",
                "flex flex-col"
              )}
              style={{
                background:
                  "color-mix(in srgb, var(--color-surface) 85%, transparent)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                border: "1px solid var(--color-border)",
                boxShadow: "var(--shadow-xl)",
              }}
              loop
            >
              {/* Search input */}
              <div
                className="flex items-center gap-3 px-4 py-3"
                style={{ borderBottom: "1px solid var(--color-border)" }}
              >
                <Search
                  size={18}
                  className="flex-shrink-0"
                  style={{ color: "var(--color-text-tertiary)" }}
                />
                <Command.Input
                  autoFocus
                  placeholder="Zoek of voer een opdracht in…"
                  className={cn(
                    "flex-1 bg-transparent outline-none text-[15px] placeholder:opacity-60"
                  )}
                  style={{
                    color: "var(--color-text-primary)",
                    caretColor: "var(--color-accent)",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setOpen(false);
                  }}
                />
                <kbd
                  className="text-[11px] px-1.5 py-0.5 rounded hidden sm:inline-flex"
                  style={{
                    background: "var(--color-card)",
                    color: "var(--color-text-tertiary)",
                    border: "1px solid var(--color-border)",
                  }}
                >
                  Esc
                </kbd>
              </div>

              {/* Results */}
              <Command.List
                className="overflow-y-auto overscroll-contain py-2"
                style={{ maxHeight: "min(60vh, 400px)" }}
              >
                <Command.Empty
                  className="px-4 py-8 text-center text-sm"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  Geen resultaten gevonden.
                </Command.Empty>

                {groups.map((group) => {
                  const groupItems = items.filter((i) => i.group === group);
                  return (
                    <Command.Group
                      key={group}
                      heading={group}
                      className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider"
                      style={
                        {
                          "--cmdk-group-heading-color":
                            "var(--color-text-tertiary)",
                        } as React.CSSProperties
                      }
                    >
                      {groupItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Command.Item
                            key={item.id}
                            value={`${item.group} ${item.label}`}
                            onSelect={() => handleSelect(item)}
                            className={cn(
                              "flex items-center gap-3 px-4 py-2.5 cursor-pointer rounded-lg mx-2 text-sm",
                              "transition-colors",
                              "data-[selected=true]:bg-[color-mix(in_srgb,var(--color-accent)_10%,transparent)]"
                            )}
                            style={{ color: "var(--color-text-primary)" }}
                          >
                            <span
                              className="flex items-center justify-center rounded-md flex-shrink-0"
                              style={{
                                width: 28,
                                height: 28,
                                background:
                                  "color-mix(in srgb, var(--color-border) 60%, transparent)",
                                color: "var(--color-text-secondary)",
                              }}
                            >
                              <Icon size={14} />
                            </span>
                            <span className="flex-1">{item.label}</span>
                            {item.shortcut && (
                              <ShortcutBadge shortcut={item.shortcut} />
                            )}
                          </Command.Item>
                        );
                      })}
                    </Command.Group>
                  );
                })}
              </Command.List>

              {/* Footer */}
              <div
                className="flex items-center gap-4 px-4 py-2.5 text-[11px]"
                style={{
                  borderTop: "1px solid var(--color-border)",
                  color: "var(--color-text-tertiary)",
                }}
              >
                <span className="flex items-center gap-1">
                  <kbd
                    className="px-1 rounded"
                    style={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    ↑
                  </kbd>
                  <kbd
                    className="px-1 rounded"
                    style={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    ↓
                  </kbd>
                  navigeren
                </span>
                <span className="flex items-center gap-1">
                  <kbd
                    className="px-1.5 rounded"
                    style={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    ↵
                  </kbd>
                  selecteren
                </span>
                <span className="ml-auto flex items-center gap-1">
                  <kbd
                    className="px-1.5 rounded"
                    style={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                    }}
                  >
                    Esc
                  </kbd>
                  sluiten
                </span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

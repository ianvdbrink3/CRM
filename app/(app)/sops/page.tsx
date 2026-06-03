"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, BookOpen } from "lucide-react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import type { SOP, SOPInsert } from "@/lib/supabase/types";
import { formatDate } from "@/lib/utils";
import { StatusPill, SlideOver } from "@/components/ui";
import { useRealtime } from "@/hooks/useRealtime";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ["Marketing", "Inkoop", "Operaties", "Finance", "HR", "Tech", "Overig"];

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  Marketing: { bg: "color-mix(in srgb, #BF5AF2 15%, transparent)", color: "#BF5AF2" },
  Inkoop: { bg: "color-mix(in srgb, #FF9F0A 15%, transparent)", color: "#FF9F0A" },
  Operaties: { bg: "color-mix(in srgb, #0A84FF 15%, transparent)", color: "#0A84FF" },
  Finance: { bg: "color-mix(in srgb, #30D158 15%, transparent)", color: "#30D158" },
  HR: { bg: "color-mix(in srgb, #FF375F 15%, transparent)", color: "#FF375F" },
  Tech: { bg: "color-mix(in srgb, #64D2FF 15%, transparent)", color: "#64D2FF" },
  Overig: { bg: "color-mix(in srgb, #8E8E93 15%, transparent)", color: "#8E8E93" },
};

const SOP_STATUSES = ["concept", "actief", "te_herzien", "gearchiveerd"];

const STATUS_LABELS: Record<string, string> = {
  concept: "Concept",
  actief: "Actief",
  te_herzien: "Te herzien",
  gearchiveerd: "Gearchiveerd",
};

// ─── Category Badge ───────────────────────────────────────────────────────────

function CategoryBadge({ category }: { category: string | null }) {
  if (!category) return null;
  const cfg = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.Overig;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {category}
    </span>
  );
}

// ─── SOP Card ─────────────────────────────────────────────────────────────────

function SopCard({ sop }: { sop: SOP }) {
  return (
    <Link href={`/sops/${sop.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="rounded-[12px] border p-4 cursor-pointer h-full flex flex-col"
        style={{
          background: "var(--color-card)",
          borderColor: "var(--color-border)",
          boxShadow: "var(--shadow-sm)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-accent)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-border)";
        }}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <CategoryBadge category={sop.category} />
          <StatusPill status={sop.status} />
        </div>

        {/* Title */}
        <h3 className="text-[14px] font-semibold leading-tight mb-2 flex-1" style={{ color: "var(--color-text-primary)" }}>
          {sop.title}
        </h3>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 mt-2">
          {sop.responsible_role && (
            <span className="text-xs truncate" style={{ color: "var(--color-text-tertiary)" }}>
              {sop.responsible_role}
            </span>
          )}
          <span className="text-[11px] flex-shrink-0" style={{ color: "var(--color-text-tertiary)" }}>
            {formatDate(sop.updated_at)}
          </span>
        </div>
      </motion.div>
    </Link>
  );
}

// ─── Create SOP Form ──────────────────────────────────────────────────────────

interface CreateFormProps {
  onSuccess: () => void;
  onClose: () => void;
}

function CreateSopForm({ onSuccess, onClose }: CreateFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    category: "",
    responsible_role: "",
    status: "concept",
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Titel is verplicht."); return; }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const insert: SOPInsert = {
      title: form.title.trim(),
      category: form.category || null,
      responsible_role: form.responsible_role || null,
      status: form.status,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await supabase.from("nucleus_sops").insert(insert as any);
    setSaving(false);
    if (err) { setError(err.message); return; }
    onSuccess();
    onClose();
  };

  const inputClass = "w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors";
  const inputStyle = { background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" };
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = "var(--color-accent)");
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = "var(--color-border)");
  const labelClass = "block text-xs font-semibold mb-1.5 uppercase tracking-wide";
  const labelStyle = { color: "var(--color-text-tertiary)" };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass} style={labelStyle}>Titel <span style={{ color: "var(--color-danger)" }}>*</span></label>
        <input type="text" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="SOP-naam…" className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} style={labelStyle}>Categorie</label>
          <select value={form.category} onChange={(e) => set("category", e.target.value)} className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
            <option value="">— Kies categorie —</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>Status</label>
          <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
            {SOP_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className={labelClass} style={labelStyle}>Verantwoordelijke rol</label>
        <input type="text" value={form.responsible_role} onChange={(e) => set("responsible_role", e.target.value)} placeholder="bijv. Marketing manager" className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
      </div>
      {error && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>}
      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50" style={{ background: "var(--color-accent)", color: "#fff" }}>
          {saving ? "Aanmaken…" : "SOP aanmaken"}
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
          Annuleren
        </button>
      </div>
    </form>
  );
}

// ─── Filter Chip ──────────────────────────────────────────────────────────────

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap"
      style={{
        background: active ? "var(--color-accent)" : "var(--color-card)",
        color: active ? "#fff" : "var(--color-text-secondary)",
        border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
      }}
    >
      {label}
    </button>
  );
}

// ─── SOPs Page ────────────────────────────────────────────────────────────────

export default function SopsPage() {
  const [loading, setLoading] = useState(true);
  const [sops, setSops] = useState<SOP[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Alle");
  const [statusFilter, setStatusFilter] = useState("Alle");
  const [createOpen, setCreateOpen] = useState(false);

  const fetchSops = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("nucleus_sops")
      .select("*")
      .order("updated_at", { ascending: false });
    if (data) setSops(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSops(); }, [fetchSops]);
  useRealtime("nucleus_sops", fetchSops);

  const filtered = sops.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.title.toLowerCase().includes(q) || (s.category ?? "").toLowerCase().includes(q);
    const matchCat = categoryFilter === "Alle" || s.category === categoryFilter;
    const matchStatus = statusFilter === "Alle" || s.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 md:px-8 py-4 md:py-5 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div>
          <h1 className="text-[24px] font-bold leading-tight" style={{ color: "var(--color-text-primary)" }}>
            SOPs
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
            {sops.length} standaard werkprocedure{sops.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: "var(--color-accent)", color: "#fff" }}
        >
          <Plus size={15} />
          Nieuwe SOP
        </button>
      </div>

      {/* Filters */}
      <div
        className="flex items-center gap-3 px-4 md:px-8 py-3 flex-shrink-0 flex-wrap"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        {/* Search */}
        <div className="flex items-center gap-2 rounded-lg px-3 py-1.5 flex-1 min-w-[180px] max-w-[280px]"
          style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
          <Search size={13} style={{ color: "var(--color-text-tertiary)" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Zoek SOPs…"
            className="flex-1 text-sm outline-none bg-transparent"
            style={{ color: "var(--color-text-primary)" }}
          />
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wide mr-1" style={{ color: "var(--color-text-tertiary)" }}>Categorie</span>
          <FilterChip label="Alle" active={categoryFilter === "Alle"} onClick={() => setCategoryFilter("Alle")} />
          {CATEGORIES.map((c) => (
            <FilterChip key={c} label={c} active={categoryFilter === c} onClick={() => setCategoryFilter(c)} />
          ))}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wide mr-1" style={{ color: "var(--color-text-tertiary)" }}>Status</span>
          <FilterChip label="Alle" active={statusFilter === "Alle"} onClick={() => setStatusFilter("Alle")} />
          {SOP_STATUSES.map((s) => (
            <FilterChip key={s} label={STATUS_LABELS[s]} active={statusFilter === s} onClick={() => setStatusFilter(s)} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-36 rounded-[12px] animate-pulse" style={{ background: "var(--color-card)" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <BookOpen size={32} style={{ color: "var(--color-text-tertiary)" }} />
            <p className="text-base font-semibold" style={{ color: "var(--color-text-secondary)" }}>
              Geen SOPs gevonden
            </p>
            <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>
              {search || categoryFilter !== "Alle" || statusFilter !== "Alle"
                ? "Pas je filters aan om meer resultaten te zien."
                : "Maak je eerste SOP aan om te beginnen."}
            </p>
            {!search && categoryFilter === "Alle" && statusFilter === "Alle" && (
              <button
                onClick={() => setCreateOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 mt-2"
                style={{ background: "var(--color-accent)", color: "#fff" }}
              >
                <Plus size={14} />
                Nieuwe SOP
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <AnimatePresence>
              {filtered.map((sop) => (
                <SopCard key={sop.id} sop={sop} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create SOP SlideOver */}
      <SlideOver open={createOpen} onClose={() => setCreateOpen(false)} title="Nieuwe SOP" width="md">
        <CreateSopForm onSuccess={fetchSops} onClose={() => setCreateOpen(false)} />
      </SlideOver>
    </div>
  );
}

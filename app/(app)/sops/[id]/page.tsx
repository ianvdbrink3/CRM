"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ExternalLink, Edit2, Check } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import type { SOP } from "@/lib/supabase/types";
import { formatDate } from "@/lib/utils";
import { StatusPill } from "@/components/ui";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ["Marketing", "Inkoop", "Operaties", "Finance", "HR", "Tech", "Overig"];

const SOP_STATUSES = ["concept", "actief", "te_herzien", "gearchiveerd"];

const STATUS_LABELS: Record<string, string> = {
  concept: "Concept",
  actief: "Actief",
  te_herzien: "Te herzien",
  gearchiveerd: "Gearchiveerd",
};

const SOP_TEMPLATE = `## Doel

## Verantwoordelijke

## Stappen

## Checklist
- [ ]

## Video

## Laatste update
`;

// ─── Autosave field hook ──────────────────────────────────────────────────────

function useAutosave(initialValue: string, onSave: (v: string) => Promise<void>, delay = 800) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleChange = useCallback((newValue: string) => {
    setValue(newValue);
    setSaved(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSaving(true);
      await onSave(newValue);
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, delay);
  }, [onSave, delay]);

  return { value, handleChange, saving, saved };
}

// ─── Editable Title ───────────────────────────────────────────────────────────

interface EditableTitleProps {
  value: string;
  onSave: (v: string) => Promise<void>;
}

function EditableTitle({ value: initialValue, onSave }: EditableTitleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setDraft(initialValue); }, [initialValue]);

  const startEdit = () => {
    setDraft(initialValue);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commit = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    await onSave(draft.trim());
    setSaving(false);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="text-[28px] font-bold outline-none rounded-lg px-2 py-1 flex-1"
          style={{
            background: "var(--color-surface)",
            border: "2px solid var(--color-accent)",
            color: "var(--color-text-primary)",
          }}
          autoFocus
        />
        <button
          onClick={commit}
          disabled={saving}
          className="p-2 rounded-lg transition-opacity hover:opacity-70"
          style={{ background: "var(--color-accent)", color: "#fff" }}
        >
          <Check size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 group">
      <h1 className="text-[28px] font-bold leading-tight" style={{ color: "var(--color-text-primary)" }}>
        {draft}
      </h1>
      <button
        onClick={startEdit}
        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity mt-1"
        style={{ color: "var(--color-text-tertiary)" }}
        title="Titel bewerken"
      >
        <Edit2 size={14} />
      </button>
    </div>
  );
}

// ─── SOP Detail Page ──────────────────────────────────────────────────────────

export default function SopDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [sop, setSop] = useState<SOP | null>(null);

  const fetchSop = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from("nucleus_sops").select("*").eq("id", id).single();
    if (data) setSop(data);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchSop(); }, [fetchSop]);

  const updateField = useCallback(async (field: string, value: string | null) => {
    const supabase = createClient();
    const table = supabase.from("nucleus_sops");
    // @ts-expect-error supabase generated update type is overly strict for dynamic fields
    await table.update({ [field]: value, updated_at: new Date().toISOString() }).eq("id", id);
    setSop((prev) => prev ? { ...prev, [field]: value, updated_at: new Date().toISOString() } : prev);
  }, [id]);

  const bodyAutosave = useAutosave(
    sop?.body ?? "",
    (v) => updateField("body", v || null)
  );

  const inputClass = "w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors";
  const inputStyle = { background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" };
  const onFocusEv = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = "var(--color-accent)");
  const onBlurEv = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = "var(--color-border)");

  if (loading) {
    return (
      <div className="flex flex-col h-full px-8 py-8 gap-6">
        <div className="h-8 w-48 rounded-lg animate-pulse" style={{ background: "var(--color-card)" }} />
        <div className="h-12 w-96 rounded-xl animate-pulse" style={{ background: "var(--color-card)" }} />
        <div className="h-64 rounded-xl animate-pulse" style={{ background: "var(--color-card)" }} />
      </div>
    );
  }

  if (!sop) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-lg font-semibold" style={{ color: "var(--color-text-secondary)" }}>SOP niet gevonden</p>
        <Link href="/sops" className="text-sm font-medium hover:underline" style={{ color: "var(--color-accent)" }}>
          ← Terug naar SOPs
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Top bar */}
      <div
        className="flex items-center gap-4 px-8 py-4 flex-shrink-0 sticky top-0 z-10"
        style={{ background: "var(--color-bg)", borderBottom: "1px solid var(--color-border)" }}
      >
        <Link
          href="/sops"
          className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <ArrowLeft size={15} />
          SOPs
        </Link>
        <span style={{ color: "var(--color-border)" }}>·</span>
        <StatusPill status={sop.status} />
        <span className="text-xs ml-auto" style={{ color: "var(--color-text-tertiary)" }}>
          Bijgewerkt: {formatDate(sop.updated_at)}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 px-8 py-6 max-w-4xl w-full mx-auto space-y-6">
        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <EditableTitle value={sop.title} onSave={(v) => updateField("title", v)} />
        </motion.div>

        {/* Meta fields */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>Status</label>
            <select
              value={sop.status}
              onChange={(e) => updateField("status", e.target.value)}
              className={inputClass}
              style={inputStyle}
              onFocus={onFocusEv}
              onBlur={onBlurEv}
            >
              {SOP_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>Categorie</label>
            <select
              value={sop.category ?? ""}
              onChange={(e) => updateField("category", e.target.value || null)}
              className={inputClass}
              style={inputStyle}
              onFocus={onFocusEv}
              onBlur={onBlurEv}
            >
              <option value="">— Kies —</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>Verantwoordelijke rol</label>
            <input
              type="text"
              defaultValue={sop.responsible_role ?? ""}
              placeholder="bijv. Marketing manager"
              className={inputClass}
              style={inputStyle}
              onFocus={onFocusEv}
              onBlur={(e) => {
                onBlurEv(e);
                updateField("responsible_role", e.target.value || null);
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>Video link</label>
            <div className="flex items-center gap-1">
              <input
                type="url"
                defaultValue={sop.video_link ?? ""}
                placeholder="https://…"
                className={`${inputClass} flex-1`}
                style={inputStyle}
                onFocus={onFocusEv}
                onBlur={(e) => {
                  onBlurEv(e);
                  updateField("video_link", e.target.value || null);
                }}
              />
              {sop.video_link && (
                <a
                  href={sop.video_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg transition-opacity hover:opacity-70 flex-shrink-0"
                  style={{ color: "var(--color-accent)" }}
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Body editor */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>
              Inhoud
            </label>
            <div className="flex items-center gap-2">
              {bodyAutosave.saving && (
                <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>Opslaan…</span>
              )}
              {bodyAutosave.saved && (
                <span className="text-[10px]" style={{ color: "var(--color-success)" }}>Opgeslagen</span>
              )}
              {!sop.body && (
                <button
                  onClick={() => bodyAutosave.handleChange(SOP_TEMPLATE)}
                  className="text-xs px-2 py-0.5 rounded-full transition-opacity hover:opacity-70"
                  style={{
                    background: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
                    color: "var(--color-accent)",
                  }}
                >
                  Sjabloon invoegen
                </button>
              )}
            </div>
          </div>
          <textarea
            value={bodyAutosave.value}
            onChange={(e) => bodyAutosave.handleChange(e.target.value)}
            placeholder={SOP_TEMPLATE}
            rows={24}
            className="w-full rounded-lg px-4 py-3 text-sm outline-none transition-colors resize-y font-mono"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
              lineHeight: "1.7",
              minHeight: 400,
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
          />
          <p className="text-[11px] mt-1.5" style={{ color: "var(--color-text-tertiary)" }}>
            Gebruik ## voor koppen, - [ ] voor checkboxes. Wijzigingen worden automatisch opgeslagen.
          </p>
        </div>
      </div>
    </div>
  );
}

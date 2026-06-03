"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, CalendarDays, Users, CheckSquare } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import type { Meeting, Task, TaskInsert } from "@/lib/supabase/types";
import { formatDate } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const MEETING_TYPES = ["Wekelijks", "Strategie", "Review", "Sprint", "1-op-1", "Leverancier", "Anders"];

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  Wekelijks: { bg: "color-mix(in srgb, #0A84FF 15%, transparent)", color: "#0A84FF" },
  Strategie: { bg: "color-mix(in srgb, #BF5AF2 15%, transparent)", color: "#BF5AF2" },
  Review: { bg: "color-mix(in srgb, #30D158 15%, transparent)", color: "#30D158" },
  Sprint: { bg: "color-mix(in srgb, #FF9F0A 15%, transparent)", color: "#FF9F0A" },
  "1-op-1": { bg: "color-mix(in srgb, #FF375F 15%, transparent)", color: "#FF375F" },
  Leverancier: { bg: "color-mix(in srgb, #64D2FF 15%, transparent)", color: "#64D2FF" },
  Anders: { bg: "color-mix(in srgb, #8E8E93 15%, transparent)", color: "#8E8E93" },
};

const ASSIGNEE_CONFIG: Record<string, { bg: string; initials: string }> = {
  Ian: { bg: "#0A84FF", initials: "IA" },
  Tygo: { bg: "#30D158", initials: "TY" },
};

const ATTENDEES_LIST = ["Ian", "Tygo"];
const PRIORITY_LIST = ["P1", "P2", "P3", "P4"];
const AREAS = ["Marketing", "Inkoop", "Operaties", "Finance", "Groei", "Overig"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string | null }) {
  if (!type) return null;
  const cfg = TYPE_COLORS[type] ?? TYPE_COLORS.Anders;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {type}
    </span>
  );
}

function AttendeeAvatar({ name }: { name: string }) {
  const cfg = ASSIGNEE_CONFIG[name] ?? { bg: "#8E8E93", initials: name.slice(0, 2).toUpperCase() };
  return (
    <span
      title={name}
      className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[10px] font-bold text-white ring-2"
      style={{ background: cfg.bg }}
    >
      {cfg.initials}
    </span>
  );
}

// ─── Autosave Textarea ────────────────────────────────────────────────────────

interface AutosaveTextareaProps {
  value: string;
  placeholder: string;
  onSave: (val: string) => Promise<void>;
  rows?: number;
  label: string;
}

function AutosaveTextarea({ value: initialValue, placeholder, onSave, rows = 6, label }: AutosaveTextareaProps) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    setSaved(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSaving(true);
      await onSave(e.target.value);
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 800);
  };

  const labelClass = "block text-xs font-semibold mb-1.5 uppercase tracking-wide";
  const labelStyle = { color: "var(--color-text-tertiary)" };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className={labelClass} style={labelStyle}>{label}</label>
        {saving && <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>Opslaan…</span>}
        {saved && <span className="text-[10px]" style={{ color: "var(--color-success)" }}>Opgeslagen</span>}
      </div>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors resize-y"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text-primary)",
          lineHeight: "1.6",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
      />
    </div>
  );
}

// ─── Action Item Card ─────────────────────────────────────────────────────────

function ActionItemCard({ task }: { task: Task }) {
  const priorityColors: Record<string, string> = {
    P1: "#FF3B30", P2: "#FF9F0A", P3: "#FFD60A", P4: "#8E8E93",
  };
  const color = priorityColors[task.priority ?? "P4"] ?? "#8E8E93";

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-[10px] border"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      <CheckSquare size={14} style={{ color: "var(--color-text-tertiary)", marginTop: 2, flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight" style={{ color: "var(--color-text-primary)" }}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {task.priority && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded"
              style={{
                background: `color-mix(in srgb, ${color} 15%, transparent)`,
                color,
              }}
            >
              {task.priority}
            </span>
          )}
          {task.assignee && (
            <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>{task.assignee}</span>
          )}
          {task.deadline && (
            <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
              {new Date(task.deadline).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
            </span>
          )}
        </div>
      </div>
      <span
        className="text-[10px] px-1.5 py-0.5 rounded capitalize"
        style={{
          background: "color-mix(in srgb, var(--color-text-tertiary) 10%, transparent)",
          color: "var(--color-text-tertiary)",
        }}
      >
        {task.status}
      </span>
    </div>
  );
}

// ─── New Action Item Form ─────────────────────────────────────────────────────

interface NewActionItemProps {
  meetingId: string;
  onSuccess: () => void;
}

function NewActionItemForm({ meetingId, onSuccess }: NewActionItemProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", priority: "P3", assignee: "", deadline: "", area: "" });
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Titel is verplicht."); return; }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const insert: TaskInsert = {
      title: form.title.trim(),
      status: "te_doen",
      priority: form.priority || null,
      assignee: form.assignee || null,
      deadline: form.deadline || null,
      area: form.area || null,
      meeting_id: meetingId,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await supabase.from("nucleus_tasks").insert(insert as any);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setForm({ title: "", priority: "P3", assignee: "", deadline: "", area: "" });
    setOpen(false);
    onSuccess();
  };

  const inputClass = "w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors";
  const inputStyle = { background: "var(--color-bg)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" };
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = "var(--color-accent)");
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = "var(--color-border)");
  const labelClass = "block text-xs font-semibold mb-1 uppercase tracking-wide";
  const labelStyle = { color: "var(--color-text-tertiary)" };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80"
        style={{ background: "var(--color-accent)", color: "#fff" }}
      >
        <Plus size={12} />
        Actiepunt toevoegen
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 p-3 rounded-[10px]" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
      <div>
        <label className={labelClass} style={labelStyle}>Titel *</label>
        <input type="text" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Actiepunt…" className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className={labelClass} style={labelStyle}>Prioriteit</label>
          <select value={form.priority} onChange={(e) => set("priority", e.target.value)} className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
            {PRIORITY_LIST.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>Wie</label>
          <select value={form.assignee} onChange={(e) => set("assignee", e.target.value)} className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
            <option value="">— Niemand —</option>
            {ATTENDEES_LIST.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>Deadline</label>
          <input type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>Gebied</label>
          <select value={form.area} onChange={(e) => set("area", e.target.value)} className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
            <option value="">—</option>
            {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
      {error && <p className="text-xs" style={{ color: "var(--color-danger)" }}>{error}</p>}
      <div className="flex items-center gap-2">
        <button type="submit" disabled={saving} className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50" style={{ background: "var(--color-accent)", color: "#fff" }}>
          {saving ? "Aanmaken…" : "Actiepunt aanmaken"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
          Annuleren
        </button>
      </div>
    </form>
  );
}

// ─── Meeting Detail Page ──────────────────────────────────────────────────────

export default function MeetingDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [actionItems, setActionItems] = useState<Task[]>([]);
  const [editingAttendees, setEditingAttendees] = useState(false);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const [{ data: meetingData }, { data: tasksData }] = await Promise.all([
      supabase.from("nucleus_meetings").select("*").eq("id", id).single(),
      supabase.from("nucleus_tasks").select("*").eq("meeting_id", id).order("created_at", { ascending: true }),
    ]);
    if (meetingData) setMeeting(meetingData);
    if (tasksData) setActionItems(tasksData);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateField = async (field: string, value: string | string[] | null) => {
    const supabase = createClient();
    const table = supabase.from("nucleus_meetings");
    // @ts-expect-error supabase generated update type is overly strict for dynamic fields
    await table.update({ [field]: value }).eq("id", id);
    setMeeting((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  const toggleAttendee = async (name: string) => {
    const current = meeting?.attendees ?? [];
    const updated = current.includes(name)
      ? current.filter((a) => a !== name)
      : [...current, name];
    await updateField("attendees", updated);
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full px-4 md:px-4 md:px-8 py-3 md:py-4 md:py-8 gap-6">
        <div className="h-8 w-48 rounded-lg animate-pulse" style={{ background: "var(--color-card)" }} />
        <div className="h-12 w-96 rounded-xl animate-pulse" style={{ background: "var(--color-card)" }} />
        <div className="h-48 rounded-xl animate-pulse" style={{ background: "var(--color-card)" }} />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-lg font-semibold" style={{ color: "var(--color-text-secondary)" }}>Vergadering niet gevonden</p>
        <Link href="/meetings" className="text-sm font-medium hover:underline" style={{ color: "var(--color-accent)" }}>
          ← Terug naar vergaderingen
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div
        className="flex items-center gap-4 px-4 md:px-8 py-3 md:py-4 flex-shrink-0 sticky top-0 z-10"
        style={{ background: "var(--color-bg)", borderBottom: "1px solid var(--color-border)" }}
      >
        <Link
          href="/meetings"
          className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <ArrowLeft size={15} />
          Vergaderingen
        </Link>
        <span style={{ color: "var(--color-border)" }}>·</span>
        <TypeBadge type={meeting.type} />
      </div>

      {/* Content */}
      <div className="flex-1 px-4 md:px-8 py-4 md:py-6 max-w-4xl w-full mx-auto space-y-6">
        {/* Title */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <h1 className="text-[28px] font-bold leading-tight" style={{ color: "var(--color-text-primary)" }}>
            {meeting.title}
          </h1>
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <CalendarDays size={13} style={{ color: "var(--color-text-tertiary)" }} />
              <span className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>
                {formatDate(meeting.date)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Users size={13} style={{ color: "var(--color-text-tertiary)" }} />
              <div className="flex items-center gap-1">
                {(meeting.attendees ?? []).map((a) => (
                  <AttendeeAvatar key={a} name={a} />
                ))}
                <button
                  onClick={() => setEditingAttendees((v) => !v)}
                  className="text-xs px-2 py-0.5 rounded-full ml-1 transition-opacity hover:opacity-70"
                  style={{
                    background: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
                    color: "var(--color-accent)",
                  }}
                >
                  {editingAttendees ? "Klaar" : "Bewerken"}
                </button>
              </div>
            </div>
          </div>

          {editingAttendees && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex items-center gap-2 mt-3 flex-wrap"
            >
              {ATTENDEES_LIST.map((name) => {
                const selected = (meeting.attendees ?? []).includes(name);
                const cfg = ASSIGNEE_CONFIG[name];
                return (
                  <button
                    key={name}
                    onClick={() => toggleAttendee(name)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: selected ? cfg.bg : "var(--color-surface)",
                      color: selected ? "#fff" : "var(--color-text-secondary)",
                      border: `1px solid ${selected ? cfg.bg : "var(--color-border)"}`,
                    }}
                  >
                    {name}
                  </button>
                );
              })}
            </motion.div>
          )}
        </motion.div>

        {/* Meta fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>Type</label>
            <select
              value={meeting.type ?? ""}
              onChange={(e) => updateField("type", e.target.value || null)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
            >
              <option value="">— Geen —</option>
              {MEETING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>Datum</label>
            <input
              type="date"
              value={meeting.date}
              onChange={(e) => updateField("date", e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
            />
          </div>
        </div>

        {/* Agenda */}
        <AutosaveTextarea
          label="Agenda"
          value={meeting.agenda ?? ""}
          placeholder="Voeg agenda toe…"
          rows={6}
          onSave={(v) => updateField("agenda", v || null)}
        />

        {/* Decisions */}
        <AutosaveTextarea
          label="Besluiten"
          value={meeting.decisions ?? ""}
          placeholder="Voeg besluiten toe…"
          rows={5}
          onSave={(v) => updateField("decisions", v || null)}
        />

        {/* Action Items */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--color-text-secondary)" }}>
              Actiepunten ({actionItems.length})
            </h2>
          </div>

          <div className="space-y-2 mb-3">
            {actionItems.map((task) => (
              <ActionItemCard key={task.id} task={task} />
            ))}
            {actionItems.length === 0 && (
              <p className="text-sm py-3" style={{ color: "var(--color-text-tertiary)" }}>
                Geen actiepunten voor deze vergadering.
              </p>
            )}
          </div>

          <NewActionItemForm meetingId={id} onSuccess={fetchData} />
        </div>

        {/* Linked items */}
        {((meeting.product_ids?.length ?? 0) > 0 ||
          (meeting.campaign_ids?.length ?? 0) > 0 ||
          (meeting.supplier_ids?.length ?? 0) > 0) && (
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide mb-3" style={{ color: "var(--color-text-secondary)" }}>
              Gelinkte items
            </h2>
            <div className="flex flex-wrap gap-2">
              {(meeting.product_ids ?? []).map((pid) => (
                <Link key={pid} href={`/products/${pid}`}>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium hover:opacity-80 transition-opacity"
                    style={{ background: "color-mix(in srgb, #30D158 15%, transparent)", color: "#30D158" }}>
                    Product: {pid.slice(0, 8)}…
                  </span>
                </Link>
              ))}
              {(meeting.campaign_ids ?? []).map((cid) => (
                <Link key={cid} href={`/campaigns`}>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium hover:opacity-80 transition-opacity"
                    style={{ background: "color-mix(in srgb, #0A84FF 15%, transparent)", color: "#0A84FF" }}>
                    Campagne: {cid.slice(0, 8)}…
                  </span>
                </Link>
              ))}
              {(meeting.supplier_ids ?? []).map((sid) => (
                <Link key={sid} href={`/suppliers`}>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium hover:opacity-80 transition-opacity"
                    style={{ background: "color-mix(in srgb, #FF9F0A 15%, transparent)", color: "#FF9F0A" }}>
                    Leverancier: {sid.slice(0, 8)}…
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

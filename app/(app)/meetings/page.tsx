"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, CalendarDays, Users } from "lucide-react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import type { Meeting, MeetingInsert } from "@/lib/supabase/types";
import { formatDate } from "@/lib/utils";
import { SlideOver } from "@/components/ui";
import { useRealtime } from "@/hooks/useRealtime";

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

const ATTENDEES_LIST = ["Ian", "Tygo"];

const ASSIGNEE_CONFIG: Record<string, { bg: string; initials: string }> = {
  Ian: { bg: "#0A84FF", initials: "IA" },
  Tygo: { bg: "#30D158", initials: "TY" },
};

// ─── Type Badge ───────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string | null }) {
  if (!type) return null;
  const cfg = TYPE_COLORS[type] ?? TYPE_COLORS.Anders;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {type}
    </span>
  );
}

// ─── Attendee Avatars ─────────────────────────────────────────────────────────

function AttendeeAvatars({ attendees }: { attendees: string[] | null }) {
  if (!attendees || attendees.length === 0) return null;
  return (
    <div className="flex items-center -space-x-1">
      {attendees.map((a) => {
        const cfg = ASSIGNEE_CONFIG[a] ?? { bg: "#8E8E93", initials: a.slice(0, 2).toUpperCase() };
        return (
          <span
            key={a}
            title={a}
            className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[9px] font-bold text-white ring-2 ring-[var(--color-card)]"
            style={{ background: cfg.bg }}
          >
            {cfg.initials}
          </span>
        );
      })}
    </div>
  );
}

// ─── Meeting Card ─────────────────────────────────────────────────────────────

function MeetingCard({ meeting }: { meeting: Meeting }) {
  return (
    <Link href={`/meetings/${meeting.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="rounded-[12px] border p-4 cursor-pointer"
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
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="text-[14px] font-semibold leading-tight" style={{ color: "var(--color-text-primary)" }}>
            {meeting.title}
          </h3>
          <TypeBadge type={meeting.type} />
        </div>

        <div className="flex items-center justify-between gap-2 mt-3">
          <div className="flex items-center gap-1.5">
            <CalendarDays size={12} style={{ color: "var(--color-text-tertiary)" }} />
            <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              {formatDate(meeting.date)}
            </span>
          </div>
          <AttendeeAvatars attendees={meeting.attendees} />
        </div>

        {meeting.decisions && (
          <p className="text-xs mt-2 line-clamp-1" style={{ color: "var(--color-text-tertiary)" }}>
            {meeting.decisions}
          </p>
        )}
      </motion.div>
    </Link>
  );
}

// ─── Create Meeting Form ──────────────────────────────────────────────────────

interface CreateFormProps {
  onSuccess: () => void;
  onClose: () => void;
}

function CreateMeetingForm({ onSuccess, onClose }: CreateFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    date: new Date().toISOString().split("T")[0],
    type: "Wekelijks",
    attendees: [] as string[],
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const toggleAttendee = (name: string) => {
    setForm((p) => ({
      ...p,
      attendees: p.attendees.includes(name)
        ? p.attendees.filter((a) => a !== name)
        : [...p.attendees, name],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Titel is verplicht."); return; }
    if (!form.date) { setError("Datum is verplicht."); return; }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const insert: MeetingInsert = {
      title: form.title.trim(),
      date: form.date,
      type: form.type || null,
      attendees: form.attendees.length > 0 ? form.attendees : null,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await supabase.from("nucleus_meetings").insert(insert as any);
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
        <input
          type="text"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Vergadernaam…"
          className={inputClass}
          style={inputStyle}
          onFocus={onFocus}
          onBlur={onBlur}
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} style={labelStyle}>Datum <span style={{ color: "var(--color-danger)" }}>*</span></label>
          <input type="date" value={form.date} onChange={(e) => set("date", e.target.value)} className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>Type</label>
          <select value={form.type} onChange={(e) => set("type", e.target.value)} className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
            {MEETING_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass} style={labelStyle}>Deelnemers</label>
        <div className="flex items-center gap-2 flex-wrap">
          {ATTENDEES_LIST.map((name) => {
            const selected = form.attendees.includes(name);
            const cfg = ASSIGNEE_CONFIG[name];
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggleAttendee(name)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: selected ? cfg.bg : "var(--color-surface)",
                  color: selected ? "#fff" : "var(--color-text-secondary)",
                  border: `1px solid ${selected ? cfg.bg : "var(--color-border)"}`,
                }}
              >
                <span className="w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center" style={{ background: selected ? "rgba(255,255,255,0.3)" : cfg.bg, color: "#fff" }}>
                  {cfg.initials}
                </span>
                {name}
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50" style={{ background: "var(--color-accent)", color: "#fff" }}>
          {saving ? "Aanmaken…" : "Vergadering aanmaken"}
        </button>
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
          Annuleren
        </button>
      </div>
    </form>
  );
}

// ─── Meetings Page ────────────────────────────────────────────────────────────

export default function MeetingsPage() {
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("nucleus_meetings")
      .select("*")
      .order("date", { ascending: false });
    if (data) setMeetings(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);
  useRealtime("nucleus_meetings", fetchMeetings);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 md:px-8 py-4 md:py-5 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div>
          <h1 className="text-[24px] font-bold leading-tight" style={{ color: "var(--color-text-primary)" }}>
            Vergaderingen
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
            {meetings.length} vergadering{meetings.length !== 1 ? "en" : ""} gelogd
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: "var(--color-accent)", color: "#fff" }}
        >
          <Plus size={15} />
          Nieuwe vergadering
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 rounded-[12px] animate-pulse" style={{ background: "var(--color-card)" }} />
            ))}
          </div>
        ) : meetings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <CalendarDays size={32} style={{ color: "var(--color-text-tertiary)" }} />
            <p className="text-base font-semibold" style={{ color: "var(--color-text-secondary)" }}>
              Geen vergaderingen gevonden
            </p>
            <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>
              Log je eerste vergadering om te beginnen.
            </p>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 mt-2"
              style={{ background: "var(--color-accent)", color: "#fff" }}
            >
              <Plus size={14} />
              Nieuwe vergadering
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {meetings.map((m) => (
                <MeetingCard key={m.id} meeting={m} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create meeting SlideOver */}
      <SlideOver open={createOpen} onClose={() => setCreateOpen(false)} title="Nieuwe vergadering" width="md">
        <CreateMeetingForm onSuccess={fetchMeetings} onClose={() => setCreateOpen(false)} />
      </SlideOver>
    </div>
  );
}

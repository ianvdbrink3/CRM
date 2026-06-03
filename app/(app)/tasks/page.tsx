"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, CheckSquare, Clock, Loader2, Pause, CheckCircle2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { Task, TaskInsert } from "@/lib/supabase/types";
import { formatDate } from "@/lib/utils";
import { SlideOver } from "@/components/ui";
import { useRealtime } from "@/hooks/useRealtime";

// ─── Constants ────────────────────────────────────────────────────────────────

type KanbanStatus = "todo" | "in_progress" | "waiting" | "done";

const COLUMNS: { id: KanbanStatus; label: string; icon: React.ReactNode }[] = [
  { id: "todo", label: "Te doen", icon: <CheckSquare size={14} /> },
  { id: "in_progress", label: "Bezig", icon: <Loader2 size={14} /> },
  { id: "waiting", label: "Wachten", icon: <Pause size={14} /> },
  { id: "done", label: "Klaar", icon: <CheckCircle2 size={14} /> },
];

type Priority = "P1" | "P2" | "P3" | "P4";

const PRIORITY_STYLES: Record<Priority, { bg: string; color: string; label: string }> = {
  P1: { bg: "color-mix(in srgb, #ef4444 15%, transparent)", color: "#ef4444", label: "P1 · Urgent" },
  P2: { bg: "color-mix(in srgb, #f97316 15%, transparent)", color: "#f97316", label: "P2 · Hoog" },
  P3: { bg: "color-mix(in srgb, #eab308 15%, transparent)", color: "#eab308", label: "P3 · Normaal" },
  P4: { bg: "color-mix(in srgb, #6b7280 15%, transparent)", color: "#9ca3af", label: "P4 · Laag" },
};

const PRIORITY_ORDER: Record<string, number> = { P1: 0, P2: 1, P3: 2, P4: 3 };

const ASSIGNEE_STYLES: Record<string, { bg: string; label: string }> = {
  Ian: { bg: "#3b82f6", label: "IA" },
  Tygo: { bg: "#22c55e", label: "TY" },
};

const AREAS = ["Marketing", "Operations", "Finance", "Product", "Tech", "Overig"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const today = new Date();
  const d = new Date(dateStr);
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) < today;
}

// ─── Priority Badge ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: string | null }) {
  const p = (priority ?? "P4") as Priority;
  const style = PRIORITY_STYLES[p] ?? PRIORITY_STYLES.P4;
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap"
      style={{ background: style.bg, color: style.color }}
    >
      {p}
    </span>
  );
}

// ─── Assignee Avatar ──────────────────────────────────────────────────────────

function AssigneeAvatar({ assignee }: { assignee: string | null }) {
  if (!assignee) return null;
  const style = ASSIGNEE_STYLES[assignee] ?? { bg: "#6b7280", label: assignee.slice(0, 2).toUpperCase() };
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-[10px] font-bold text-white flex-shrink-0"
      style={{ background: style.bg, width: 22, height: 22 }}
      title={assignee}
    >
      {style.label}
    </span>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  onStatusChange: (id: string, status: string) => void;
  onClick: () => void;
}

function TaskCard({ task, onStatusChange, onClick }: TaskCardProps) {
  const overdue = isOverdue(task.deadline) && task.status !== "done";
  const todayDue = isToday(task.deadline);

  const nextStatus: Record<string, string> = {
    todo: "in_progress",
    in_progress: "done",
    waiting: "done",
    done: "todo",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      onClick={onClick}
      className="rounded-[10px] border p-3 cursor-pointer select-none group"
      style={{
        background: "var(--color-card)",
        borderColor: overdue ? "color-mix(in srgb, var(--color-danger) 40%, var(--color-border))" : "var(--color-border)",
        boxShadow: "var(--shadow-sm)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--color-accent)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor = overdue
          ? "color-mix(in srgb, var(--color-danger) 40%, var(--color-border))"
          : "var(--color-border)";
      }}
    >
      {/* Title row */}
      <div className="flex items-start gap-2 mb-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStatusChange(task.id, nextStatus[task.status] ?? "done");
          }}
          className="mt-0.5 flex-shrink-0 w-4 h-4 rounded border transition-colors flex items-center justify-center"
          style={{
            borderColor: task.status === "done" ? "var(--color-success)" : "var(--color-border)",
            background: task.status === "done"
              ? "color-mix(in srgb, var(--color-success) 15%, transparent)"
              : "transparent",
          }}
          title="Status wijzigen"
        >
          {task.status === "done" && (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5l2.5 2.5L8 3" stroke="var(--color-success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <span
          className="text-[13px] font-medium leading-tight flex-1 line-clamp-2"
          style={{
            color: task.status === "done" ? "var(--color-text-tertiary)" : "var(--color-text-primary)",
            textDecoration: task.status === "done" ? "line-through" : "none",
          }}
        >
          {task.title}
        </span>
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <PriorityBadge priority={task.priority} />
          {task.area && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: "color-mix(in srgb, var(--color-text-tertiary) 10%, transparent)",
                color: "var(--color-text-tertiary)",
              }}
            >
              {task.area}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {task.deadline && (
            <span
              className="text-[10px] tabular-nums"
              style={{
                color: overdue
                  ? "var(--color-danger)"
                  : todayDue
                  ? "#f97316"
                  : "var(--color-text-tertiary)",
                fontWeight: (overdue || todayDue) ? "600" : "400",
              }}
            >
              {overdue ? "!" : ""}{new Date(task.deadline).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
            </span>
          )}
          <AssigneeAvatar assignee={task.assignee} />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  col: (typeof COLUMNS)[number];
  tasks: Task[];
  onStatusChange: (id: string, status: string) => void;
  onCardClick: (task: Task) => void;
}

function KanbanColumn({ col, tasks, onStatusChange, onCardClick }: KanbanColumnProps) {
  const sorted = [...tasks].sort(
    (a, b) => (PRIORITY_ORDER[a.priority ?? "P4"] ?? 3) - (PRIORITY_ORDER[b.priority ?? "P4"] ?? 3)
  );

  return (
    <div
      className="flex flex-col min-w-[220px] w-[240px] flex-shrink-0 rounded-[14px]"
      style={{
        background: "var(--color-surface)",
        border: "1.5px solid var(--color-border)",
      }}
    >
      {/* Header */}
      <div
        className="px-3 py-2.5 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div className="flex items-center gap-1.5">
          <span style={{ color: "var(--color-text-tertiary)" }}>{col.icon}</span>
          <span
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {col.label}
          </span>
        </div>
        <span
          className="text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded-full"
          style={{
            background: "color-mix(in srgb, var(--color-text-tertiary) 12%, transparent)",
            color: "var(--color-text-tertiary)",
          }}
        >
          {tasks.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-2 flex-1 min-h-[80px] overflow-y-auto">
        <AnimatePresence>
          {sorted.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onStatusChange={onStatusChange}
              onClick={() => onCardClick(task)}
            />
          ))}
        </AnimatePresence>
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <CheckSquare size={18} style={{ color: "var(--color-text-tertiary)" }} />
            <p className="text-xs text-center" style={{ color: "var(--color-text-tertiary)" }}>
              Geen taken
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Task Detail SlideOver ────────────────────────────────────────────────────

interface TaskDetailProps {
  task: Task | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

function TaskDetailSlideOver({ task, open, onClose, onUpdated, onDeleted }: TaskDetailProps) {
  const [form, setForm] = useState({
    title: "",
    status: "todo",
    priority: "P3",
    assignee: "",
    deadline: "",
    area: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        status: task.status,
        priority: task.priority ?? "P3",
        assignee: task.assignee ?? "",
        deadline: task.deadline ?? "",
        area: task.area ?? "",
      });
      setError(null);
    }
  }, [task]);

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleSave = async () => {
    if (!task || !form.title.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const taskTable = supabase.from("nucleus_tasks");
    // @ts-expect-error supabase generated update type is overly strict
    const { error: err } = await taskTable.update({
        title: form.title.trim(),
        status: form.status,
        priority: form.priority || null,
        assignee: form.assignee || null,
        deadline: form.deadline || null,
        area: form.area || null,
      }).eq("id", task.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    onUpdated();
  };

  const handleDelete = async () => {
    if (!task) return;
    await createClient().from("nucleus_tasks").delete().eq("id", task.id);
    onDeleted();
    onClose();
  };

  const inputClass = "w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors";
  const inputStyle = { background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" };
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    (e.currentTarget.style.borderColor = "var(--color-accent)");
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    (e.currentTarget.style.borderColor = "var(--color-border)");
  const labelClass = "block text-xs font-semibold mb-1.5 uppercase tracking-wide";
  const labelStyle = { color: "var(--color-text-tertiary)" };

  return (
    <SlideOver open={open} onClose={onClose} title={task?.title ?? "Taak"} width="md">
      {task && (
        <div className="space-y-4">
          <div>
            <label className={labelClass} style={labelStyle}>Titel</label>
            <input type="text" value={form.title} onChange={(e) => set("title", e.target.value)}
              className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={labelStyle}>Status</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)}
                className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Prioriteit</label>
              <select value={form.priority} onChange={(e) => set("priority", e.target.value)}
                className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                {(["P1", "P2", "P3", "P4"] as Priority[]).map((p) => (
                  <option key={p} value={p}>{PRIORITY_STYLES[p].label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={labelStyle}>Verantwoordelijke</label>
              <select value={form.assignee} onChange={(e) => set("assignee", e.target.value)}
                className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                <option value="">— Niemand —</option>
                <option value="Ian">Ian</option>
                <option value="Tygo">Tygo</option>
              </select>
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Deadline</label>
              <input type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)}
                className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>
          <div>
            <label className={labelClass} style={labelStyle}>Gebied</label>
            <select value={form.area} onChange={(e) => set("area", e.target.value)}
              className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
              <option value="">— Kies gebied —</option>
              {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          {error && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>}
          {task.deadline && (
            <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              Aangemaakt: {formatDate(task.created_at)}
            </p>
          )}
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: "var(--color-accent)", color: "#fff" }}>
              {saving ? "Opslaan…" : "Opslaan"}
            </button>
            <button onClick={handleDelete}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: "color-mix(in srgb, var(--color-danger) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)",
                color: "var(--color-danger)",
              }}>
              Verwijderen
            </button>
          </div>
        </div>
      )}
    </SlideOver>
  );
}

// ─── Quick-add form ───────────────────────────────────────────────────────────

interface QuickAddProps {
  onSuccess: () => void;
}

function QuickAddTask({ onSuccess }: QuickAddProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    priority: "P3",
    assignee: "",
    deadline: "",
    area: "",
    status: "todo",
  });

  const set = (key: string, val: string) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const insert: TaskInsert = {
      title: form.title.trim(),
      status: form.status,
      priority: form.priority || null,
      assignee: form.assignee || null,
      deadline: form.deadline || null,
      area: form.area || null,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from("nucleus_tasks").insert(insert as any);
    setSaving(false);
    setForm({ title: "", priority: "P3", assignee: "", deadline: "", area: "", status: "todo" });
    setOpen(false);
    onSuccess();
  };

  const inputClass = "w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors";
  const inputStyle = { background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)" };
  const onFocusEv = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = "var(--color-accent)");
  const onBlurEv = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = "var(--color-border)");
  const labelClass = "block text-xs font-semibold mb-1.5 uppercase tracking-wide";
  const labelStyle = { color: "var(--color-text-tertiary)" };

  return (
    <div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="mb-4 rounded-[14px] border p-4"
            style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
          >
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className={labelClass} style={labelStyle}>
                  Titel <span style={{ color: "var(--color-danger)" }}>*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Taaknaam…"
                  className={inputClass}
                  style={inputStyle}
                  onFocus={onFocusEv}
                  onBlur={onBlurEv}
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <label className={labelClass} style={labelStyle}>Prioriteit</label>
                  <select value={form.priority} onChange={(e) => set("priority", e.target.value)}
                    className={inputClass} style={inputStyle} onFocus={onFocusEv} onBlur={onBlurEv}>
                    {(["P1", "P2", "P3", "P4"] as Priority[]).map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>Wie</label>
                  <select value={form.assignee} onChange={(e) => set("assignee", e.target.value)}
                    className={inputClass} style={inputStyle} onFocus={onFocusEv} onBlur={onBlurEv}>
                    <option value="">— Niemand —</option>
                    <option value="Ian">Ian</option>
                    <option value="Tygo">Tygo</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>Deadline</label>
                  <input type="date" value={form.deadline} onChange={(e) => set("deadline", e.target.value)}
                    className={inputClass} style={inputStyle} onFocus={onFocusEv} onBlur={onBlurEv} />
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>Gebied</label>
                  <select value={form.area} onChange={(e) => set("area", e.target.value)}
                    className={inputClass} style={inputStyle} onFocus={onFocusEv} onBlur={onBlurEv}>
                    <option value="">—</option>
                    {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ background: "var(--color-accent)", color: "#fff" }}>
                  {saving ? "Aanmaken…" : "Taak aanmaken"}
                </button>
                <button type="button" onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
                  Annuleren
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 mb-4"
          style={{ background: "var(--color-accent)", color: "#fff" }}
        >
          <Plus size={15} />
          Nieuwe taak
        </button>
      )}
    </div>
  );
}

// ─── Tasks Page ───────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [todayFilter, setTodayFilter] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("nucleus_tasks")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setTasks(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useRealtime("nucleus_tasks", fetchTasks);

  const handleStatusChange = async (id: string, status: string) => {
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    const supabase = createClient();
    const tasksTable = supabase.from("nucleus_tasks");
    // @ts-expect-error supabase generated update type is overly strict
    await tasksTable.update({ status }).eq("id", id);
  };

  const filteredTasks = todayFilter
    ? tasks.filter((t) => (isToday(t.deadline) || (isOverdue(t.deadline) && t.status !== "done")) && t.status !== "done")
    : tasks;

  const tasksByColumn = COLUMNS.reduce<Record<string, Task[]>>((acc, col) => {
    acc[col.id] = filteredTasks.filter((t) => t.status === col.id);
    return acc;
  }, {});

  const todayCount = tasks.filter(
    (t) => (isToday(t.deadline) || isOverdue(t.deadline)) && t.status !== "done"
  ).length;

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 md:px-8 py-4 md:py-5 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div>
          <h1 className="text-[24px] font-bold leading-tight" style={{ color: "var(--color-text-primary)" }}>
            Taken
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
            {tasks.filter((t) => t.status !== "done").length} open taken
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Vandaag filter */}
          <button
            onClick={() => setTodayFilter((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: todayFilter ? "var(--color-accent)" : "var(--color-card)",
              color: todayFilter ? "#fff" : "var(--color-text-secondary)",
              border: `1px solid ${todayFilter ? "var(--color-accent)" : "var(--color-border)"}`,
            }}
          >
            <Clock size={14} />
            Vandaag
            {todayCount > 0 && (
              <span
                className="inline-flex items-center justify-center rounded-full text-[10px] font-bold"
                style={{
                  width: 18,
                  height: 18,
                  background: todayFilter ? "rgba(255,255,255,0.3)" : "var(--color-danger)",
                  color: "#fff",
                }}
              >
                {todayCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Board ── */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 md:px-8 py-4 md:py-6">
        {/* Quick-add */}
        <QuickAddTask onSuccess={fetchTasks} />

        {loading ? (
          <div className="flex gap-4">
            {COLUMNS.map((col) => (
              <div
                key={col.id}
                className="min-w-[240px] w-[240px] h-48 rounded-[14px] animate-pulse"
                style={{ background: "var(--color-card)" }}
              />
            ))}
          </div>
        ) : (
          <div className="flex gap-3 h-full items-start">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                col={col}
                tasks={tasksByColumn[col.id] ?? []}
                onStatusChange={handleStatusChange}
                onCardClick={(t) => setSelectedTask(t)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Task detail ── */}
      <TaskDetailSlideOver
        task={selectedTask}
        open={selectedTask !== null}
        onClose={() => setSelectedTask(null)}
        onUpdated={() => { fetchTasks(); setSelectedTask(null); }}
        onDeleted={fetchTasks}
      />
    </div>
  );
}

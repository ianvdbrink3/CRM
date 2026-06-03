"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, List, Plus, Megaphone, Trash2, ExternalLink, Check } from "lucide-react";
import Link from "next/link";

import { createClient } from "@/lib/supabase/client";
import type { Campaign, CampaignInsert, CampaignUpdate, Product, DailyMetrics } from "@/lib/supabase/types";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { StatusPill, DataTable, EmptyState, SlideOver } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useRealtime } from "@/hooks/useRealtime";

// ─── Types & Constants ────────────────────────────────────────────────────────

type CampaignStatus = "planned" | "active" | "scaling" | "paused" | "killed";
type Platform = "Meta" | "TikTok" | "Google";
type ViewMode = "board" | "table";

const BOARD_STATUSES: CampaignStatus[] = ["planned", "active", "scaling", "paused", "killed"];

const BOARD_STATUS_LABELS: Record<CampaignStatus, string> = {
  planned: "Gepland",
  active: "Actief",
  scaling: "Schalen",
  paused: "Gepauzeerd",
  killed: "Gestopt",
};

const ALL_STATUSES: CampaignStatus[] = ["planned", "active", "scaling", "paused", "killed"];

const PLATFORM_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  Meta: { bg: "color-mix(in srgb, #0082FB 15%, transparent)", color: "#0082FB", label: "Meta" },
  TikTok: { bg: "color-mix(in srgb, #010101 20%, transparent)", color: "#9ca3af", label: "TikTok" },
  Google: { bg: "color-mix(in srgb, #EA4335 15%, transparent)", color: "#EA4335", label: "Google" },
};

const PLATFORMS: Platform[] = ["Meta", "TikTok", "Google"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeRoas(revenue: number | null, adSpend: number | null): number | null {
  if (!adSpend || adSpend === 0 || revenue == null) return null;
  return revenue / adSpend;
}

function computeCpa(adSpend: number | null, orders: number | null): number | null {
  if (!orders || orders === 0 || adSpend == null) return null;
  return adSpend / orders;
}

function computeResultAfterSpend(revenue: number | null, adSpend: number | null): number | null {
  if (revenue == null || adSpend == null) return null;
  return revenue - adSpend;
}

function roasColor(roas: number | null, breakEven: number): string {
  if (roas == null) return "var(--color-text-tertiary)";
  if (roas >= breakEven) return "var(--color-success)";
  if (roas >= breakEven * 0.8) return "#FF9F0A";
  return "var(--color-danger)";
}

// ─── Inline Editable Cell ─────────────────────────────────────────────────────

interface EditableCellProps {
  value: number | null;
  onSave: (val: number | null) => void;
  format?: (n: number) => string;
  placeholder?: string;
}

function EditableCell({ value, onSave, format, placeholder = "—" }: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value != null ? String(value) : "");
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDraft(value != null ? String(value) : "");
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const commit = () => {
    setEditing(false);
    const parsed = draft.trim() === "" ? null : parseFloat(draft.replace(",", "."));
    if (isNaN(parsed as number)) {
      onSave(null);
    } else {
      onSave(parsed);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") commit();
    if (e.key === "Escape") {
      setEditing(false);
      setDraft(value != null ? String(value) : "");
    }
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        onClick={(e) => e.stopPropagation()}
        className="w-24 rounded px-1.5 py-0.5 text-sm tabular-nums outline-none"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-accent)",
          color: "var(--color-text-primary)",
        }}
        autoFocus
      />
    );
  }

  return (
    <span
      onClick={startEdit}
      className="cursor-text tabular-nums text-sm rounded px-1.5 py-0.5 transition-colors hover:underline"
      title="Klik om te bewerken"
      style={{ color: "var(--color-text-secondary)" }}
    >
      {value != null ? (format ? format(value) : String(value)) : placeholder}
    </span>
  );
}

// ─── Platform Badge ────────────────────────────────────────────────────────────

function PlatformBadge({ platform }: { platform: string }) {
  const cfg = PLATFORM_COLORS[platform] ?? {
    bg: "color-mix(in srgb, var(--color-text-tertiary) 12%, transparent)",
    color: "var(--color-text-secondary)",
    label: platform,
  };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  );
}

// ─── ROAS Badge ───────────────────────────────────────────────────────────────

function RoasBadge({ roas, breakEven }: { roas: number | null; breakEven: number }) {
  if (roas == null) {
    return (
      <span className="text-sm tabular-nums" style={{ color: "var(--color-text-tertiary)" }}>
        ROAS —
      </span>
    );
  }
  const color = roasColor(roas, breakEven);
  return (
    <span
      className="text-sm tabular-nums font-semibold"
      style={{ color }}
    >
      {formatNumber(roas)}x
    </span>
  );
}

// ─── Campaign Board Card ──────────────────────────────────────────────────────

interface CampaignCardProps {
  campaign: Campaign;
  breakEven: number;
  productName?: string;
  onClick: () => void;
}

function CampaignCard({ campaign, breakEven, productName, onClick }: CampaignCardProps) {
  const roas = computeRoas(campaign.revenue, campaign.ad_spend);
  const hasSpend = campaign.ad_spend != null && campaign.ad_spend > 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      onClick={onClick}
      className="rounded-[12px] border p-3 cursor-pointer select-none"
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
      {/* Name + platform */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className="text-[13px] font-semibold leading-tight line-clamp-2 flex-1"
          style={{ color: "var(--color-text-primary)" }}
        >
          {campaign.name}
        </span>
        <PlatformBadge platform={campaign.platform} />
      </div>

      {/* Product name */}
      {productName && (
        <p
          className="text-xs mb-2 truncate"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          {productName}
        </p>
      )}

      {/* ROAS */}
      <div className="mb-2">
        <RoasBadge roas={hasSpend ? roas : null} breakEven={breakEven} />
      </div>

      {/* Spend + revenue */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>
            Spend
          </span>
          <span className="text-xs tabular-nums font-medium" style={{ color: "var(--color-text-secondary)" }}>
            {campaign.ad_spend != null ? formatCurrency(campaign.ad_spend) : "—"}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 text-right">
          <span className="text-[10px] uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>
            Omzet
          </span>
          <span className="text-xs tabular-nums font-medium" style={{ color: "var(--color-text-secondary)" }}>
            {campaign.revenue != null ? formatCurrency(campaign.revenue) : "—"}
          </span>
        </div>
      </div>

      {/* Status pill */}
      <StatusPill status={campaign.status} />
    </motion.div>
  );
}

// ─── Board Column ─────────────────────────────────────────────────────────────

interface BoardColumnProps {
  status: CampaignStatus;
  campaigns: Campaign[];
  breakEven: number;
  productMap: Map<string, string>;
  onCardClick: (campaign: Campaign) => void;
}

function BoardColumn({ status, campaigns, breakEven, productMap, onCardClick }: BoardColumnProps) {
  return (
    <div
      className="flex flex-col min-w-[210px] w-[220px] flex-shrink-0 rounded-[14px]"
      style={{
        background: "var(--color-surface)",
        border: "1.5px solid var(--color-border)",
      }}
    >
      {/* Column header */}
      <div
        className="px-3 py-2.5 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {BOARD_STATUS_LABELS[status]}
        </span>
        <span
          className="text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded-full"
          style={{
            background: "color-mix(in srgb, var(--color-text-tertiary) 12%, transparent)",
            color: "var(--color-text-tertiary)",
          }}
        >
          {campaigns.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-2 flex-1 min-h-[80px]">
        <AnimatePresence>
          {campaigns.map((c) => (
            <CampaignCard
              key={c.id}
              campaign={c}
              breakEven={breakEven}
              productName={c.product_id ? productMap.get(c.product_id) : undefined}
              onClick={() => onCardClick(c)}
            />
          ))}
        </AnimatePresence>
        {campaigns.length === 0 && (
          <p
            className="text-xs text-center py-4"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Geen campagnes
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Campaign Detail SlideOver ────────────────────────────────────────────────

interface DetailSlideOverProps {
  campaign: Campaign | null;
  open: boolean;
  onClose: () => void;
  breakEven: number;
  productMap: Map<string, string>;
  onUpdated: () => void;
  onDeleted: () => void;
}

function CampaignDetailSlideOver({
  campaign,
  open,
  onClose,
  breakEven,
  productMap,
  onUpdated,
  onDeleted,
}: DetailSlideOverProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState<{
    name: string;
    platform: string;
    status: string;
    budget: string;
    ad_spend: string;
    revenue: string;
    orders: string;
    start_date: string;
  }>({
    name: "",
    platform: "Meta",
    status: "planned",
    budget: "",
    ad_spend: "",
    revenue: "",
    orders: "",
    start_date: "",
  });

  useEffect(() => {
    if (campaign) {
      setForm({
        name: campaign.name,
        platform: campaign.platform,
        status: campaign.status,
        budget: campaign.budget != null ? String(campaign.budget) : "",
        ad_spend: campaign.ad_spend != null ? String(campaign.ad_spend) : "",
        revenue: campaign.revenue != null ? String(campaign.revenue) : "",
        orders: campaign.orders != null ? String(campaign.orders) : "",
        start_date: campaign.start_date ?? "",
      });
      setError(null);
      setConfirmDelete(false);
    }
  }, [campaign]);

  const set = (key: string, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const parseOptionalFloat = (v: string) =>
    v.trim() === "" ? null : parseFloat(v.replace(",", "."));
  const parseOptionalInt = (v: string) =>
    v.trim() === "" ? null : parseInt(v, 10);

  // Live computed metrics from form values
  const liveSpend = parseOptionalFloat(form.ad_spend);
  const liveRevenue = parseOptionalFloat(form.revenue);
  const liveOrders = parseOptionalInt(form.orders);
  const liveRoas = computeRoas(liveRevenue, liveSpend);
  const liveCpa = computeCpa(liveSpend, liveOrders);
  const liveResult = computeResultAfterSpend(liveRevenue, liveSpend);

  const handleSave = async () => {
    if (!campaign) return;
    if (!form.name.trim()) {
      setError("Naam is verplicht.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const update: CampaignUpdate = {
      name: form.name.trim(),
      platform: form.platform,
      status: form.status,
      budget: parseOptionalFloat(form.budget),
      ad_spend: liveSpend,
      revenue: liveRevenue,
      orders: liveOrders,
      start_date: form.start_date || null,
    };
    const supabaseCampaign = supabase.from("nucleus_campaigns");
    // @ts-expect-error supabase generated update type is overly strict
    const { error: err } = await supabaseCampaign.update(update).eq("id", campaign.id);
    setSaving(false);
    if (err) {
      setError(err.message);
    } else {
      onUpdated();
    }
  };

  const handleDelete = async () => {
    if (!campaign) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("nucleus_campaigns").delete().eq("id", campaign.id);
    setDeleting(false);
    onDeleted();
    onClose();
  };

  const inputClass =
    "w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors";
  const inputStyle = {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    color: "var(--color-text-primary)",
  };
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = "var(--color-accent)");
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = "var(--color-border)");

  const labelClass =
    "block text-xs font-semibold mb-1.5 uppercase tracking-wide";
  const labelStyle = { color: "var(--color-text-tertiary)" };

  const productId = campaign?.product_id;
  const productName = productId ? productMap.get(productId) : null;

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={campaign?.name ?? "Campagne"}
      width="lg"
    >
      {campaign && (
        <div className="space-y-5">
          {/* Linked product */}
          {productName && productId && (
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-lg"
              style={{
                background: "color-mix(in srgb, var(--color-accent) 8%, transparent)",
                border: "1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)",
              }}
            >
              <span className="text-xs font-medium" style={{ color: "var(--color-text-secondary)" }}>
                Product:
              </span>
              <Link
                href={`/products/${productId}`}
                className="flex items-center gap-1 text-xs font-semibold hover:underline"
                style={{ color: "var(--color-accent)" }}
              >
                {productName}
                <ExternalLink size={11} />
              </Link>
            </div>
          )}

          {/* Computed metrics read-only panel */}
          <div
            className="grid grid-cols-3 gap-3 rounded-[14px] p-4"
            style={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="flex flex-col gap-1 items-center">
              <span className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: "var(--color-text-tertiary)" }}>
                ROAS
              </span>
              <span
                className="text-xl font-bold tabular-nums"
                style={{ color: roasColor(liveRoas, breakEven) }}
              >
                {liveRoas != null ? `${formatNumber(liveRoas)}x` : "—"}
              </span>
              <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>
                break-even: {formatNumber(breakEven)}x
              </span>
            </div>
            <div className="flex flex-col gap-1 items-center">
              <span className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: "var(--color-text-tertiary)" }}>
                CPA
              </span>
              <span
                className="text-xl font-bold tabular-nums"
                style={{ color: "var(--color-text-primary)" }}
              >
                {liveCpa != null ? formatCurrency(liveCpa) : "—"}
              </span>
            </div>
            <div className="flex flex-col gap-1 items-center">
              <span className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: "var(--color-text-tertiary)" }}>
                Resultaat
              </span>
              <span
                className="text-xl font-bold tabular-nums"
                style={{
                  color:
                    liveResult == null
                      ? "var(--color-text-tertiary)"
                      : liveResult >= 0
                      ? "var(--color-success)"
                      : "var(--color-danger)",
                }}
              >
                {liveResult != null ? formatCurrency(liveResult) : "—"}
              </span>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className={labelClass} style={labelStyle}>
              Naam <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputClass}
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          {/* Platform + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={labelStyle}>
                Platform
              </label>
              <select
                value={form.platform}
                onChange={(e) => set("platform", e.target.value)}
                className={inputClass}
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className={inputClass}
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{BOARD_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Budget + Start date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={labelStyle}>
                Budget (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.budget}
                onChange={(e) => set("budget", e.target.value)}
                placeholder="0,00"
                className={inputClass}
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>
                Startdatum
              </label>
              <input
                type="date"
                value={form.start_date}
                onChange={(e) => set("start_date", e.target.value)}
                className={inputClass}
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
          </div>

          {/* Ad Spend + Revenue + Orders */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass} style={labelStyle}>
                Ad Spend (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.ad_spend}
                onChange={(e) => set("ad_spend", e.target.value)}
                placeholder="0,00"
                className={inputClass}
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>
                Omzet (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.revenue}
                onChange={(e) => set("revenue", e.target.value)}
                placeholder="0,00"
                className={inputClass}
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>
                Bestellingen
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={form.orders}
                onChange={(e) => set("orders", e.target.value)}
                placeholder="0"
                className={inputClass}
                style={inputStyle}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm" style={{ color: "var(--color-danger)" }}>
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 flex-1 justify-center py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: "var(--color-accent)", color: "#fff" }}
            >
              <Check size={14} />
              {saving ? "Opslaan…" : "Wijzigingen opslaan"}
            </button>

            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: "color-mix(in srgb, var(--color-danger) 10%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)",
                  color: "var(--color-danger)",
                }}
              >
                <Trash2 size={14} />
                Verwijderen
              </button>
            ) : (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ background: "var(--color-danger)", color: "#fff" }}
              >
                <Trash2 size={14} />
                {deleting ? "Verwijderen…" : "Bevestigen?"}
              </button>
            )}
          </div>
        </div>
      )}
    </SlideOver>
  );
}

// ─── Create Campaign Form ──────────────────────────────────────────────────────

interface CreateFormProps {
  products: Product[];
  onSuccess: () => void;
  onClose: () => void;
}

function CreateCampaignForm({ products, onSuccess, onClose }: CreateFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{
    name: string;
    product_id: string;
    platform: string;
    status: CampaignStatus;
    budget: string;
    start_date: string;
  }>({
    name: "",
    product_id: "",
    platform: "Meta",
    status: "planned",
    budget: "",
    start_date: "",
  });

  const set = (key: string, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Naam is verplicht.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const insert: CampaignInsert = {
      name: form.name.trim(),
      product_id: form.product_id || null,
      platform: form.platform,
      status: form.status,
      budget: form.budget ? parseFloat(form.budget) : null,
      start_date: form.start_date || null,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await supabase.from("nucleus_campaigns").insert(insert as any);
    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }
    onSuccess();
    onClose();
  };

  const inputClass =
    "w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors";
  const inputStyle = {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    color: "var(--color-text-primary)",
  };
  const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = "var(--color-accent)");
  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) =>
    (e.currentTarget.style.borderColor = "var(--color-border)");
  const labelClass = "block text-xs font-semibold mb-1.5 uppercase tracking-wide";
  const labelStyle = { color: "var(--color-text-tertiary)" };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label className={labelClass} style={labelStyle}>
          Naam <span style={{ color: "var(--color-danger)" }}>*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Campagnenaam"
          className={inputClass}
          style={inputStyle}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </div>

      {/* Product */}
      <div>
        <label className={labelClass} style={labelStyle}>
          Product
        </label>
        <select
          value={form.product_id}
          onChange={(e) => set("product_id", e.target.value)}
          className={inputClass}
          style={inputStyle}
          onFocus={onFocus}
          onBlur={onBlur}
        >
          <option value="">— Kies product —</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Platform + Status */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} style={labelStyle}>
            Platform
          </label>
          <select
            value={form.platform}
            onChange={(e) => set("platform", e.target.value)}
            className={inputClass}
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          >
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>
            Status
          </label>
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value as CampaignStatus)}
            className={inputClass}
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          >
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{BOARD_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Budget + Start date */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} style={labelStyle}>
            Budget (€)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.budget}
            onChange={(e) => set("budget", e.target.value)}
            placeholder="0,00"
            className={inputClass}
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>
            Startdatum
          </label>
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => set("start_date", e.target.value)}
            className={inputClass}
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}

      {/* Submit */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: "var(--color-accent)", color: "#fff" }}
        >
          {saving ? "Aanmaken…" : "Campagne aanmaken"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-secondary)",
          }}
        >
          Annuleren
        </button>
      </div>
    </form>
  );
}

// ─── Filter chips ─────────────────────────────────────────────────────────────

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function FilterChip({ label, active, onClick }: FilterChipProps) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-full text-xs font-semibold transition-colors whitespace-nowrap"
      style={{
        background: active
          ? "var(--color-accent)"
          : "var(--color-card)",
        color: active ? "#fff" : "var(--color-text-secondary)",
        border: `1px solid ${active ? "var(--color-accent)" : "var(--color-border)"}`,
      }}
    >
      {label}
    </button>
  );
}

// ─── Campaigns Page ────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [breakEvenRoas, setBreakEvenRoas] = useState<number>(2);

  // Filters
  const [platformFilter, setPlatformFilter] = useState<string>("Alle");
  const [statusFilter, setStatusFilter] = useState<string>("Alle");

  // Slide-overs
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  // Product lookup map
  const productMap = new Map<string, string>(
    products.map((p) => [p.id, p.name])
  );

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [{ data: camps }, { data: prods }, { data: metrics }] = await Promise.all([
      supabase.from("nucleus_campaigns").select("*").order("created_at", { ascending: false }),
      supabase.from("nucleus_products").select("id, name").order("name"),
      supabase
        .from("nucleus_daily_metrics")
        .select("break_even_roas, date")
        .order("date", { ascending: false })
        .limit(1),
    ]);
    if (camps) setCampaigns(camps);
    if (prods) setProducts(prods as Product[]);
    if (metrics && metrics.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ber = (metrics[0] as any).break_even_roas;
      if (ber != null) setBreakEvenRoas(ber as number);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useRealtime("nucleus_campaigns", fetchAll);

  // ─── Optimistic cell update ────────────────────────────────────────────────

  const updateCampaignField = async (
    id: string,
    field: keyof CampaignUpdate,
    value: number | null
  ) => {
    // Optimistic
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              [field]: value,
              roas: computeRoas(
                field === "revenue" ? value : c.revenue,
                field === "ad_spend" ? value : c.ad_spend
              ),
              cpa: computeCpa(
                field === "ad_spend" ? value : c.ad_spend,
                field === "orders" ? value : c.orders
              ),
              result_after_spend: computeResultAfterSpend(
                field === "revenue" ? value : c.revenue,
                field === "ad_spend" ? value : c.ad_spend
              ),
            }
          : c
      )
    );
    const supabase = createClient();
    const supabaseCamp = supabase.from("nucleus_campaigns");
    // @ts-expect-error supabase generated update type is overly strict
    await supabaseCamp.update({ [field]: value }).eq("id", id);
  };

  // ─── Filters ───────────────────────────────────────────────────────────────

  const filteredCampaigns = campaigns.filter((c) => {
    const platformOk = platformFilter === "Alle" || c.platform === platformFilter;
    const statusOk = statusFilter === "Alle" || c.status === statusFilter;
    return platformOk && statusOk;
  });

  const campaignsByStatus = BOARD_STATUSES.reduce<Record<CampaignStatus, Campaign[]>>(
    (acc, s) => {
      acc[s] = filteredCampaigns.filter((c) => c.status === s);
      return acc;
    },
    {} as Record<CampaignStatus, Campaign[]>
  );

  // ─── Table columns ─────────────────────────────────────────────────────────

  const tableColumns: Column<Campaign>[] = [
    {
      key: "name",
      header: "Naam",
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>
          {row.name}
        </span>
      ),
    },
    {
      key: "product_id",
      header: "Product",
      render: (row) => {
        const name = row.product_id ? productMap.get(row.product_id) : null;
        if (!name) return <span style={{ color: "var(--color-text-tertiary)" }}>—</span>;
        return (
          <Link
            href={`/products/${row.product_id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-sm hover:underline"
            style={{ color: "var(--color-accent)" }}
          >
            {name}
          </Link>
        );
      },
    },
    {
      key: "platform",
      header: "Platform",
      sortable: true,
      render: (row) => <PlatformBadge platform={row.platform} />,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => <StatusPill status={row.status} />,
    },
    {
      key: "budget",
      header: "Budget",
      sortable: true,
      align: "right",
      render: (row) =>
        row.budget != null ? (
          <span className="tabular-nums text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {formatCurrency(row.budget)}
          </span>
        ) : (
          <span style={{ color: "var(--color-text-tertiary)" }}>—</span>
        ),
    },
    {
      key: "ad_spend",
      header: "Ad Spend",
      sortable: true,
      align: "right",
      render: (row) => (
        <EditableCell
          value={row.ad_spend}
          onSave={(v) => updateCampaignField(row.id, "ad_spend", v)}
          format={formatCurrency}
        />
      ),
    },
    {
      key: "revenue",
      header: "Omzet",
      sortable: true,
      align: "right",
      render: (row) => (
        <EditableCell
          value={row.revenue}
          onSave={(v) => updateCampaignField(row.id, "revenue", v)}
          format={formatCurrency}
        />
      ),
    },
    {
      key: "roas",
      header: "ROAS",
      sortable: true,
      align: "right",
      render: (row) => {
        const roas = computeRoas(row.revenue, row.ad_spend);
        const hasSpend = row.ad_spend != null && row.ad_spend > 0;
        return <RoasBadge roas={hasSpend ? roas : null} breakEven={breakEvenRoas} />;
      },
    },
    {
      key: "orders",
      header: "Orders",
      sortable: true,
      align: "right",
      render: (row) => (
        <EditableCell
          value={row.orders}
          onSave={(v) => updateCampaignField(row.id, "orders", v != null ? Math.round(v) : null)}
          format={(n) => String(Math.round(n))}
        />
      ),
    },
    {
      key: "result_after_spend",
      header: "Resultaat na spend",
      sortable: true,
      align: "right",
      render: (row) => {
        const result = computeResultAfterSpend(row.revenue, row.ad_spend);
        if (result == null)
          return <span style={{ color: "var(--color-text-tertiary)" }}>—</span>;
        return (
          <span
            className="tabular-nums text-sm font-semibold"
            style={{
              color: result >= 0 ? "var(--color-success)" : "var(--color-danger)",
            }}
          >
            {formatCurrency(result)}
          </span>
        );
      },
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 md:px-8 py-4 md:py-5 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div>
          <h1
            className="text-[24px] font-bold leading-tight"
            style={{ color: "var(--color-text-primary)" }}
          >
            Campagnes
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
            {campaigns.length} campagne{campaigns.length !== 1 ? "s" : ""} totaal
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div
            className="flex items-center rounded-lg p-0.5 gap-0.5"
            style={{
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
            }}
          >
            <button
              onClick={() => setViewMode("board")}
              title="Board"
              className="flex items-center justify-center rounded-md transition-all"
              style={{
                width: 32,
                height: 32,
                background: viewMode === "board" ? "var(--color-accent)" : "transparent",
                color: viewMode === "board" ? "#fff" : "var(--color-text-tertiary)",
              }}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              onClick={() => setViewMode("table")}
              title="Tabel"
              className="flex items-center justify-center rounded-md transition-all"
              style={{
                width: 32,
                height: 32,
                background: viewMode === "table" ? "var(--color-accent)" : "transparent",
                color: viewMode === "table" ? "#fff" : "var(--color-text-tertiary)",
              }}
            >
              <List size={15} />
            </button>
          </div>

          {/* New campaign button */}
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: "var(--color-accent)", color: "#fff" }}
          >
            <Plus size={15} />
            Nieuwe campagne
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div
        className="flex items-center gap-6 px-8 py-3 flex-shrink-0 flex-wrap"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        {/* Platform filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>
            Platform
          </span>
          <div className="flex items-center gap-1.5">
            {["Alle", ...PLATFORMS].map((p) => (
              <FilterChip
                key={p}
                label={p}
                active={platformFilter === p}
                onClick={() => setPlatformFilter(p)}
              />
            ))}
          </div>
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>
            Status
          </span>
          <div className="flex items-center gap-1.5">
            <FilterChip
              label="Alle"
              active={statusFilter === "Alle"}
              onClick={() => setStatusFilter("Alle")}
            />
            {ALL_STATUSES.map((s) => (
              <FilterChip
                key={s}
                label={BOARD_STATUS_LABELS[s]}
                active={statusFilter === s}
                onClick={() => setStatusFilter(s)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "board" ? (
          /* ── Board view ── */
          <div className="h-full overflow-x-auto overflow-y-hidden px-4 md:px-8 py-4 md:py-6">
            {loading ? (
              <div className="flex gap-4 h-full">
                {BOARD_STATUSES.map((s) => (
                  <div
                    key={s}
                    className="min-w-[220px] w-[220px] h-40 rounded-[14px] animate-pulse"
                    style={{ background: "var(--color-card)" }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex gap-3 h-full items-start">
                {BOARD_STATUSES.map((status) => (
                  <BoardColumn
                    key={status}
                    status={status}
                    campaigns={campaignsByStatus[status]}
                    breakEven={breakEvenRoas}
                    productMap={productMap}
                    onCardClick={(c) => setSelectedCampaign(c)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── Table view ── */
          <div className="px-4 md:px-8 py-4 md:py-6 overflow-y-auto h-full">
            {loading ? (
              <div
                className="rounded-[16px] border h-48 animate-pulse"
                style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
              />
            ) : filteredCampaigns.length === 0 ? (
              <EmptyState
                icon={<Megaphone size={24} />}
                title="Geen campagnes gevonden"
                description="Maak je eerste campagne aan om te beginnen."
                action={{ label: "Nieuwe campagne", onClick: () => setCreateOpen(true) }}
              />
            ) : (
              <DataTable
                data={filteredCampaigns as unknown as Record<string, unknown>[]}
                columns={tableColumns as unknown as Column<Record<string, unknown>>[]}
                onRowClick={(row) =>
                  setSelectedCampaign(campaigns.find((c) => c.id === (row as unknown as Campaign).id) ?? null)
                }
              />
            )}
          </div>
        )}
      </div>

      {/* ── Create campaign SlideOver ── */}
      <SlideOver
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nieuwe campagne"
        width="md"
      >
        <CreateCampaignForm
          products={products}
          onSuccess={fetchAll}
          onClose={() => setCreateOpen(false)}
        />
      </SlideOver>

      {/* ── Campaign detail SlideOver ── */}
      <CampaignDetailSlideOver
        campaign={selectedCampaign}
        open={selectedCampaign !== null}
        onClose={() => setSelectedCampaign(null)}
        breakEven={breakEvenRoas}
        productMap={productMap}
        onUpdated={() => {
          fetchAll();
          setSelectedCampaign(null);
        }}
        onDeleted={() => {
          fetchAll();
        }}
      />
    </div>
  );
}

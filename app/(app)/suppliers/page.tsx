"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, MessageCircle, Mail, Star, Package, X, Check } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { Supplier, SupplierInsert, SupplierUpdate, SupplierPayment, Product } from "@/lib/supabase/types";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { SlideOver } from "@/components/ui";
import { useRealtime } from "@/hooks/useRealtime";

// ─── Types & Constants ────────────────────────────────────────────────────────

const SUPPLIER_STATUSES = ["actief", "wachten", "dead", "te_herzien"];

const STATUS_LABELS: Record<string, string> = {
  actief: "Actief",
  wachten: "Wachten",
  dead: "Inactief",
  te_herzien: "Te herzien",
};

// ─── Score Helpers ────────────────────────────────────────────────────────────

function computeScore(s: Supplier): number {
  const quality = s.quality_score ?? 5;
  const reliability = s.reliability_score ?? 5;
  const shippingScore = Math.max(0, 10 - (s.shipping_days ?? 30) / 3);
  return Math.round((quality * 0.4 + reliability * 0.4 + shippingScore * 0.2) * 10) / 10;
}

function getTier(score: number): { label: string; bg: string; color: string } {
  if (score >= 8) return { label: "A · Preferred", bg: "color-mix(in srgb, #30D158 15%, transparent)", color: "#30D158" };
  if (score >= 6) return { label: "B · Solide", bg: "color-mix(in srgb, #FF9F0A 15%, transparent)", color: "#FF9F0A" };
  return { label: "C · Risico", bg: "color-mix(in srgb, #FF3B30 15%, transparent)", color: "#FF3B30" };
}

function ScoreBar({ value, max = 10 }: { value: number | null; max?: number }) {
  if (value == null) return <span style={{ color: "var(--color-text-tertiary)" }}>—</span>;
  const pct = Math.min(100, (value / max) * 100);
  const color = value >= 8 ? "#30D158" : value >= 6 ? "#FF9F0A" : "#FF3B30";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs tabular-nums font-medium" style={{ color: "var(--color-text-secondary)" }}>
        {formatNumber(value)}
      </span>
    </div>
  );
}

// ─── Status Pill ──────────────────────────────────────────────────────────────

function StatusChip({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    actief: { bg: "color-mix(in srgb, #30D158 15%, transparent)", color: "#30D158" },
    wachten: { bg: "color-mix(in srgb, #FF9F0A 15%, transparent)", color: "#FF9F0A" },
    dead: { bg: "color-mix(in srgb, #FF3B30 15%, transparent)", color: "#FF3B30" },
    te_herzien: { bg: "color-mix(in srgb, #FF9F0A 15%, transparent)", color: "#FF9F0A" },
  };
  const c = cfg[status] ?? { bg: "color-mix(in srgb, #8E8E93 15%, transparent)", color: "#8E8E93" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ background: c.bg, color: c.color }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

// ─── Supplier Detail SlideOver ────────────────────────────────────────────────

interface SupplierDetailProps {
  supplier: Supplier | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
  products: Product[];
  payments: SupplierPayment[];
}

function SupplierDetailSlideOver({ supplier, open, onClose, onUpdated, onDeleted, products, payments }: SupplierDetailProps) {
  const [form, setForm] = useState({
    name: "", status: "actief", contact_person: "", whatsapp: "", email: "",
    country: "", shipping_days: "", moq: "", quality_score: "", reliability_score: "",
    payment_terms: "", notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name,
        status: supplier.status,
        contact_person: supplier.contact_person ?? "",
        whatsapp: supplier.whatsapp ?? "",
        email: supplier.email ?? "",
        country: supplier.country ?? "",
        shipping_days: supplier.shipping_days != null ? String(supplier.shipping_days) : "",
        moq: supplier.moq != null ? String(supplier.moq) : "",
        quality_score: supplier.quality_score != null ? String(supplier.quality_score) : "",
        reliability_score: supplier.reliability_score != null ? String(supplier.reliability_score) : "",
        payment_terms: supplier.payment_terms ?? "",
        notes: supplier.notes ?? "",
      });
      setError(null);
      setConfirmDelete(false);
    }
  }, [supplier]);

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const parseOptFloat = (v: string) => v.trim() === "" ? null : parseFloat(v.replace(",", "."));
  const parseOptInt = (v: string) => v.trim() === "" ? null : parseInt(v, 10);

  const handleSave = async () => {
    if (!supplier || !form.name.trim()) { setError("Naam is verplicht."); return; }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const update: SupplierUpdate = {
      name: form.name.trim(),
      status: form.status,
      contact_person: form.contact_person || null,
      whatsapp: form.whatsapp || null,
      email: form.email || null,
      country: form.country || null,
      shipping_days: parseOptInt(form.shipping_days),
      moq: parseOptInt(form.moq),
      quality_score: parseOptFloat(form.quality_score),
      reliability_score: parseOptFloat(form.reliability_score),
      payment_terms: form.payment_terms || null,
      notes: form.notes || null,
    };
    // @ts-expect-error generated types overly strict
    const { error: err } = await supabase.from("nucleus_suppliers").update(update).eq("id", supplier.id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    onUpdated();
  };

  const handleDelete = async () => {
    if (!supplier) return;
    setDeleting(true);
    await createClient().from("nucleus_suppliers").delete().eq("id", supplier.id);
    setDeleting(false);
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

  const linkedProducts = supplier ? products.filter((p) => p.supplier_id === supplier.id) : [];
  const linkedPayments = supplier ? payments.filter((p) => p.supplier_id === supplier.id) : [];
  const liveScore = supplier ? computeScore({
    ...supplier,
    quality_score: parseOptFloat(form.quality_score) ?? supplier.quality_score,
    reliability_score: parseOptFloat(form.reliability_score) ?? supplier.reliability_score,
    shipping_days: parseOptInt(form.shipping_days) ?? supplier.shipping_days,
  }) : 0;
  const liveTier = getTier(liveScore);

  return (
    <SlideOver open={open} onClose={onClose} title={supplier?.name ?? "Leverancier"} width="lg">
      {supplier && (
        <div className="space-y-5">
          {/* Score panel */}
          <div className="flex items-center gap-4 p-3 rounded-[12px]" style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] uppercase tracking-wide font-semibold" style={{ color: "var(--color-text-tertiary)" }}>Score</span>
              <span className="text-2xl font-bold tabular-nums" style={{ color: "var(--color-text-primary)" }}>{formatNumber(liveScore)}</span>
            </div>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: liveTier.bg, color: liveTier.color }}>
              {liveTier.label}
            </span>
          </div>

          {/* Name + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={labelStyle}>Naam *</label>
              <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Status</label>
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
                {SUPPLIER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={labelStyle}>Contactpersoon</label>
              <input type="text" value={form.contact_person} onChange={(e) => set("contact_person", e.target.value)} placeholder="Naam" className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Land</label>
              <input type="text" value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="China, NL…" className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>

          {/* WhatsApp + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={labelStyle}>WhatsApp</label>
              <input type="text" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="+31..." className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>E-mail</label>
              <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="naam@bedrijf.com" className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass} style={labelStyle}>Kwaliteit (0-10)</label>
              <input type="number" min="0" max="10" step="0.1" value={form.quality_score} onChange={(e) => set("quality_score", e.target.value)} placeholder="7.5" className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Betrouwbaarheid (0-10)</label>
              <input type="number" min="0" max="10" step="0.1" value={form.reliability_score} onChange={(e) => set("reliability_score", e.target.value)} placeholder="8.0" className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Levertijd (dagen)</label>
              <input type="number" min="0" step="1" value={form.shipping_days} onChange={(e) => set("shipping_days", e.target.value)} placeholder="14" className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>

          {/* MOQ + Payment terms */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} style={labelStyle}>MOQ (stuks)</label>
              <input type="number" min="0" step="1" value={form.moq} onChange={(e) => set("moq", e.target.value)} placeholder="100" className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
            <div>
              <label className={labelClass} style={labelStyle}>Betalingsvoorwaarden</label>
              <input type="text" value={form.payment_terms} onChange={(e) => set("payment_terms", e.target.value)} placeholder="30% vooruit, 70% bij levering" className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass} style={labelStyle}>Notities</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Opmerkingen over deze leverancier…"
              rows={3}
              className="w-full rounded-lg px-3 py-2.5 text-sm outline-none transition-colors resize-none"
              style={inputStyle}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>

          {/* Linked products */}
          {linkedProducts.length > 0 && (
            <div>
              <label className={labelClass} style={labelStyle}>Producten ({linkedProducts.length})</label>
              <div className="flex flex-wrap gap-2">
                {linkedProducts.map((p) => (
                  <span key={p.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs" style={{ background: "color-mix(in srgb, var(--color-accent) 12%, transparent)", color: "var(--color-accent)" }}>
                    <Package size={10} />
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Linked payments */}
          {linkedPayments.length > 0 && (
            <div>
              <label className={labelClass} style={labelStyle}>Betalingen ({linkedPayments.length})</label>
              <div className="space-y-1.5">
                {linkedPayments.slice(0, 5).map((pay) => (
                  <div key={pay.id} className="flex items-center justify-between text-xs py-1 px-2 rounded" style={{ background: "var(--color-surface)" }}>
                    <span style={{ color: "var(--color-text-secondary)" }}>{pay.reference ?? pay.id.slice(0, 8)}</span>
                    <span className="tabular-nums font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      {pay.amount != null ? formatCurrency(pay.amount) : "—"}
                    </span>
                    <span style={{ color: "var(--color-text-tertiary)" }}>{pay.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 flex-1 justify-center py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50" style={{ background: "var(--color-accent)", color: "#fff" }}>
              <Check size={14} />
              {saving ? "Opslaan…" : "Wijzigingen opslaan"}
            </button>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "color-mix(in srgb, var(--color-danger) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)", color: "var(--color-danger)" }}>
                Verwijderen
              </button>
            ) : (
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ background: "var(--color-danger)", color: "#fff" }}>
                {deleting ? "Bezig…" : "Bevestigen?"}
              </button>
            )}
          </div>
        </div>
      )}
    </SlideOver>
  );
}

// ─── Create Supplier Form ─────────────────────────────────────────────────────

interface CreateFormProps {
  onSuccess: () => void;
  onClose: () => void;
}

function CreateSupplierForm({ onSuccess, onClose }: CreateFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", status: "actief", contact_person: "", whatsapp: "", email: "",
    country: "", shipping_days: "", moq: "", quality_score: "7", reliability_score: "7",
    payment_terms: "",
  });

  const set = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));
  const parseOptFloat = (v: string) => v.trim() === "" ? null : parseFloat(v.replace(",", "."));
  const parseOptInt = (v: string) => v.trim() === "" ? null : parseInt(v, 10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Naam is verplicht."); return; }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const insert: SupplierInsert = {
      name: form.name.trim(),
      status: form.status,
      contact_person: form.contact_person || null,
      whatsapp: form.whatsapp || null,
      email: form.email || null,
      country: form.country || null,
      shipping_days: parseOptInt(form.shipping_days),
      moq: parseOptInt(form.moq),
      quality_score: parseOptFloat(form.quality_score),
      reliability_score: parseOptFloat(form.reliability_score),
      payment_terms: form.payment_terms || null,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await supabase.from("nucleus_suppliers").insert(insert as any);
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} style={labelStyle}>Naam *</label>
          <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Leveranciersnaam" className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} autoFocus />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>Status</label>
          <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur}>
            {SUPPLIER_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} style={labelStyle}>Contactpersoon</label>
          <input type="text" value={form.contact_person} onChange={(e) => set("contact_person", e.target.value)} className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>Land</label>
          <input type="text" value={form.country} onChange={(e) => set("country", e.target.value)} placeholder="China" className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>WhatsApp</label>
          <input type="text" value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>E-mail</label>
          <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelClass} style={labelStyle}>Kwaliteit (0-10)</label>
          <input type="number" min="0" max="10" step="0.1" value={form.quality_score} onChange={(e) => set("quality_score", e.target.value)} className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>Betrouwbaarheid</label>
          <input type="number" min="0" max="10" step="0.1" value={form.reliability_score} onChange={(e) => set("reliability_score", e.target.value)} className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>Levertijd (dagen)</label>
          <input type="number" min="0" step="1" value={form.shipping_days} onChange={(e) => set("shipping_days", e.target.value)} placeholder="14" className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass} style={labelStyle}>MOQ (stuks)</label>
          <input type="number" min="0" step="1" value={form.moq} onChange={(e) => set("moq", e.target.value)} placeholder="100" className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
        </div>
        <div>
          <label className={labelClass} style={labelStyle}>Betalingsvoorwaarden</label>
          <input type="text" value={form.payment_terms} onChange={(e) => set("payment_terms", e.target.value)} placeholder="30% vooruit" className={inputClass} style={inputStyle} onFocus={onFocus} onBlur={onBlur} />
        </div>
      </div>
      {error && <p className="text-sm" style={{ color: "var(--color-danger)" }}>{error}</p>}
      <div className="flex items-center gap-3 pt-2">
        <button type="submit" disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50" style={{ background: "var(--color-accent)", color: "#fff" }}>
          {saving ? "Aanmaken…" : "Leverancier aanmaken"}
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

// ─── Suppliers Page ───────────────────────────────────────────────────────────

export default function SuppliersPage() {
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [payments, setPayments] = useState<SupplierPayment[]>([]);
  const [statusFilter, setStatusFilter] = useState("Alle");
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [{ data: sups }, { data: prods }, { data: pays }] = await Promise.all([
      supabase.from("nucleus_suppliers").select("*"),
      supabase.from("nucleus_products").select("id, name, supplier_id"),
      supabase.from("nucleus_supplier_payments").select("*"),
    ]);
    if (sups) {
      const typedSups = sups as Supplier[];
      const sorted = [...typedSups].sort((a, b) => {
        const scoreA = a.supplier_score ?? computeScore(a);
        const scoreB = b.supplier_score ?? computeScore(b);
        return scoreB - scoreA;
      });
      setSuppliers(sorted);
    }
    if (prods) setProducts(prods as Product[]);
    if (pays) setPayments(pays);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useRealtime("nucleus_suppliers", fetchAll);

  const filtered = suppliers.filter((s) =>
    statusFilter === "Alle" || s.status === statusFilter
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-8 py-5 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div>
          <h1 className="text-[24px] font-bold leading-tight" style={{ color: "var(--color-text-primary)" }}>
            Leveranciers
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
            {suppliers.length} leverancier{suppliers.length !== 1 ? "s" : ""} · gesorteerd op score
          </p>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: "var(--color-accent)", color: "#fff" }}
        >
          <Plus size={15} />
          Nieuwe leverancier
        </button>
      </div>

      {/* Filters */}
      <div
        className="flex items-center gap-2 px-8 py-3 flex-shrink-0 flex-wrap"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <span className="text-xs font-semibold uppercase tracking-wide mr-1" style={{ color: "var(--color-text-tertiary)" }}>Status</span>
        <FilterChip label="Alle" active={statusFilter === "Alle"} onClick={() => setStatusFilter("Alle")} />
        {SUPPLIER_STATUSES.map((s) => (
          <FilterChip key={s} label={STATUS_LABELS[s]} active={statusFilter === s} onClick={() => setStatusFilter(s)} />
        ))}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 rounded-lg animate-pulse" style={{ background: "var(--color-card)" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Star size={32} style={{ color: "var(--color-text-tertiary)" }} />
            <p className="text-base font-semibold" style={{ color: "var(--color-text-secondary)" }}>Geen leveranciers gevonden</p>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 mt-2"
              style={{ background: "var(--color-accent)", color: "#fff" }}
            >
              <Plus size={14} />
              Nieuwe leverancier
            </button>
          </div>
        ) : (
          <div className="rounded-[16px] overflow-hidden border" style={{ borderColor: "var(--color-border)" }}>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
                  {["Naam", "Land", "Tier / Score", "Kwaliteit", "Betrouwbaarheid", "Levertijd", "MOQ", "Status", "Contactpersoon", "Contact", "Notities"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: "var(--color-text-tertiary)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((s, idx) => {
                    const score = s.supplier_score ?? computeScore(s);
                    const tier = getTier(score);
                    return (
                      <motion.tr
                        key={s.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.03 }}
                        onClick={() => setSelectedSupplier(s)}
                        className="cursor-pointer transition-colors"
                        style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-card)" }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.background = "var(--color-surface)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.background = "var(--color-card)";
                        }}
                      >
                        <td className="px-4 py-3 font-semibold whitespace-nowrap" style={{ color: "var(--color-text-primary)" }}>{s.name}</td>
                        <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--color-text-secondary)" }}>{s.country ?? "—"}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: tier.bg, color: tier.color }}>
                              {tier.label}
                            </span>
                            <span className="text-xs tabular-nums font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                              {formatNumber(score)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><ScoreBar value={s.quality_score} /></td>
                        <td className="px-4 py-3"><ScoreBar value={s.reliability_score} /></td>
                        <td className="px-4 py-3 tabular-nums" style={{ color: "var(--color-text-secondary)" }}>
                          {s.shipping_days != null ? `${s.shipping_days}d` : "—"}
                        </td>
                        <td className="px-4 py-3 tabular-nums" style={{ color: "var(--color-text-secondary)" }}>
                          {s.moq != null ? s.moq.toLocaleString("nl-NL") : "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap"><StatusChip status={s.status} /></td>
                        <td className="px-4 py-3 whitespace-nowrap" style={{ color: "var(--color-text-secondary)" }}>{s.contact_person ?? "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {s.whatsapp && (
                              <a
                                href={`https://wa.me/${s.whatsapp.replace(/\D/g, "")}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 rounded transition-opacity hover:opacity-70"
                                style={{ color: "#25D366" }}
                                title={`WhatsApp ${s.whatsapp}`}
                              >
                                <MessageCircle size={14} />
                              </a>
                            )}
                            {s.email && (
                              <a
                                href={`mailto:${s.email}`}
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 rounded transition-opacity hover:opacity-70"
                                style={{ color: "var(--color-accent)" }}
                                title={s.email}
                              >
                                <Mail size={14} />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-[200px]">
                          <span className="text-xs truncate block" style={{ color: "var(--color-text-tertiary)" }}>
                            {s.notes ?? "—"}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create SlideOver */}
      <SlideOver open={createOpen} onClose={() => setCreateOpen(false)} title="Nieuwe leverancier" width="lg">
        <CreateSupplierForm onSuccess={fetchAll} onClose={() => setCreateOpen(false)} />
      </SlideOver>

      {/* Detail SlideOver */}
      <SupplierDetailSlideOver
        supplier={selectedSupplier}
        open={selectedSupplier !== null}
        onClose={() => setSelectedSupplier(null)}
        onUpdated={() => { fetchAll(); setSelectedSupplier(null); }}
        onDeleted={fetchAll}
        products={products}
        payments={payments}
      />
    </div>
  );
}

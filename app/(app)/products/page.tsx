"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, List, Plus, Package, GripVertical } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { Product, ProductInsert, ProductRollup, Supplier } from "@/lib/supabase/types";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { StatusPill, DataTable, EmptyState, SlideOver } from "@/components/ui";
import type { Column } from "@/components/ui";
import { useRealtime } from "@/hooks/useRealtime";

// ─── Constants ────────────────────────────────────────────────────────────────

type ProductStatus =
  | "idea"
  | "researching"
  | "ordered"
  | "content_creation"
  | "ready_for_testing"
  | "testing"
  | "scaling"
  | "winner"
  | "dead";

const STATUSES: ProductStatus[] = [
  "idea",
  "researching",
  "ordered",
  "content_creation",
  "ready_for_testing",
  "testing",
  "scaling",
  "winner",
  "dead",
];

const STATUS_LABELS: Record<ProductStatus, string> = {
  idea: "Idee",
  researching: "Onderzoek",
  ordered: "Besteld",
  content_creation: "Content",
  ready_for_testing: "Klaar voor test",
  testing: "In test",
  scaling: "Schalen",
  winner: "Winner 🏆",
  dead: "Gestopt",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeVerdict(score: number | null): string {
  if (score == null) return "—";
  if (score >= 8) return "Sterk product";
  if (score >= 6.5) return "Potentieel";
  return "Zwak product";
}

function WinningScoreBadge({ score }: { score: number | null }) {
  if (score == null)
    return <span style={{ color: "var(--color-text-tertiary)" }}>—</span>;
  const style =
    score >= 8
      ? { bg: "color-mix(in srgb, #34C759 18%, transparent)", color: "#34C759" }
      : score >= 6.5
      ? { bg: "color-mix(in srgb, #FF9F0A 18%, transparent)", color: "#FF9F0A" }
      : { bg: "color-mix(in srgb, #FF453A 18%, transparent)", color: "#FF453A" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums"
      style={{ background: style.bg, color: style.color }}
    >
      {formatNumber(score)}
    </span>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────

interface KanbanCardProps {
  product: Product;
  onDragStart: (id: string) => void;
  onClick: () => void;
}

function KanbanCard({ product, onDragStart, onClick }: KanbanCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      draggable
      onDragStart={() => onDragStart(product.id)}
      onClick={onClick}
      className="rounded-[12px] border p-3 cursor-pointer group select-none"
      style={{
        background: "var(--color-card)",
        borderColor: "var(--color-border)",
        boxShadow: "var(--shadow-sm)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor =
          "var(--color-accent)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.borderColor =
          "var(--color-border)";
      }}
    >
      {/* Drag handle row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className="text-[13px] font-semibold leading-tight line-clamp-2 flex-1"
          style={{ color: "var(--color-text-primary)" }}
        >
          {product.name}
        </span>
        <GripVertical
          size={14}
          className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-40 transition-opacity"
          style={{ color: "var(--color-text-tertiary)" }}
        />
      </div>

      {/* Score + verdict */}
      <div className="flex items-center gap-2 mb-2">
        <WinningScoreBadge score={product.winning_score} />
        <span
          className="text-xs truncate"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          {computeVerdict(product.winning_score)}
        </span>
      </div>

      {/* Margin + status */}
      <div className="flex items-center justify-between gap-2">
        {product.margin_pct != null ? (
          <span
            className="text-xs tabular-nums font-medium"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {formatNumber(product.margin_pct)}% marge
          </span>
        ) : (
          <span />
        )}
        <StatusPill status={product.status} />
      </div>
    </motion.div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  status: ProductStatus;
  products: Product[];
  dragOverStatus: ProductStatus | null;
  onDragStart: (id: string) => void;
  onDragOver: (status: ProductStatus) => void;
  onDrop: (status: ProductStatus) => void;
  onCardClick: (product: Product) => void;
}

function KanbanColumn({
  status,
  products,
  dragOverStatus,
  onDragStart,
  onDragOver,
  onDrop,
  onCardClick,
}: KanbanColumnProps) {
  const isOver = dragOverStatus === status;

  return (
    <div
      className="flex flex-col min-w-[200px] w-[220px] flex-shrink-0 rounded-[14px] transition-colors"
      style={{
        background: isOver
          ? "color-mix(in srgb, var(--color-accent) 6%, var(--color-surface))"
          : "var(--color-surface)",
        border: `1.5px solid ${isOver ? "var(--color-accent)" : "var(--color-border)"}`,
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(status);
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(status);
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
          {STATUS_LABELS[status]}
        </span>
        <span
          className="text-xs font-semibold tabular-nums px-1.5 py-0.5 rounded-full"
          style={{
            background: "color-mix(in srgb, var(--color-text-tertiary) 12%, transparent)",
            color: "var(--color-text-tertiary)",
          }}
        >
          {products.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-2 flex-1 min-h-[80px]">
        <AnimatePresence>
          {products.map((p) => (
            <KanbanCard
              key={p.id}
              product={p}
              onDragStart={onDragStart}
              onClick={() => onCardClick(p)}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Create Form ──────────────────────────────────────────────────────────────

interface CreateFormProps {
  suppliers: Supplier[];
  onSuccess: () => void;
  onClose: () => void;
}

function CreateProductForm({ suppliers, onSuccess, onClose }: CreateFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{
    name: string;
    status: ProductStatus;
    category: string;
    type: string;
    sell_price: string;
    cost_price: string;
    shipping_cost: string;
    test_budget: string;
    product_url: string;
    supplier_id: string;
  }>({
    name: "",
    status: "idea",
    category: "",
    type: "",
    sell_price: "",
    cost_price: "",
    shipping_cost: "",
    test_budget: "",
    product_url: "",
    supplier_id: "",
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any;
    const insert: ProductInsert = {
      name: form.name.trim(),
      status: form.status,
      category: form.category || null,
      type: form.type || null,
      sell_price: form.sell_price ? parseFloat(form.sell_price) : null,
      cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
      shipping_cost: form.shipping_cost ? parseFloat(form.shipping_cost) : null,
      test_budget: form.test_budget ? parseFloat(form.test_budget) : null,
      product_url: form.product_url || null,
      supplier_id: form.supplier_id || null,
    };
    const { error: err } = await supabase
      .from("nucleus_products")
      .insert(insert);
    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }
    onSuccess();
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>
          Naam <span style={{ color: "var(--color-danger)" }}>*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Productnaam"
          required
          className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-primary)",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
        />
      </div>

      {/* Status */}
      <div>
        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>
          Status
        </label>
        <select
          value={form.status}
          onChange={(e) => set("status", e.target.value)}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-primary)",
          }}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Category + Type */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>
            Categorie
          </label>
          <input
            type="text"
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
            placeholder="bijv. Beauty"
            className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>
            Type
          </label>
          <input
            type="text"
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
            placeholder="bijv. fysiek"
            className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
          />
        </div>
      </div>

      {/* Prices */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>
            Verkoopprijs
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.sell_price}
            onChange={(e) => set("sell_price", e.target.value)}
            placeholder="0,00"
            className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>
            Inkoopprijs
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.cost_price}
            onChange={(e) => set("cost_price", e.target.value)}
            placeholder="0,00"
            className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>
            Verzendkosten
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={form.shipping_cost}
            onChange={(e) => set("shipping_cost", e.target.value)}
            placeholder="0,00"
            className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-primary)",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
          />
        </div>
      </div>

      {/* Test budget */}
      <div>
        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>
          Testbudget
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={form.test_budget}
          onChange={(e) => set("test_budget", e.target.value)}
          placeholder="0,00"
          className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-primary)",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
        />
      </div>

      {/* Product URL */}
      <div>
        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>
          Product URL
        </label>
        <input
          type="url"
          value={form.product_url}
          onChange={(e) => set("product_url", e.target.value)}
          placeholder="https://..."
          className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-primary)",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
        />
      </div>

      {/* Supplier */}
      <div>
        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--color-text-tertiary)" }}>
          Leverancier
        </label>
        <select
          value={form.supplier_id}
          onChange={(e) => set("supplier_id", e.target.value)}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-primary)",
          }}
        >
          <option value="">— Geen leverancier —</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
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
          {saving ? "Opslaan…" : "Product aanmaken"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
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

// ─── Products Page ────────────────────────────────────────────────────────────

export default function ProductsPage() {
  const router = useRouter();

  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [rollups, setRollups] = useState<ProductRollup[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [createOpen, setCreateOpen] = useState(false);

  // Drag state
  const dragId = useRef<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<ProductStatus | null>(null);

  // ─── Fetchers ──────────────────────────────────────────────────────────────

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [{ data: prods }, { data: rolls }] = await Promise.all([
      supabase.from("nucleus_products").select("*").order("created_at", { ascending: false }),
      supabase.from("nucleus_product_rollups").select("*"),
    ]);
    if (prods) setProducts(prods);
    if (rolls) setRollups(rolls);
    setLoading(false);
  }, []);

  const fetchSuppliers = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("nucleus_suppliers")
      .select("*")
      .order("name");
    if (data) setSuppliers(data);
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchSuppliers();
  }, [fetchProducts, fetchSuppliers]);

  useRealtime("nucleus_products", fetchProducts);

  // ─── Drag & Drop ───────────────────────────────────────────────────────────

  const handleDragStart = (id: string) => {
    dragId.current = id;
  };

  const handleDragOver = (status: ProductStatus) => {
    setDragOverStatus(status);
  };

  const handleDrop = async (targetStatus: ProductStatus) => {
    setDragOverStatus(null);
    const id = dragId.current;
    dragId.current = null;
    if (!id) return;

    const product = products.find((p) => p.id === id);
    if (!product || product.status === targetStatus) return;

    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: targetStatus } : p))
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any;
    const { error } = await supabase
      .from("nucleus_products")
      .update({ status: targetStatus })
      .eq("id", id);

    if (error) {
      // Revert on error
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: product.status } : p))
      );
    }
  };

  // ─── Table columns ─────────────────────────────────────────────────────────

  const tableColumns: Column<ProductRollup>[] = [
    {
      key: "name",
      header: "Naam",
      sortable: true,
      render: (row) => (
        <span
          className="font-medium text-sm"
          style={{ color: "var(--color-text-primary)" }}
        >
          {row.name ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) =>
        row.status ? <StatusPill status={row.status} /> : <span style={{ color: "var(--color-text-tertiary)" }}>—</span>,
    },
    {
      key: "winning_score",
      header: "Score",
      sortable: true,
      align: "right",
      render: (row) => <WinningScoreBadge score={row.winning_score} />,
    },
    {
      key: "verdict",
      header: "Verdict",
      render: (row) => (
        <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {computeVerdict(row.winning_score)}
        </span>
      ),
    },
    {
      key: "margin_pct",
      header: "Marge%",
      sortable: true,
      align: "right",
      render: (row) =>
        row.margin_pct != null ? (
          <span className="tabular-nums text-sm" style={{ color: "var(--color-text-secondary)" }}>
            {formatNumber(row.margin_pct)}%
          </span>
        ) : (
          <span style={{ color: "var(--color-text-tertiary)" }}>—</span>
        ),
    },
    {
      key: "campaign_count",
      header: "Campagnes",
      sortable: true,
      align: "right",
      render: (row) => (
        <span className="tabular-nums text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {row.campaign_count ?? 0}
        </span>
      ),
    },
    {
      key: "creative_count",
      header: "Creatives",
      sortable: true,
      align: "right",
      render: (row) => (
        <span className="tabular-nums text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {row.creative_count ?? 0}
        </span>
      ),
    },
    {
      key: "product_roas",
      header: "Product ROAS",
      sortable: true,
      align: "right",
      render: (row) =>
        row.product_roas != null ? (
          <span
            className="tabular-nums text-sm font-semibold"
            style={{
              color:
                row.product_roas >= 2
                  ? "var(--color-success)"
                  : "var(--color-danger)",
            }}
          >
            {formatNumber(row.product_roas)}x
          </span>
        ) : (
          <span style={{ color: "var(--color-text-tertiary)" }}>—</span>
        ),
    },
  ];

  // ─── Kanban grouped ────────────────────────────────────────────────────────

  const productsByStatus = STATUSES.reduce<Record<ProductStatus, Product[]>>(
    (acc, s) => {
      acc[s] = products.filter((p) => p.status === s);
      return acc;
    },
    {} as Record<ProductStatus, Product[]>
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-8 py-5 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div>
          <h1
            className="text-[24px] font-bold leading-tight"
            style={{ color: "var(--color-text-primary)" }}
          >
            Producten
          </h1>
          <p
            className="mt-0.5 text-sm"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            {products.length} product{products.length !== 1 ? "en" : ""} in pipeline
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
              onClick={() => setViewMode("kanban")}
              title="Kanban"
              className="flex items-center justify-center rounded-md transition-all"
              style={{
                width: 32,
                height: 32,
                background:
                  viewMode === "kanban"
                    ? "var(--color-accent)"
                    : "transparent",
                color:
                  viewMode === "kanban"
                    ? "#fff"
                    : "var(--color-text-tertiary)",
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
                background:
                  viewMode === "table"
                    ? "var(--color-accent)"
                    : "transparent",
                color:
                  viewMode === "table"
                    ? "#fff"
                    : "var(--color-text-tertiary)",
              }}
            >
              <List size={15} />
            </button>
          </div>

          {/* New product button */}
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: "var(--color-accent)", color: "#fff" }}
          >
            <Plus size={15} />
            Nieuw product
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "kanban" ? (
          /* ── Kanban board ── */
          <div className="h-full overflow-x-auto overflow-y-hidden px-8 py-6">
            {loading ? (
              <div className="flex gap-4 h-full">
                {STATUSES.map((s) => (
                  <div
                    key={s}
                    className="min-w-[220px] w-[220px] h-32 rounded-[14px] animate-pulse"
                    style={{ background: "var(--color-card)" }}
                  />
                ))}
              </div>
            ) : (
              <div
                className="flex gap-3 h-full items-start"
                onDragLeave={() => setDragOverStatus(null)}
              >
                {STATUSES.map((status) => (
                  <KanbanColumn
                    key={status}
                    status={status}
                    products={productsByStatus[status]}
                    dragOverStatus={dragOverStatus}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onCardClick={(p) => router.push(`/products/${p.id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── Table view ── */
          <div className="px-8 py-6 overflow-y-auto h-full">
            {loading ? (
              <div
                className="rounded-[16px] border h-48 animate-pulse"
                style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
              />
            ) : rollups.length === 0 ? (
              <EmptyState
                icon={<Package size={24} />}
                title="Geen producten gevonden"
                description="Voeg je eerste product toe om te starten."
                action={{ label: "Nieuw product", onClick: () => setCreateOpen(true) }}
              />
            ) : (
              <DataTable
                data={rollups as unknown as Record<string, unknown>[]}
                columns={tableColumns as unknown as Column<Record<string, unknown>>[]}
                onRowClick={(row) => {
                  if (row.id) router.push(`/products/${row.id}`);
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Create product SlideOver ── */}
      <SlideOver
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nieuw product"
        width="md"
      >
        <CreateProductForm
          suppliers={suppliers}
          onSuccess={fetchProducts}
          onClose={() => setCreateOpen(false)}
        />
      </SlideOver>
    </div>
  );
}

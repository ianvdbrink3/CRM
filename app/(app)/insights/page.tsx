"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Lightbulb, ChevronDown, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CustomerInsight, Product } from "@/lib/supabase/types";
import { StatusPill } from "@/components/ui/StatusPill";
import { EmptyState } from "@/components/ui/EmptyState";

// ─── Constants ─────────────────────────────────────────────────────────────────

const INSIGHT_TYPES = ["review", "pijnpunt", "bezwaar", "wens", "hook", "ugc", "ad_inzicht"] as const;
type InsightType = typeof INSIGHT_TYPES[number];

const TYPE_LABELS: Record<InsightType, string> = {
  review: "Review",
  pijnpunt: "Pijnpunt",
  bezwaar: "Bezwaar",
  wens: "Wens",
  hook: "Hook",
  ugc: "UGC",
  ad_inzicht: "Ad inzicht",
};

const TYPE_VARIANTS: Record<InsightType, string> = {
  review: "success",
  pijnpunt: "danger",
  bezwaar: "warning",
  wens: "info",
  hook: "success",
  ugc: "info",
  ad_inzicht: "neutral",
};

const SENTIMENTS = ["positief", "negatief", "neutraal"] as const;
type Sentiment = typeof SENTIMENTS[number];

const SENTIMENT_COLORS: Record<Sentiment, string> = {
  positief: "#34C759",
  negatief: "#FF453A",
  neutraal: "var(--color-text-tertiary)",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "zojuist";
  if (diff < 3600) return `${Math.floor(diff / 60)} min geleden`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} uur geleden`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} dagen geleden`;
  if (diff < 86400 * 30) return `${Math.floor(diff / (86400 * 7))} weken geleden`;
  return `${Math.floor(diff / (86400 * 30))} maanden geleden`;
}

// ─── Filter chip ──────────────────────────────────────────────────────────────

function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap"
      style={{
        background: active
          ? "var(--color-accent)"
          : "color-mix(in srgb, var(--color-text-tertiary) 10%, transparent)",
        color: active ? "#fff" : "var(--color-text-secondary)",
        border: active ? "1px solid transparent" : "1px solid var(--color-border)",
      }}
    >
      {label}
    </button>
  );
}

// ─── Insight Card ─────────────────────────────────────────────────────────────

interface InsightCardProps {
  insight: CustomerInsight;
  productName: string | null;
  expanded: boolean;
  onToggle: () => void;
  onToggleProcessed: (val: boolean) => void;
}

function InsightCard({ insight, productName, expanded, onToggle, onToggleProcessed }: InsightCardProps) {
  const type = insight.type as InsightType;
  const sentiment = insight.sentiment as Sentiment | null;
  const sentimentColor = sentiment ? SENTIMENT_COLORS[sentiment] : SENTIMENT_COLORS.neutraal;
  const sentimentLabel = sentiment
    ? sentiment.charAt(0).toUpperCase() + sentiment.slice(1)
    : "Onbekend";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className="rounded-[14px] border overflow-hidden"
      style={{
        background: "var(--color-card)",
        borderColor: "var(--color-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Main row */}
      <div
        className="flex items-start gap-3 px-4 py-3 cursor-pointer"
        onClick={onToggle}
      >
        {/* Sentiment dot */}
        <div className="flex-shrink-0 mt-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ background: sentimentColor }}
            title={sentimentLabel}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap mb-1">
            <span
              className="text-sm font-semibold leading-tight"
              style={{ color: "var(--color-text-primary)" }}
            >
              {insight.title}
            </span>
            <StatusPill
              status={TYPE_LABELS[type] ?? insight.type}
              variant={TYPE_VARIANTS[type] as "success" | "warning" | "danger" | "info" | "neutral" ?? "neutral"}
            />
          </div>
          {!expanded && insight.content && (
            <p
              className="text-xs leading-relaxed line-clamp-2"
              style={{ color: "var(--color-text-secondary)" }}
            >
              {insight.content}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {insight.source && (
              <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                {insight.source}
              </span>
            )}
            {productName && (
              <span
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  background: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
                  color: "var(--color-accent)",
                }}
              >
                {productName}
              </span>
            )}
            <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              {relativeTime(insight.created_at)}
            </span>
          </div>
        </div>

        {/* Right side: processed + expand icon */}
        <div className="flex items-center gap-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <label className="flex items-center gap-1.5 cursor-pointer" title="Verwerkt">
            <input
              type="checkbox"
              checked={insight.processed ?? false}
              onChange={(e) => onToggleProcessed(e.target.checked)}
              className="w-3.5 h-3.5 rounded"
              style={{ accentColor: "var(--color-accent)" }}
            />
            <span className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
              Verwerkt
            </span>
          </label>
        </div>
        <div className="flex-shrink-0 mt-0.5 cursor-pointer" onClick={onToggle}>
          {expanded ? (
            <ChevronUp size={14} style={{ color: "var(--color-text-tertiary)" }} />
          ) : (
            <ChevronDown size={14} style={{ color: "var(--color-text-tertiary)" }} />
          )}
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && insight.content && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 pt-1 text-sm leading-relaxed"
              style={{
                color: "var(--color-text-secondary)",
                borderTop: "1px solid var(--color-border)",
              }}
            >
              <p className="mt-3">{insight.content}</p>
              {insight.usable_for && (
                <p className="mt-2 text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                  <strong>Bruikbaar voor:</strong> {insight.usable_for}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Quick Add Bar ────────────────────────────────────────────────────────────

interface QuickAddBarProps {
  products: Product[];
  onAdded: () => void;
}

function QuickAddBar({ products, onAdded }: QuickAddBarProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<InsightType>("review");
  const [productId, setProductId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Vul een titel in.");
      return;
    }
    setSaving(true);
    setError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any;
    const { error: err } = await supabase.from("nucleus_customer_insights").insert({
      title: title.trim(),
      type,
      product_id: productId || null,
    });
    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }
    setTitle("");
    setType("review");
    setProductId("");
    setSaving(false);
    onAdded();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 p-3 rounded-[14px] border"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Nieuw inzicht…"
        className="flex-1 min-w-0 rounded-lg px-3 py-2 text-sm outline-none transition-colors"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text-primary)",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--color-accent)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--color-border)")}
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as InsightType)}
        className="rounded-lg px-3 py-2 text-sm outline-none"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text-primary)",
        }}
      >
        {INSIGHT_TYPES.map((t) => (
          <option key={t} value={t}>{TYPE_LABELS[t]}</option>
        ))}
      </select>
      <select
        value={productId}
        onChange={(e) => setProductId(e.target.value)}
        className="rounded-lg px-3 py-2 text-sm outline-none"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text-primary)",
          maxWidth: 160,
        }}
      >
        <option value="">— Product —</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <button
        type="submit"
        disabled={saving}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50 whitespace-nowrap"
        style={{ background: "var(--color-accent)", color: "#fff" }}
      >
        <Plus size={14} />
        {saving ? "Toevoegen…" : "Toevoegen"}
      </button>
      {error && <span className="text-xs" style={{ color: "var(--color-danger)" }}>{error}</span>}
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<CustomerInsight[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<string>("alle");
  const [filterSentiment, setFilterSentiment] = useState<string>("alle");
  const [filterProduct, setFilterProduct] = useState<string>("");
  const [filterProcessed, setFilterProcessed] = useState<boolean>(false);

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [{ data: ins }, { data: prods }] = await Promise.all([
      supabase.from("nucleus_customer_insights").select("*").order("created_at", { ascending: false }),
      supabase.from("nucleus_products").select("id, name").order("name"),
    ]);
    if (ins) setInsights(ins);
    if (prods) setProducts(prods as Product[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  const toggleProcessed = async (insight: CustomerInsight, val: boolean) => {
    // Optimistic
    setInsights((prev) => prev.map((i) => i.id === insight.id ? { ...i, processed: val } : i));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any;
    await supabase.from("nucleus_customer_insights").update({ processed: val }).eq("id", insight.id);
  };

  const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));

  const filtered = insights.filter((i) => {
    if (filterType !== "alle" && i.type !== filterType) return false;
    if (filterSentiment !== "alle" && i.sentiment !== filterSentiment) return false;
    if (filterProduct && i.product_id !== filterProduct) return false;
    if (filterProcessed && !i.processed) return false;
    return true;
  });

  const inputStyle = {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border)",
    color: "var(--color-text-primary)",
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-8 py-5 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div>
          <h1
            className="text-[24px] font-bold leading-tight"
            style={{ color: "var(--color-text-primary)" }}
          >
            Klantinzichten
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
            {insights.length} inzicht{insights.length !== 1 ? "en" : ""} vastgelegd
          </p>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">

        {/* Quick add */}
        <QuickAddBar products={products} onAdded={fetchInsights} />

        {/* Filters */}
        <div className="space-y-2.5">
          {/* Type chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Chip label="Alle" active={filterType === "alle"} onClick={() => setFilterType("alle")} />
            {INSIGHT_TYPES.map((t) => (
              <Chip key={t} label={TYPE_LABELS[t]} active={filterType === t} onClick={() => setFilterType(t)} />
            ))}
          </div>
          {/* Sentiment + product + processed */}
          <div className="flex items-center gap-2 flex-wrap">
            <Chip label="Alle sentimenten" active={filterSentiment === "alle"} onClick={() => setFilterSentiment("alle")} />
            {SENTIMENTS.map((s) => (
              <Chip
                key={s}
                label={s.charAt(0).toUpperCase() + s.slice(1)}
                active={filterSentiment === s}
                onClick={() => setFilterSentiment(s)}
              />
            ))}
            <select
              value={filterProduct}
              onChange={(e) => setFilterProduct(e.target.value)}
              className="rounded-lg px-3 py-1.5 text-xs outline-none"
              style={inputStyle}
            >
              <option value="">Alle producten</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs" style={{ color: "var(--color-text-secondary)" }}>
              <input
                type="checkbox"
                checked={filterProcessed}
                onChange={(e) => setFilterProcessed(e.target.checked)}
                style={{ accentColor: "var(--color-accent)" }}
              />
              Alleen onverwerkt
            </label>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[76px] rounded-[14px] animate-pulse"
                style={{ background: "var(--color-card)" }}
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Lightbulb size={24} />}
            title="Nog geen inzichten"
            description="Voeg klantfeedback, pijnpunten en hooks toe om je strategie te versterken."
          />
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-2.5">
              {filtered.map((insight) => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  productName={insight.product_id ? (productMap[insight.product_id] ?? null) : null}
                  expanded={expandedId === insight.id}
                  onToggle={() => setExpandedId(expandedId === insight.id ? null : insight.id)}
                  onToggleProcessed={(val) => toggleProcessed(insight, val)}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

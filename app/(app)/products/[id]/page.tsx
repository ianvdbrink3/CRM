"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ExternalLink,
  Megaphone,
  Image,
  Lightbulb,
  ShoppingCart,
  Package,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type {
  Product,
  Campaign,
  Creative,
  CustomerInsight,
  SupplierPayment,
} from "@/lib/supabase/types";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { StatusPill } from "@/components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

type ScoreKey =
  | "problem_solving"
  | "wow_factor"
  | "trending"
  | "competition"
  | "virality"
  | "ugc_potential"
  | "profitability";

const SCORE_FIELDS: { key: ScoreKey; label: string; inverted?: boolean }[] = [
  { key: "problem_solving", label: "Probleem oplossen" },
  { key: "wow_factor", label: "Wow-factor" },
  { key: "trending", label: "Trending" },
  { key: "competition", label: "Concurrentie", inverted: true },
  { key: "virality", label: "Viraliteit" },
  { key: "ugc_potential", label: "UGC Potentieel" },
  { key: "profitability", label: "Winstgevendheid" },
];

type RelatedTab = "campagnes" | "creatives" | "inzichten" | "bestellingen";

const TABS: { key: RelatedTab; label: string }[] = [
  { key: "campagnes", label: "Campagnes" },
  { key: "creatives", label: "Creatives" },
  { key: "inzichten", label: "Inzichten" },
  { key: "bestellingen", label: "Bestellingen" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Compute winning score client-side.
 * Formula: average of 7 scores, but for competition we invert (10 - competition).
 */
function computeWinningScore(scores: Record<ScoreKey, number | null>): number | null {
  const vals = SCORE_FIELDS.map(({ key, inverted }) => {
    const v = scores[key];
    if (v == null) return null;
    return inverted ? 10 - v : v;
  });
  const valid = vals.filter((v): v is number => v != null);
  if (valid.length === 0) return null;
  const sum = valid.reduce((a, b) => a + b, 0);
  return Math.round((sum / valid.length) * 10) / 10;
}

function computeVerdict(score: number | null): string {
  if (score == null) return "—";
  if (score >= 8) return "Sterk product";
  if (score >= 6.5) return "Potentieel";
  return "Zwak product";
}

function verdictStyle(score: number | null): { color: string; bg: string } {
  if (score == null || score < 6.5)
    return {
      bg: "color-mix(in srgb, #FF453A 15%, transparent)",
      color: "#FF453A",
    };
  if (score < 8)
    return {
      bg: "color-mix(in srgb, #FF9F0A 15%, transparent)",
      color: "#FF9F0A",
    };
  return {
    bg: "color-mix(in srgb, #34C759 15%, transparent)",
    color: "#34C759",
  };
}

function computeMargin(
  cost: number | null,
  sell: number | null,
  ship: number | null
): { perUnit: number | null; pct: number | null } {
  if (sell == null) return { perUnit: null, pct: null };
  const totalCost = (cost ?? 0) + (ship ?? 0);
  const perUnit = sell - totalCost;
  const pct = sell > 0 ? Math.round((perUnit / sell) * 1000) / 10 : null;
  return { perUnit, pct };
}

// ─── Input field helper ───────────────────────────────────────────────────────

function FieldInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  prefix?: string;
}) {
  return (
    <div>
      <label
        className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        {label}
      </label>
      <div className="relative">
        {prefix && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-sm"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            {prefix}
          </span>
        )}
        <input
          type={type}
          step={type === "number" ? "0.01" : undefined}
          min={type === "number" ? "0" : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-primary)",
            paddingLeft: prefix ? "1.75rem" : undefined,
          }}
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = "var(--color-accent)")
          }
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = "var(--color-border)")
          }
        />
      </div>
    </div>
  );
}

// ─── Score Slider ─────────────────────────────────────────────────────────────

function ScoreSlider({
  label,
  value,
  inverted,
  onChange,
}: {
  label: string;
  value: number;
  inverted?: boolean;
  onChange: (v: number) => void;
}) {
  const displayVal = inverted ? 10 - value : value;
  const pct = ((value - 1) / 9) * 100;

  // Colour based on effective (display) value
  const trackColor =
    displayVal >= 7
      ? "#34C759"
      : displayVal >= 5
      ? "#FF9F0A"
      : "#FF453A";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span
          className="text-sm font-medium"
          style={{ color: "var(--color-text-primary)" }}
        >
          {label}
          {inverted && (
            <span
              className="ml-1.5 text-xs"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              (lager = beter)
            </span>
          )}
        </span>
        <span
          className="text-sm font-bold tabular-nums w-6 text-right"
          style={{ color: trackColor }}
        >
          {value}
        </span>
      </div>
      <div className="relative h-2 rounded-full" style={{ background: "var(--color-border)" }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all"
          style={{ width: `${pct}%`, background: trackColor }}
        />
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
          style={{ margin: 0 }}
        />
      </div>
      <div className="flex justify-between text-xs" style={{ color: "var(--color-text-tertiary)" }}>
        <span>1</span>
        <span>10</span>
      </div>
    </div>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────

function SectionCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[16px] border p-5 ${className ?? ""}`}
      style={{
        background: "var(--color-card)",
        borderColor: "var(--color-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <h2
        className="text-[15px] font-semibold mb-4"
        style={{ color: "var(--color-text-primary)" }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

// ─── Related lists ────────────────────────────────────────────────────────────

function CampaignesList({ items }: { items: Campaign[] }) {
  if (items.length === 0)
    return (
      <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>
        Geen campagnes gekoppeld.
      </p>
    );
  return (
    <ul className="space-y-2">
      {items.map((c) => (
        <li
          key={c.id}
          className="flex items-center justify-between rounded-lg px-3 py-2.5"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div>
            <p
              className="text-sm font-medium"
              style={{ color: "var(--color-text-primary)" }}
            >
              {c.name}
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {c.platform}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {c.roas != null && (
              <span
                className="text-xs font-semibold tabular-nums"
                style={{
                  color: c.roas >= 2 ? "var(--color-success)" : "var(--color-danger)",
                }}
              >
                {formatNumber(c.roas)}x ROAS
              </span>
            )}
            <StatusPill status={c.status} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function CreativesList({ items }: { items: Creative[] }) {
  if (items.length === 0)
    return (
      <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>
        Geen creatives gekoppeld.
      </p>
    );
  return (
    <ul className="space-y-2">
      {items.map((c) => (
        <li
          key={c.id}
          className="flex items-center justify-between rounded-lg px-3 py-2.5"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div>
            <p
              className="text-sm font-medium"
              style={{ color: "var(--color-text-primary)" }}
            >
              {c.name}
            </p>
            {c.format && (
              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                {c.format}
                {c.hook_type ? ` · ${c.hook_type}` : ""}
              </p>
            )}
          </div>
          <StatusPill status={c.status} />
        </li>
      ))}
    </ul>
  );
}

function InsightsList({ items }: { items: CustomerInsight[] }) {
  if (items.length === 0)
    return (
      <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>
        Geen inzichten gevonden.
      </p>
    );
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li
          key={i.id}
          className="rounded-lg px-3 py-2.5"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <p
              className="text-sm font-medium"
              style={{ color: "var(--color-text-primary)" }}
            >
              {i.title}
            </p>
            {i.sentiment && (
              <span
                className="text-xs px-2 py-0.5 rounded-full"
                style={{
                  background:
                    i.sentiment === "positief"
                      ? "color-mix(in srgb, var(--color-success) 12%, transparent)"
                      : i.sentiment === "negatief"
                      ? "color-mix(in srgb, var(--color-danger) 12%, transparent)"
                      : "color-mix(in srgb, var(--color-text-tertiary) 12%, transparent)",
                  color:
                    i.sentiment === "positief"
                      ? "var(--color-success)"
                      : i.sentiment === "negatief"
                      ? "var(--color-danger)"
                      : "var(--color-text-secondary)",
                }}
              >
                {i.sentiment}
              </span>
            )}
          </div>
          {i.content && (
            <p
              className="text-xs line-clamp-2"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              {i.content}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

function OrdersList({ items }: { items: SupplierPayment[] }) {
  if (items.length === 0)
    return (
      <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>
        Geen bestellingen gevonden.
      </p>
    );
  return (
    <ul className="space-y-2">
      {items.map((o) => (
        <li
          key={o.id}
          className="flex items-center justify-between rounded-lg px-3 py-2.5"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <div>
            <p
              className="text-sm font-medium"
              style={{ color: "var(--color-text-primary)" }}
            >
              {o.reference ?? `Bestelling`}
            </p>
            {o.order_date && (
              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                {o.order_date}
                {o.units != null ? ` · ${o.units} stuks` : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {o.amount != null && (
              <span
                className="text-sm font-semibold tabular-nums"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {formatCurrency(o.amount)}
              </span>
            )}
            <StatusPill status={o.status} />
          </div>
        </li>
      ))}
    </ul>
  );
}

// ─── Product Detail Page ──────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  // Validation scores (local editable state)
  const [scores, setScores] = useState<Record<ScoreKey, number>>({
    problem_solving: 5,
    wow_factor: 5,
    trending: 5,
    competition: 5,
    virality: 5,
    ugc_potential: 5,
    profitability: 5,
  });

  // Unit economics
  const [costPrice, setCostPrice] = useState("");
  const [sellPrice, setSellPrice] = useState("");
  const [shippingCost, setShippingCost] = useState("");
  const [savingEcon, setSavingEcon] = useState(false);

  // Related data
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [insights, setInsights] = useState<CustomerInsight[]>([]);
  const [orders, setOrders] = useState<SupplierPayment[]>([]);
  const [activeTab, setActiveTab] = useState<RelatedTab>("campagnes");

  // Score auto-save debounce
  const scoreDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const econDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  const fetchProduct = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any;
    const { data } = await supabase
      .from("nucleus_products")
      .select("*")
      .eq("id", id)
      .single() as { data: Product | null };
    if (data) {
      setProduct(data);
      setNameValue(data.name);
      setScores({
        problem_solving: data.problem_solving ?? 5,
        wow_factor: data.wow_factor ?? 5,
        trending: data.trending ?? 5,
        competition: data.competition ?? 5,
        virality: data.virality ?? 5,
        ugc_potential: data.ugc_potential ?? 5,
        profitability: data.profitability ?? 5,
      });
      setCostPrice(data.cost_price != null ? String(data.cost_price) : "");
      setSellPrice(data.sell_price != null ? String(data.sell_price) : "");
      setShippingCost(data.shipping_cost != null ? String(data.shipping_cost) : "");
    }
    setLoading(false);
  }, [id]);

  const fetchRelated = useCallback(async () => {
    if (!id) return;
    const supabase = createClient();
    const [{ data: camps }, { data: creatv }, { data: insgs }, { data: ords }] =
      await Promise.all([
        supabase
          .from("nucleus_campaigns")
          .select("*")
          .eq("product_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("nucleus_creatives")
          .select("*")
          .eq("product_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("nucleus_customer_insights")
          .select("*")
          .eq("product_id", id)
          .order("created_at", { ascending: false }),
        supabase
          .from("nucleus_supplier_payments")
          .select("*")
          .eq("product_id", id)
          .order("created_at", { ascending: false }),
      ]);
    if (camps) setCampaigns(camps);
    if (creatv) setCreatives(creatv);
    if (insgs) setInsights(insgs);
    if (ords) setOrders(ords);
  }, [id]);

  useEffect(() => {
    fetchProduct();
    fetchRelated();
  }, [fetchProduct, fetchRelated]);

  // ─── Inline name save ──────────────────────────────────────────────────────

  const saveName = async () => {
    if (!product || nameValue.trim() === product.name) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createClient() as any;
    await supabase
      .from("nucleus_products")
      .update({ name: nameValue.trim() })
      .eq("id", product.id);
    setProduct((prev) => (prev ? { ...prev, name: nameValue.trim() } : prev));
    setSavingName(false);
    setEditingName(false);
  };

  // ─── Score auto-save (debounced 500ms) ────────────────────────────────────

  const handleScoreChange = (key: ScoreKey, val: number) => {
    setScores((prev) => ({ ...prev, [key]: val }));

    if (scoreDebounce.current) clearTimeout(scoreDebounce.current);
    scoreDebounce.current = setTimeout(async () => {
      if (!product) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;
      await supabase
        .from("nucleus_products")
        .update({ [key]: val })
        .eq("id", product.id);
    }, 500);
  };

  // ─── Unit economics auto-save (debounced 600ms) ───────────────────────────

  const triggerEconSave = (
    cost: string,
    sell: string,
    ship: string
  ) => {
    if (econDebounce.current) clearTimeout(econDebounce.current);
    econDebounce.current = setTimeout(async () => {
      if (!product) return;
      setSavingEcon(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const supabase = createClient() as any;
      await supabase
        .from("nucleus_products")
        .update({
          cost_price: cost ? parseFloat(cost) : null,
          sell_price: sell ? parseFloat(sell) : null,
          shipping_cost: ship ? parseFloat(ship) : null,
        })
        .eq("id", product.id);
      setSavingEcon(false);
    }, 600);
  };

  // Computed live margin
  const liveMargin = computeMargin(
    costPrice ? parseFloat(costPrice) : null,
    sellPrice ? parseFloat(sellPrice) : null,
    shippingCost ? parseFloat(shippingCost) : null
  );

  // Live winning score
  const liveScore = computeWinningScore(
    scores as Record<ScoreKey, number | null>
  );
  const liveVerdict = computeVerdict(liveScore);
  const liveVerdictStyle = verdictStyle(liveScore);

  // ─── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="px-8 py-6 max-w-[900px] mx-auto space-y-4">
        {[240, 320, 200].map((h, i) => (
          <div
            key={i}
            className="rounded-[16px] animate-pulse"
            style={{
              height: h,
              background: "var(--color-card)",
              border: "1px solid var(--color-border)",
            }}
          />
        ))}
      </div>
    );
  }

  if (!product) {
    return (
      <div className="px-8 py-6 flex flex-col items-center justify-center gap-4 h-full">
        <Package size={40} style={{ color: "var(--color-text-tertiary)" }} />
        <p style={{ color: "var(--color-text-secondary)" }}>
          Product niet gevonden.
        </p>
        <button
          onClick={() => router.push("/products")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            background: "var(--color-accent)",
            color: "#fff",
          }}
        >
          <ArrowLeft size={14} />
          Terug naar producten
        </button>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const tabIcons: Record<RelatedTab, React.ReactNode> = {
    campagnes: <Megaphone size={13} />,
    creatives: <Image size={13} />,
    inzichten: <Lightbulb size={13} />,
    bestellingen: <ShoppingCart size={13} />,
  };

  const tabCounts: Record<RelatedTab, number> = {
    campagnes: campaigns.length,
    creatives: creatives.length,
    inzichten: insights.length,
    bestellingen: orders.length,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
      className="px-8 py-6 max-w-[900px] mx-auto space-y-5 pb-12"
    >
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 1. HEADER                                                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div
        className="rounded-[16px] border p-5"
        style={{
          background: "var(--color-card)",
          borderColor: "var(--color-border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {/* Back button */}
        <button
          onClick={() => router.push("/products")}
          className="flex items-center gap-1.5 text-sm mb-4 transition-opacity hover:opacity-70"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          <ArrowLeft size={14} />
          Producten
        </button>

        <div className="flex items-start justify-between gap-4">
          {/* Editable name */}
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  onBlur={saveName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                    if (e.key === "Escape") {
                      setNameValue(product.name);
                      setEditingName(false);
                    }
                  }}
                  className="text-[24px] font-bold outline-none rounded-lg px-2 py-1 w-full"
                  style={{
                    background: "var(--color-surface)",
                    border: "1.5px solid var(--color-accent)",
                    color: "var(--color-text-primary)",
                  }}
                />
                {savingName && (
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Opslaan…
                  </span>
                )}
              </div>
            ) : (
              <h1
                className="text-[24px] font-bold leading-tight cursor-pointer rounded-lg px-2 py-1 -ml-2 transition-colors hover:bg-[color-mix(in_srgb,var(--color-border)_50%,transparent)]"
                style={{ color: "var(--color-text-primary)" }}
                onClick={() => setEditingName(true)}
                title="Klik om te bewerken"
              >
                {product.name}
              </h1>
            )}
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-shrink-0 pt-1">
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{
                background: liveVerdictStyle.bg,
                color: liveVerdictStyle.color,
              }}
            >
              {liveVerdict}
            </span>
            <StatusPill status={product.status} />
          </div>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {product.category && (
            <span
              className="text-xs"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Categorie:{" "}
              <span style={{ color: "var(--color-text-secondary)" }}>
                {product.category}
              </span>
            </span>
          )}
          {product.type && (
            <span
              className="text-xs"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Type:{" "}
              <span style={{ color: "var(--color-text-secondary)" }}>
                {product.type}
              </span>
            </span>
          )}
          {product.product_url && (
            <a
              href={product.product_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
              style={{ color: "var(--color-accent)" }}
            >
              <ExternalLink size={11} />
              Product link
            </a>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 2. VALIDATIESCORES                                          */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <SectionCard title="Validatiescores">
        {/* Live score + verdict */}
        <div
          className="flex items-center gap-4 mb-5 p-3 rounded-[10px]"
          style={{ background: "var(--color-surface)" }}
        >
          <div>
            <p
              className="text-xs uppercase tracking-wide font-semibold mb-0.5"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Winning Score
            </p>
            <p
              className="text-[28px] font-bold tabular-nums leading-none"
              style={{ color: liveVerdictStyle.color }}
            >
              {liveScore != null ? formatNumber(liveScore) : "—"}
            </p>
          </div>
          <div
            className="w-px self-stretch"
            style={{ background: "var(--color-border)" }}
          />
          <div>
            <p
              className="text-xs uppercase tracking-wide font-semibold mb-0.5"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Verdict
            </p>
            <span
              className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold"
              style={{
                background: liveVerdictStyle.bg,
                color: liveVerdictStyle.color,
              }}
            >
              {liveVerdict}
            </span>
          </div>
          <p
            className="ml-auto text-xs"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Auto-opslaan bij loslaten
          </p>
        </div>

        {/* Sliders grid */}
        <div className="grid grid-cols-1 gap-5">
          {SCORE_FIELDS.map(({ key, label, inverted }) => (
            <ScoreSlider
              key={key}
              label={label}
              value={scores[key]}
              inverted={inverted}
              onChange={(v) => handleScoreChange(key, v)}
            />
          ))}
        </div>
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 3. UNIT ECONOMICS                                           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <SectionCard title="Unit Economics">
        <div className="grid grid-cols-3 gap-4 mb-5">
          <FieldInput
            label="Inkoopprijs"
            type="number"
            value={costPrice}
            onChange={(v) => {
              setCostPrice(v);
              triggerEconSave(v, sellPrice, shippingCost);
            }}
            placeholder="0,00"
            prefix="€"
          />
          <FieldInput
            label="Verkoopprijs"
            type="number"
            value={sellPrice}
            onChange={(v) => {
              setSellPrice(v);
              triggerEconSave(costPrice, v, shippingCost);
            }}
            placeholder="0,00"
            prefix="€"
          />
          <FieldInput
            label="Verzendkosten"
            type="number"
            value={shippingCost}
            onChange={(v) => {
              setShippingCost(v);
              triggerEconSave(costPrice, sellPrice, v);
            }}
            placeholder="0,00"
            prefix="€"
          />
        </div>

        {/* Computed margin */}
        <div
          className="grid grid-cols-2 gap-3 p-3 rounded-[10px]"
          style={{ background: "var(--color-surface)" }}
        >
          <div>
            <p
              className="text-xs uppercase tracking-wide font-semibold mb-0.5"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Marge per stuk
            </p>
            <p
              className="text-[22px] font-bold tabular-nums"
              style={{
                color:
                  liveMargin.perUnit == null
                    ? "var(--color-text-tertiary)"
                    : liveMargin.perUnit >= 0
                    ? "var(--color-success)"
                    : "var(--color-danger)",
              }}
            >
              {liveMargin.perUnit != null
                ? formatCurrency(liveMargin.perUnit)
                : "—"}
            </p>
          </div>
          <div>
            <p
              className="text-xs uppercase tracking-wide font-semibold mb-0.5"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Marge %
            </p>
            <p
              className="text-[22px] font-bold tabular-nums"
              style={{
                color:
                  liveMargin.pct == null
                    ? "var(--color-text-tertiary)"
                    : liveMargin.pct >= 30
                    ? "var(--color-success)"
                    : liveMargin.pct >= 15
                    ? "#FF9F0A"
                    : "var(--color-danger)",
              }}
            >
              {liveMargin.pct != null ? `${formatNumber(liveMargin.pct)}%` : "—"}
            </p>
          </div>
        </div>

        {savingEcon && (
          <p
            className="text-xs mt-2"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Opslaan…
          </p>
        )}
      </SectionCard>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 4. GEKOPPELD                                                */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div
        className="rounded-[16px] border overflow-hidden"
        style={{
          background: "var(--color-card)",
          borderColor: "var(--color-border)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {/* Tab bar */}
        <div
          className="flex border-b overflow-x-auto"
          style={{ borderColor: "var(--color-border)" }}
        >
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className="flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors relative"
              style={{
                color:
                  activeTab === key
                    ? "var(--color-accent)"
                    : "var(--color-text-secondary)",
                borderBottom:
                  activeTab === key
                    ? "2px solid var(--color-accent)"
                    : "2px solid transparent",
              }}
            >
              {tabIcons[key]}
              {label}
              <span
                className="inline-flex items-center justify-center rounded-full text-xs font-semibold px-1.5 min-w-[18px] h-[18px]"
                style={{
                  background:
                    activeTab === key
                      ? "color-mix(in srgb, var(--color-accent) 15%, transparent)"
                      : "color-mix(in srgb, var(--color-text-tertiary) 12%, transparent)",
                  color:
                    activeTab === key
                      ? "var(--color-accent)"
                      : "var(--color-text-tertiary)",
                }}
              >
                {tabCounts[key]}
              </span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === "campagnes" && (
                <CampaignesList items={campaigns} />
              )}
              {activeTab === "creatives" && (
                <CreativesList items={creatives} />
              )}
              {activeTab === "inzichten" && (
                <InsightsList items={insights} />
              )}
              {activeTab === "bestellingen" && (
                <OrdersList items={orders} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

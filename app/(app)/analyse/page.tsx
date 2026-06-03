"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Zap,
  Eye,
  ArrowRight,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  fetchAnalyseData,
  type AnalyseData,
  type Insight,
  type Recommendation,
  type WatchItem,
  type Priority,
} from "@/lib/data/analyse";

// ─── Priority helpers ──────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; dot: string; bg: string; border: string; text: string }
> = {
  critical: {
    label: "Direct aandacht",
    dot: "#FF453A",
    bg: "rgba(255,69,58,0.08)",
    border: "rgba(255,69,58,0.22)",
    text: "#FF453A",
  },
  warning: {
    label: "In de gaten houden",
    dot: "#FF9F0A",
    bg: "rgba(255,159,10,0.08)",
    border: "rgba(255,159,10,0.22)",
    text: "#FF9F0A",
  },
  good: {
    label: "Presteert goed",
    dot: "#30D158",
    bg: "rgba(48,209,88,0.08)",
    border: "rgba(48,209,88,0.22)",
    text: "#30D158",
  },
};

const IMPACT_CONFIG = {
  high: { label: "Hoog impact", color: "#5B6CFF" },
  medium: { label: "Gemiddeld impact", color: "#FF9F0A" },
  low: { label: "Laag impact", color: "var(--color-text-tertiary)" },
};

const EFFORT_CONFIG = {
  low: { label: "Weinig moeite" },
  medium: { label: "Gemiddeld" },
  high: { label: "Veel moeite" },
};

const SOURCE_LABELS: Record<string, string> = {
  meta_ads: "Meta Ads",
  shopify: "Shopify",
  combined: "Meta + Shopify",
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
    >
      <span
        className="inline-block rounded-full flex-shrink-0"
        style={{ width: 6, height: 6, background: cfg.dot, boxShadow: `0 0 6px ${cfg.dot}` }}
      />
      {cfg.label}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium"
      style={{
        background: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
        color: "var(--color-accent)",
        border: "1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)",
      }}
    >
      {SOURCE_LABELS[source] ?? source}
    </span>
  );
}

function MetricChip({ metric }: { metric: NonNullable<Insight["metric"]> }) {
  const Icon =
    metric.direction === "up"
      ? TrendingUp
      : metric.direction === "down"
      ? TrendingDown
      : Minus;
  const color =
    metric.direction === "up"
      ? "#30D158"
      : metric.direction === "down"
      ? "#FF453A"
      : "var(--color-text-tertiary)";
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-[10px]"
      style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
    >
      <div>
        <p className="text-xs font-medium" style={{ color: "var(--color-text-tertiary)" }}>
          {metric.label}
        </p>
        <p className="text-lg font-bold leading-tight" style={{ color: "var(--color-text-primary)" }}>
          {metric.value}
        </p>
      </div>
      <div className="flex items-center gap-0.5" style={{ color }}>
        <Icon size={13} />
        <span className="text-xs font-semibold">{metric.change}</span>
      </div>
    </div>
  );
}

// ─── Insight Card ──────────────────────────────────────────────────────────────

function InsightCard({ insight }: { insight: Insight }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = PRIORITY_CONFIG[insight.priority];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[14px] border overflow-hidden"
      style={{
        background: "var(--color-card)",
        borderColor: "var(--color-border)",
        borderLeft: `3px solid ${cfg.dot}`,
      }}
    >
      <div
        className="flex items-start gap-3 px-4 py-3.5 cursor-pointer"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start gap-2 flex-wrap">
            <PriorityBadge priority={insight.priority} />
            <SourceBadge source={insight.source} />
          </div>
          <p className="text-sm font-semibold leading-snug" style={{ color: "var(--color-text-primary)" }}>
            {insight.title}
          </p>
          {!expanded && (
            <p className="text-xs leading-relaxed line-clamp-2" style={{ color: "var(--color-text-secondary)" }}>
              {insight.description}
            </p>
          )}
          {insight.metric && !expanded && (
            <div className="pt-1">
              <MetricChip metric={insight.metric} />
            </div>
          )}
        </div>
        <button className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 space-y-3"
              style={{ borderTop: "1px solid var(--color-border)" }}
            >
              <p className="pt-3 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                {insight.description}
              </p>
              {insight.metric && <MetricChip metric={insight.metric} />}
              <div
                className="rounded-[10px] px-3 py-2.5"
                style={{ background: "color-mix(in srgb, var(--color-accent) 6%, transparent)", border: "1px solid color-mix(in srgb, var(--color-accent) 15%, transparent)" }}
              >
                <p className="text-xs font-semibold mb-1" style={{ color: "var(--color-accent)" }}>
                  Waarom dit belangrijk is
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                  {insight.why}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Recommendation Card ───────────────────────────────────────────────────────

function RecommendationCard({ rec }: { rec: Recommendation }) {
  const [expanded, setExpanded] = useState(false);
  const impact = IMPACT_CONFIG[rec.impact];
  const effort = EFFORT_CONFIG[rec.effort];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[14px] border overflow-hidden"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      <div
        className="flex items-start gap-3 px-4 py-3.5 cursor-pointer"
        onClick={() => setExpanded((p) => !p)}
      >
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-full mt-0.5"
          style={{ width: 28, height: 28, background: "rgba(91,108,255,0.12)", color: "#5B6CFF" }}
        >
          <ArrowRight size={13} />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="text-sm font-semibold leading-snug" style={{ color: "var(--color-text-primary)" }}>
            {rec.title}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold" style={{ color: impact.color }}>
              {impact.label}
            </span>
            <span className="text-[10px]" style={{ color: "var(--color-text-tertiary)" }}>·</span>
            <span className="text-[11px]" style={{ color: "var(--color-text-tertiary)" }}>
              {effort.label}
            </span>
            <SourceBadge source={rec.source} />
          </div>
        </div>
        <button className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-text-tertiary)" }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="px-4 pb-4 space-y-3"
              style={{ borderTop: "1px solid var(--color-border)" }}
            >
              <p className="pt-3 text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                {rec.description}
              </p>
              <div
                className="flex items-start gap-2 rounded-[10px] px-3 py-2.5"
                style={{ background: "rgba(48,209,88,0.06)", border: "1px solid rgba(48,209,88,0.18)" }}
              >
                <Zap size={13} className="flex-shrink-0 mt-0.5" style={{ color: "#30D158" }} />
                <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                  <span className="font-semibold" style={{ color: "#30D158" }}>Actie: </span>
                  {rec.action}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Watch Item Card ───────────────────────────────────────────────────────────

function WatchItemCard({ item }: { item: WatchItem }) {
  const cfg = PRIORITY_CONFIG[item.priority];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 rounded-[14px] border px-4 py-3.5"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)" }}
    >
      <div
        className="flex-shrink-0 flex items-center justify-center rounded-full mt-0.5"
        style={{ width: 28, height: 28, background: cfg.bg, color: cfg.text }}
      >
        <Eye size={13} />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold leading-snug" style={{ color: "var(--color-text-primary)" }}>
            {item.title}
          </p>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          {item.description}
        </p>
        <div className="flex items-center gap-2 pt-0.5 flex-wrap">
          <PriorityBadge priority={item.priority} />
          <span
            className="text-[10px] px-1.5 py-0.5 rounded"
            style={{ background: "var(--color-surface)", color: "var(--color-text-tertiary)", border: "1px solid var(--color-border)" }}
          >
            {item.trend}
          </span>
          <SourceBadge source={item.source} />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Section header ────────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  count,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div
        className="flex-shrink-0 flex items-center justify-center rounded-[10px]"
        style={{ width: 36, height: 36, background: "color-mix(in srgb, var(--color-accent) 12%, transparent)", color: "var(--color-accent)" }}
      >
        {icon}
      </div>
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold" style={{ color: "var(--color-text-primary)" }}>
            {title}
          </h2>
          {count !== undefined && (
            <span
              className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
              style={{ background: "color-mix(in srgb, var(--color-accent) 15%, transparent)", color: "var(--color-accent)" }}
            >
              {count}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Skeleton loader ───────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="h-[88px] rounded-[14px] animate-pulse"
      style={{ background: "var(--color-card)" }}
    />
  );
}

// ─── Status banner ─────────────────────────────────────────────────────────────

function StatusBanner({ isLive, onRefresh, loading }: { isLive: boolean; onRefresh: () => void; loading: boolean }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-[12px]"
      style={{
        background: isLive
          ? "rgba(48,209,88,0.07)"
          : "rgba(255,159,10,0.07)",
        border: isLive
          ? "1px solid rgba(48,209,88,0.2)"
          : "1px solid rgba(255,159,10,0.2)",
      }}
    >
      {isLive ? (
        <Wifi size={14} style={{ color: "#30D158", flexShrink: 0 }} />
      ) : (
        <WifiOff size={14} style={{ color: "#FF9F0A", flexShrink: 0 }} />
      )}
      <p className="flex-1 text-xs" style={{ color: isLive ? "#30D158" : "#FF9F0A" }}>
        {isLive
          ? "Live verbonden met Meta Ads & Shopify — data wordt elke nacht vernieuwd."
          : "Demo-modus — toont realistische voorbeelddata. Koppel Meta Ads & Shopify om live inzichten te activeren."}
      </p>
      <button
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-70 disabled:opacity-40"
        style={{
          background: "var(--color-surface)",
          color: "var(--color-text-secondary)",
          border: "1px solid var(--color-border)",
          flexShrink: 0,
        }}
      >
        <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
        Vernieuwen
      </button>
    </div>
  );
}

// ─── Priority summary bar ──────────────────────────────────────────────────────

function SummaryBar({ insights }: { insights: Insight[] }) {
  const critical = insights.filter((i) => i.priority === "critical").length;
  const warning = insights.filter((i) => i.priority === "warning").length;
  const good = insights.filter((i) => i.priority === "good").length;
  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { count: critical, ...PRIORITY_CONFIG.critical },
        { count: warning, ...PRIORITY_CONFIG.warning },
        { count: good, ...PRIORITY_CONFIG.good },
      ].map((item) => (
        <div
          key={item.label}
          className="rounded-[12px] px-4 py-3 text-center"
          style={{ background: item.bg, border: `1px solid ${item.border}` }}
        >
          <p className="text-2xl font-bold" style={{ color: item.dot }}>
            {item.count}
          </p>
          <p className="text-[11px] font-medium mt-0.5" style={{ color: item.text }}>
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AnalysePage() {
  const [data, setData] = useState<AnalyseData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const result = await fetchAnalyseData();
    setData(result);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const sortedInsights = data?.insights.slice().sort((a, b) => {
    const order: Record<Priority, number> = { critical: 0, warning: 1, good: 2 };
    return order[a.priority] - order[b.priority];
  }) ?? [];

  const sortedRecs = data?.recommendations.slice().sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.impact] - order[b.impact];
  }) ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div
        className="flex items-center justify-between px-4 md:px-8 py-4 md:py-5 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div>
          <h1 className="text-[20px] md:text-[24px] font-bold leading-tight" style={{ color: "var(--color-text-primary)" }}>
            Analyse & Inzichten
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--color-text-tertiary)" }}>
            AI-gedreven analyses op basis van Meta Ads & Shopify data
          </p>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-6 space-y-8 max-w-4xl w-full">

        {/* Status banner */}
        <StatusBanner
          isLive={data?.isLive ?? false}
          onRefresh={load}
          loading={loading}
        />

        {/* Summary */}
        {loading ? (
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[72px] rounded-[12px] animate-pulse" style={{ background: "var(--color-card)" }} />
            ))}
          </div>
        ) : (
          <SummaryBar insights={data?.insights ?? []} />
        )}

        {/* Belangrijkste Inzichten */}
        <section>
          <SectionHeader
            icon={<TrendingUp size={17} />}
            title="Belangrijkste Inzichten"
            count={data?.insights.length}
            subtitle="Gesorteerd op prioriteit — klik op een kaart voor de volledige uitleg"
          />
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedInsights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          )}
        </section>

        {/* Aanbevelingen */}
        <section>
          <SectionHeader
            icon={<Zap size={17} />}
            title="Aanbevelingen"
            count={data?.recommendations.length}
            subtitle="Concrete actiepunten gesorteerd op impact"
          />
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedRecs.map((rec) => (
                <RecommendationCard key={rec.id} rec={rec} />
              ))}
            </div>
          )}
        </section>

        {/* Waar moet je op letten */}
        <section>
          <SectionHeader
            icon={<AlertTriangle size={17} />}
            title="Waar moet je op letten?"
            count={data?.watchItems.length}
            subtitle="Trends, risico's en aandachtspunten"
          />
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="space-y-3">
              {data?.watchItems.map((item) => (
                <WatchItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

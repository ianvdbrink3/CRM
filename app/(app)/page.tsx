"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  TrendingUp,
  ShoppingBag,
  Megaphone,
  BarChart2,
  Target,
  Wallet,
  CheckSquare,
  ChevronRight,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { DailyMetrics, FinanceSummary, Task, ProductRollup, Campaign } from "@/lib/supabase/types";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { MetricCard, StatusPill, SkeletonCard, SkeletonRow, EmptyState } from "@/components/ui";
import { useRealtime } from "@/hooks/useRealtime";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StandupEntry {
  gisteren: string;
  vandaag: string;
  blokkades: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayKey() {
  return `nucleus-standup-${new Date().toISOString().slice(0, 10)}`;
}

function pctChange(current: number | null, previous: number | null): number | null {
  if (!previous || !current) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

function priorityOrder(p: string | null) {
  if (p === "p1") return 0;
  if (p === "p2") return 1;
  if (p === "p3") return 2;
  return 3;
}

function assigneeInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

function isOverdueOrToday(deadline: string | null): boolean {
  if (!deadline) return false;
  const today = new Date().toISOString().slice(0, 10);
  return deadline <= today;
}

function platformBadgeStyle(platform: string): { bg: string; color: string } {
  const p = platform.toLowerCase();
  if (p === "meta" || p === "facebook")
    return { bg: "color-mix(in srgb, #1877F2 15%, transparent)", color: "#1877F2" };
  if (p === "tiktok")
    return { bg: "color-mix(in srgb, #000000 10%, transparent)", color: "var(--color-text-primary)" };
  if (p === "google")
    return { bg: "color-mix(in srgb, #34A853 15%, transparent)", color: "#34A853" };
  return {
    bg: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
    color: "var(--color-accent)",
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2
        className="text-[20px] font-semibold"
        style={{ color: "var(--color-text-primary)" }}
      >
        {title}
      </h2>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: "var(--color-accent)" }}
        >
          Alles zien
          <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

function PriorityPill({ priority }: { priority: string | null }) {
  const p = priority?.toLowerCase();
  const styles: Record<string, { bg: string; color: string }> = {
    p1: { bg: "color-mix(in srgb, var(--color-danger) 12%, transparent)", color: "var(--color-danger)" },
    p2: { bg: "color-mix(in srgb, var(--color-warning) 12%, transparent)", color: "var(--color-warning)" },
    p3: { bg: "color-mix(in srgb, var(--color-text-tertiary) 12%, transparent)", color: "var(--color-text-secondary)" },
  };
  const style = styles[p ?? ""] ?? styles.p3;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide"
      style={style}
    >
      {priority ?? "—"}
    </span>
  );
}

function WinningScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span style={{ color: "var(--color-text-tertiary)" }}>—</span>;
  const style =
    score >= 8
      ? { bg: "color-mix(in srgb, var(--color-success) 12%, transparent)", color: "var(--color-success)" }
      : score >= 6.5
      ? { bg: "color-mix(in srgb, var(--color-warning) 12%, transparent)", color: "var(--color-warning)" }
      : { bg: "color-mix(in srgb, var(--color-danger) 12%, transparent)", color: "var(--color-danger)" };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums"
      style={style}
    >
      {formatNumber(score)}
    </span>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  // ── KPI state ──
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [todayMetrics, setTodayMetrics] = useState<DailyMetrics | null>(null);
  const [yesterdayMetrics, setYesterdayMetrics] = useState<DailyMetrics | null>(null);
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary | null>(null);

  // ── Tasks state ──
  const [tasksLoading, setTasksLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);

  // ── Products state ──
  const [productsLoading, setProductsLoading] = useState(true);
  const [products, setProducts] = useState<ProductRollup[]>([]);

  // ── Campaigns state ──
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  // ── Standup state ──
  const [standup, setStandup] = useState<StandupEntry>({
    gisteren: "",
    vandaag: "",
    blokkades: "",
  });
  const [standupSaved, setStandupSaved] = useState(false);

  // ─── Data fetchers ─────────────────────────────────────────────────────────

  const fetchMetrics = useCallback(async () => {
    setMetricsLoading(true);
    const supabase = createClient();
    const [{ data: metrics }, { data: finance }] = await Promise.all([
      supabase
        .from("nucleus_daily_metrics")
        .select("*")
        .order("date", { ascending: false })
        .limit(2),
      supabase.from("nucleus_finance_summary").select("*").limit(1),
    ]);
    if (metrics && metrics.length > 0) setTodayMetrics(metrics[0]);
    if (metrics && metrics.length > 1) setYesterdayMetrics(metrics[1]);
    if (finance && finance.length > 0) setFinanceSummary(finance[0]);
    setMetricsLoading(false);
  }, []);

  const fetchTasks = useCallback(async () => {
    setTasksLoading(true);
    const supabase = createClient();
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("nucleus_tasks")
      .select("*")
      .neq("status", "klaar")
      .lte("deadline", today)
      .order("deadline", { ascending: true });
    if (data) {
      const rows = data as Task[];
      const sorted = [...rows].sort(
        (a, b) => priorityOrder(a.priority) - priorityOrder(b.priority)
      );
      setTasks(sorted);
    }
    setTasksLoading(false);
  }, []);

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("nucleus_product_rollups")
      .select("*")
      .in("status", ["testing", "scaling", "winner"])
      .order("winning_score", { ascending: false })
      .limit(5);
    if (data) setProducts(data);
    setProductsLoading(false);
  }, []);

  const fetchCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("nucleus_campaigns")
      .select("*")
      .in("status", ["active", "scaling"])
      .order("roas", { ascending: false })
      .limit(5);
    if (data) setCampaigns(data);
    setCampaignsLoading(false);
  }, []);

  // ─── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetchMetrics();
    fetchTasks();
    fetchProducts();
    fetchCampaigns();
  }, [fetchMetrics, fetchTasks, fetchProducts, fetchCampaigns]);

  // ─── Realtime subscriptions ────────────────────────────────────────────────

  useRealtime("nucleus_daily_metrics", fetchMetrics);
  useRealtime("nucleus_finance_summary", fetchMetrics);
  useRealtime("nucleus_tasks", fetchTasks);
  useRealtime("nucleus_product_rollups", fetchProducts);
  useRealtime("nucleus_campaigns", fetchCampaigns);

  // ─── Standup persistence ───────────────────────────────────────────────────

  useEffect(() => {
    try {
      const saved = localStorage.getItem(todayKey());
      if (saved) setStandup(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  const saveStandup = () => {
    try {
      localStorage.setItem(todayKey(), JSON.stringify(standup));
      setStandupSaved(true);
      setTimeout(() => setStandupSaved(false), 2000);
    } catch {
      // ignore
    }
  };

  // ─── Task toggle ───────────────────────────────────────────────────────────

  const toggleTask = async (taskId: string) => {
    setTogglingTaskId(taskId);
    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    await sb.from("nucleus_tasks").update({ status: "klaar" }).eq("id", taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setTogglingTaskId(null);
  };

  // ─── KPI derived values ────────────────────────────────────────────────────

  const revTrend = pctChange(todayMetrics?.revenue ?? null, yesterdayMetrics?.revenue ?? null);
  const breakEvenRoas = todayMetrics?.break_even_roas ?? financeSummary?.avg_break_even_roas ?? null;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 md:px-8 py-4 md:py-6 max-w-[1600px] mx-auto space-y-6 md:space-y-10">

      {/* ── Page header ── */}
      <div>
        <h1
          className="text-[22px] md:text-[28px] font-bold leading-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          Command Center
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          {formatDate(new Date())} — overzicht van vandaag
        </p>
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* 1. KPI ROW                                                   */}
      {/* ════════════════════════════════════════════════════════════ */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {metricsLoading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <MetricCard
                title="Omzet"
                value={formatCurrency(todayMetrics?.revenue ?? 0)}
                subtitle="vandaag"
                trend={
                  revTrend != null
                    ? { value: revTrend, label: "vs gisteren" }
                    : undefined
                }
                icon={<TrendingUp size={16} />}
              />
              <MetricCard
                title="Nettowinst"
                value={formatCurrency(todayMetrics?.net_profit ?? 0)}
                subtitle="vandaag"
                icon={<Wallet size={16} />}
              />
              <MetricCard
                title="Ad Spend"
                value={formatCurrency(todayMetrics?.total_ad_spend ?? 0)}
                subtitle="vandaag"
                icon={<Megaphone size={16} />}
              />
              <MetricCard
                title="MER"
                value={
                  todayMetrics?.mer != null
                    ? formatNumber(todayMetrics.mer) + "x"
                    : "—"
                }
                subtitle="marketing efficiency"
                icon={<BarChart2 size={16} />}
              />
              <MetricCard
                title="Break-even ROAS"
                value={
                  breakEvenRoas != null
                    ? formatNumber(breakEvenRoas) + "x"
                    : "—"
                }
                subtitle="minimum"
                icon={<Target size={16} />}
              />
              <MetricCard
                title="Cash-positie"
                value={formatCurrency(financeSummary?.cash_position ?? 0)}
                subtitle="totaal"
                icon={<ShoppingBag size={16} />}
              />
            </>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* LOWER GRID: Tasks + Standup (left) | Products + Campaigns   */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-8">

          {/* ── 2. DAGELIJKSE PRIORITEITEN ── */}
          <section>
            <SectionHeader title="Dagelijkse prioriteiten" />

            <div
              className="rounded-[16px] border overflow-x-auto"
              style={{
                background: "var(--color-card)",
                borderColor: "var(--color-border)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {tasksLoading ? (
                <table className="w-full min-w-[480px]">
                  <tbody>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <SkeletonRow key={i} cells={4} widths={["w-12", "w-48", "w-16", "w-8"]} />
                    ))}
                  </tbody>
                </table>
              ) : tasks.length === 0 ? (
                <EmptyState
                  icon={<CheckSquare size={24} />}
                  title="Geen openstaande prioriteiten"
                  description="Alle taken voor vandaag zijn afgerond of hebben geen deadline vandaag."
                />
              ) : (
                <ul className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                  {tasks.map((task) => (
                    <motion.li
                      key={task.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }}
                      transition={{ duration: 0.2 }}
                      className="flex items-center gap-3 px-5 py-3.5"
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleTask(task.id)}
                        disabled={togglingTaskId === task.id}
                        className="flex-shrink-0 w-5 h-5 rounded border-2 transition-colors hover:border-[var(--color-accent)] disabled:opacity-50 cursor-pointer"
                        style={{ borderColor: "var(--color-border)" }}
                        aria-label="Markeer als klaar"
                      />

                      {/* Title */}
                      <span
                        className="flex-1 text-sm font-medium truncate"
                        style={{ color: "var(--color-text-primary)" }}
                      >
                        {task.title}
                      </span>

                      {/* Priority */}
                      <PriorityPill priority={task.priority} />

                      {/* Assignee avatar */}
                      {task.assignee && (
                        <span
                          className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold"
                          style={{
                            background: "color-mix(in srgb, var(--color-accent) 15%, transparent)",
                            color: "var(--color-accent)",
                          }}
                          title={task.assignee}
                        >
                          {assigneeInitials(task.assignee)}
                        </span>
                      )}

                      {/* Deadline */}
                      {task.deadline && (
                        <span
                          className="flex-shrink-0 text-xs tabular-nums"
                          style={{
                            color: isOverdueOrToday(task.deadline)
                              ? "var(--color-danger)"
                              : "var(--color-text-tertiary)",
                          }}
                        >
                          {task.deadline}
                        </span>
                      )}
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* ── 5. STANDUP WIDGET ── */}
          <section>
            <SectionHeader title="Dagelijkse standup" />

            <div
              className="rounded-[16px] border p-5 space-y-4"
              style={{
                background: "var(--color-card)",
                borderColor: "var(--color-border)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {(
                [
                  { key: "gisteren", label: "Gisteren deed ik…" },
                  { key: "vandaag", label: "Vandaag doe ik…" },
                  { key: "blokkades", label: "Blokkades" },
                ] as { key: keyof StandupEntry; label: string }[]
              ).map(({ key, label }) => (
                <div key={key}>
                  <label
                    className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    {label}
                  </label>
                  <textarea
                    rows={2}
                    value={standup[key]}
                    onChange={(e) =>
                      setStandup((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    placeholder={label}
                    className="w-full rounded-lg px-3 py-2 text-sm resize-none outline-none transition-colors"
                    style={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text-primary)",
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--color-accent)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "var(--color-border)";
                    }}
                  />
                </div>
              ))}

              <div className="flex items-center justify-between pt-1">
                <span
                  className="text-xs"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  Opgeslagen lokaal per dag
                </span>
                <button
                  onClick={saveStandup}
                  className="px-4 py-1.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                  style={{
                    background: standupSaved
                      ? "color-mix(in srgb, var(--color-success) 15%, transparent)"
                      : "var(--color-accent)",
                    color: standupSaved ? "var(--color-success)" : "#fff",
                  }}
                >
                  {standupSaved ? "Opgeslagen ✓" : "Opslaan"}
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-8">

          {/* ── 3. PRODUCTEN IN TESTING ── */}
          <section>
            <SectionHeader title="Producten in testing" href="/products" />

            <div
              className="rounded-[16px] border overflow-x-auto"
              style={{
                background: "var(--color-card)",
                borderColor: "var(--color-border)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {productsLoading ? (
                <table className="w-full min-w-[480px]">
                  <tbody>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <SkeletonRow key={i} cells={4} widths={["w-40", "w-16", "w-16", "w-16"]} />
                    ))}
                  </tbody>
                </table>
              ) : products.length === 0 ? (
                <EmptyState
                  icon={<ShoppingBag size={24} />}
                  title="Geen producten in testing"
                  description="Voeg producten toe met status testing, scaling of winner."
                />
              ) : (
                <table className="w-full min-w-[480px]">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                      {["Product", "Score", "Status", "Marge", "ROAS"].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                          style={{ color: "var(--color-text-tertiary)" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product, idx) => (
                      <motion.tr
                        key={product.id ?? idx}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.05 }}
                        className="border-b last:border-0 hover:bg-[color-mix(in_srgb,var(--color-accent)_4%,transparent)] transition-colors"
                        style={{ borderColor: "var(--color-border)" }}
                      >
                        <td className="px-4 py-3">
                          {product.id ? (
                            <Link
                              href={`/products/${product.id}`}
                              className="text-sm font-medium hover:underline truncate block"
                              style={{ color: "var(--color-text-primary)" }}
                            >
                              {product.name ?? "—"}
                            </Link>
                          ) : (
                            <span
                              className="text-sm font-medium truncate block"
                              style={{ color: "var(--color-text-primary)" }}
                            >
                              {product.name ?? "—"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <WinningScoreBadge score={product.winning_score ?? null} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill status={product.status ?? "neutral"} />
                        </td>
                        <td
                          className="px-4 py-3 text-sm tabular-nums"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          {product.margin_pct != null
                            ? formatNumber(product.margin_pct) + "%"
                            : "—"}
                        </td>
                        <td
                          className="px-4 py-3 text-sm tabular-nums"
                          style={{ color: "var(--color-text-secondary)" }}
                        >
                          {product.product_roas != null
                            ? formatNumber(product.product_roas) + "x"
                            : "—"}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* ── 4. LOPENDE CAMPAGNES ── */}
          <section>
            <SectionHeader title="Lopende campagnes" href="/campaigns" />

            <div
              className="rounded-[16px] border overflow-x-auto"
              style={{
                background: "var(--color-card)",
                borderColor: "var(--color-border)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              {campaignsLoading ? (
                <table className="w-full min-w-[480px]">
                  <tbody>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <SkeletonRow key={i} cells={5} widths={["w-40", "w-16", "w-16", "w-16", "w-12"]} />
                    ))}
                  </tbody>
                </table>
              ) : campaigns.length === 0 ? (
                <EmptyState
                  icon={<Megaphone size={24} />}
                  title="Geen actieve campagnes"
                  description="Maak campagnes aan met status actief of scaling."
                />
              ) : (
                <table className="w-full min-w-[480px]">
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                      {["Campagne", "Platform", "Status", "Spend", "ROAS"].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide"
                          style={{ color: "var(--color-text-tertiary)" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.map((campaign, idx) => {
                      const roas = campaign.roas ?? 0;
                      const roasGood =
                        breakEvenRoas != null
                          ? roas >= breakEvenRoas
                          : roas >= 2;
                      const platformStyle = platformBadgeStyle(campaign.platform);
                      return (
                        <motion.tr
                          key={campaign.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className="border-b last:border-0 hover:bg-[color-mix(in_srgb,var(--color-accent)_4%,transparent)] transition-colors"
                          style={{ borderColor: "var(--color-border)" }}
                        >
                          <td className="px-4 py-3">
                            <Link
                              href="/campaigns"
                              className="text-sm font-medium hover:underline truncate block"
                              style={{ color: "var(--color-text-primary)" }}
                            >
                              {campaign.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize"
                              style={platformStyle}
                            >
                              {campaign.platform}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <StatusPill status={campaign.status} />
                          </td>
                          <td
                            className="px-4 py-3 text-sm tabular-nums"
                            style={{ color: "var(--color-text-secondary)" }}
                          >
                            {campaign.ad_spend != null
                              ? formatCurrency(campaign.ad_spend)
                              : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className="text-sm font-semibold tabular-nums"
                              style={{
                                color: roasGood
                                  ? "var(--color-success)"
                                  : "var(--color-danger)",
                              }}
                            >
                              {roas > 0 ? formatNumber(roas) + "x" : "—"}
                            </span>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

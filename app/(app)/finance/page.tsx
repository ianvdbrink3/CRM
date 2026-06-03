"use client";

export const dynamic = "force-dynamic";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  ExternalLink,
  TrendingUp,
  DollarSign,
  BarChart2,
  Layers,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import {
  ComposedChart,
  Line,
  Bar,
  AreaChart,
  Area,
  LineChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";

import { createClient } from "@/lib/supabase/client";
import type {
  DailyMetrics,
  Expense,
  SoftwareCost,
  SupplierPayment,
  Supplier,
  Product,
  FinanceSummary,
} from "@/lib/supabase/types";
import { formatCurrency, formatNumber, formatDate } from "@/lib/utils";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { MetricCard } from "@/components/ui/MetricCard";
import { DataTable } from "@/components/ui/DataTable";
import type { Column } from "@/components/ui/DataTable";
import { StatusPill } from "@/components/ui/StatusPill";
import { SlideOver } from "@/components/ui/SlideOver";
import { useRealtime } from "@/hooks/useRealtime";

// ─── Native date helpers ──────────────────────────────────────────────────────

function parseISO(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00");
}

function subDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

function isWithinInterval(
  date: Date,
  interval: { start: Date; end: Date }
): boolean {
  return date >= interval.start && date <= interval.end;
}

function formatDDMM(date: Date): string {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

function formatYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const NL_MONTHS = [
  "jan",
  "feb",
  "mrt",
  "apr",
  "mei",
  "jun",
  "jul",
  "aug",
  "sep",
  "okt",
  "nov",
  "dec",
];

function formatDDMonYYYY(date: Date): string {
  return `${date.getDate()} ${NL_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "overzicht" | "dagelijks" | "uitgaven" | "software" | "inkoop";
type DateRange = "7d" | "30d" | "90d" | "custom";

interface SupplierPaymentRow extends SupplierPayment {
  supplier_name?: string | null;
  product_name?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: "overzicht", label: "Overzicht" },
  { id: "dagelijks", label: "Dagelijkse Metrics" },
  { id: "uitgaven", label: "Uitgaven" },
  { id: "software", label: "Software" },
  { id: "inkoop", label: "Inkoop" },
];

const inputClass =
  "w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors";
const inputStyle = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  color: "var(--color-text-primary)",
};

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        {label}{" "}
        {required && (
          <span style={{ color: "var(--color-danger)" }}>*</span>
        )}
      </label>
      {children}
    </div>
  );
}

function StyledInput(
  props: React.InputHTMLAttributes<HTMLInputElement>
) {
  return (
    <input
      {...props}
      className={inputClass}
      style={inputStyle}
      onFocus={(e) => {
        (e.currentTarget as HTMLInputElement).style.borderColor =
          "var(--color-accent)";
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        (e.currentTarget as HTMLInputElement).style.borderColor =
          "var(--color-border)";
        props.onBlur?.(e);
      }}
    />
  );
}

function StyledSelect(
  props: React.SelectHTMLAttributes<HTMLSelectElement>
) {
  return (
    <select
      {...props}
      className={inputClass}
      style={inputStyle}
    />
  );
}

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2
        className="text-base font-semibold"
        style={{ color: "var(--color-text-primary)" }}
      >
        {title}
      </h2>
      {action}
    </div>
  );
}

const CustomTooltipBox = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-3 py-2 rounded-xl text-xs space-y-1"
      style={{
        background: "rgba(20,20,30,0.85)",
        backdropFilter: "blur(8px)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      }}
    >
      {label && (
        <p
          className="font-semibold mb-1"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {label}
        </p>
      )}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: entry.color }}
          />
          <span style={{ color: "var(--color-text-secondary)" }}>
            {entry.name}:
          </span>
          <span
            className="font-semibold tabular-nums"
            style={{ color: "var(--color-text-primary)" }}
          >
            {typeof entry.value === "number"
              ? entry.value > 100
                ? formatCurrency(entry.value)
                : formatNumber(entry.value)
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

function AddButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
      style={{ background: "var(--color-accent)", color: "#fff" }}
    >
      <Plus size={14} />
      {label}
    </button>
  );
}

function TotalRow({
  label,
  value,
  cols,
}: {
  label: string;
  value: string;
  cols: number;
}) {
  return (
    <tr
      style={{
        background:
          "color-mix(in srgb, var(--color-accent) 5%, transparent)",
        borderTop: "1px solid var(--color-border)",
      }}
    >
      <td
        className="px-4 py-3 text-sm font-semibold"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {label}
      </td>
      {Array.from({ length: cols - 2 }).map((_, i) => (
        <td key={i} />
      ))}
      <td
        className="px-4 py-3 text-right text-sm font-bold tabular-nums"
        style={{ color: "var(--color-text-primary)" }}
      >
        {value}
      </td>
    </tr>
  );
}

// ─── Date range helper ────────────────────────────────────────────────────────

function getDateRange(range: DateRange, customFrom?: string, customTo?: string) {
  const today = new Date();
  const toDate = today;
  let fromDate: Date;
  if (range === "7d") fromDate = subDays(today, 6);
  else if (range === "30d") fromDate = subDays(today, 29);
  else if (range === "90d") fromDate = subDays(today, 89);
  else {
    fromDate = customFrom ? parseISO(customFrom) : subDays(today, 29);
    return {
      from: fromDate,
      to: customTo ? parseISO(customTo) : toDate,
    };
  }
  return { from: fromDate, to: toDate };
}

// ─── Tab 1: Overzicht ─────────────────────────────────────────────────────────

function OverzichtTab({
  metrics,
  summary,
  loading,
}: {
  metrics: DailyMetrics[];
  summary: FinanceSummary | null;
  loading: boolean;
}) {
  const [range, setRange] = useState<DateRange>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const { from, to } = getDateRange(range, customFrom, customTo);

  const filtered = metrics.filter((m) => {
    try {
      const d = parseISO(m.date);
      return isWithinInterval(d, { start: from, end: to });
    } catch {
      return false;
    }
  });

  const sorted = [...filtered].sort(
    (a, b) => a.date.localeCompare(b.date)
  );

  const chartData = sorted.map((m) => ({
    date: formatDDMM(parseISO(m.date)),
    omzet: m.revenue ?? null,
    adSpend: m.total_ad_spend ?? null,
    nettowinst: m.net_profit ?? null,
    mer: m.mer ?? null,
  }));

  const totalRevenue = sorted.reduce(
    (s, m) => s + (m.revenue ?? 0),
    0
  );
  const totalNetProfit = sorted.reduce(
    (s, m) => s + (m.net_profit ?? 0),
    0
  );
  const totalAdSpend = sorted.reduce(
    (s, m) => s + (m.total_ad_spend ?? 0),
    0
  );
  const avgMer =
    sorted.filter((m) => m.mer != null).length > 0
      ? sorted.reduce((s, m) => s + (m.mer ?? 0), 0) /
        sorted.filter((m) => m.mer != null).length
      : null;
  const avgBreakEvenRoas =
    sorted.filter((m) => m.break_even_roas != null).length > 0
      ? sorted.reduce((s, m) => s + (m.break_even_roas ?? 0), 0) /
        sorted.filter((m) => m.break_even_roas != null).length
      : null;

  // Ad spend split — sum for period
  const metaSpend = sorted.reduce(
    (s, m) => s + (m.ad_spend_meta ?? 0),
    0
  );
  const tiktokSpend = sorted.reduce(
    (s, m) => s + (m.ad_spend_tiktok ?? 0),
    0
  );
  const googleSpend = sorted.reduce(
    (s, m) => s + (m.ad_spend_google ?? 0),
    0
  );
  const totalPieSpend = metaSpend + tiktokSpend + googleSpend;

  const pieData =
    totalPieSpend > 0
      ? [
          {
            name: "Meta",
            value: metaSpend,
            color: "#0082FB",
          },
          {
            name: "TikTok",
            value: tiktokSpend,
            color: "#555",
          },
          {
            name: "Google",
            value: googleSpend,
            color: "#EA4335",
          },
        ].filter((p) => p.value > 0)
      : [];

  const gridStroke = "rgba(255,255,255,0.06)";
  const axisStyle = {
    fill: "var(--color-text-tertiary)",
    fontSize: 11,
  };

  const RANGE_BUTTONS: { id: DateRange; label: string }[] = [
    { id: "7d", label: "7 dagen" },
    { id: "30d", label: "30 dagen" },
    { id: "90d", label: "90 dagen" },
    { id: "custom", label: "Aangepast" },
  ];

  return (
    <div className="space-y-6">
      {/* Date range selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {RANGE_BUTTONS.map((btn) => (
          <button
            key={btn.id}
            onClick={() => setRange(btn.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background:
                range === btn.id
                  ? "var(--color-accent)"
                  : "var(--color-card)",
              color:
                range === btn.id ? "#fff" : "var(--color-text-secondary)",
              border:
                range === btn.id
                  ? "1px solid var(--color-accent)"
                  : "1px solid var(--color-border)",
            }}
          >
            {btn.label}
          </button>
        ))}
        {range === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-lg px-2 py-1 text-xs outline-none"
              style={inputStyle}
            />
            <span
              className="text-xs"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              t/m
            </span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-lg px-2 py-1 text-xs outline-none"
              style={inputStyle}
            />
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <MetricCard
          title="Totale Omzet"
          value={formatCurrency(totalRevenue)}
          subtitle={`${sorted.length} dagen`}
          loading={loading}
          icon={<TrendingUp size={16} />}
        />
        <MetricCard
          title="Nettowinst"
          value={formatCurrency(totalNetProfit)}
          loading={loading}
          icon={<DollarSign size={16} />}
        />
        <MetricCard
          title="Ad Spend"
          value={formatCurrency(totalAdSpend)}
          loading={loading}
          icon={<BarChart2 size={16} />}
        />
        <MetricCard
          title="Gemiddelde MER"
          value={avgMer != null ? formatNumber(avgMer) : "—"}
          loading={loading}
          icon={<Layers size={16} />}
        />
        <MetricCard
          title="Break-even ROAS"
          value={
            avgBreakEvenRoas != null
              ? `${formatNumber(avgBreakEvenRoas)}x`
              : "—"
          }
          loading={loading}
          icon={<ShoppingCart size={16} />}
        />
        <MetricCard
          title="Cash-positie"
          value={
            summary?.cash_position != null
              ? formatCurrency(summary.cash_position)
              : "—"
          }
          loading={loading}
          icon={<Wallet size={16} />}
        />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Omzet vs Ad Spend */}
        <div
          className="rounded-[16px] border p-5"
          style={{
            background: "var(--color-card)",
            borderColor: "var(--color-border)",
          }}
        >
          <h3
            className="text-sm font-semibold mb-4"
            style={{ color: "var(--color-text-primary)" }}
          >
            Omzet vs Ad Spend
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart
              data={chartData}
              margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient
                  id="colorOmzet"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#5B6CFF" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#5B6CFF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={gridStroke}
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `€${v}`}
                width={48}
              />
              <Tooltip content={<CustomTooltipBox />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
              <Bar
                dataKey="adSpend"
                name="Ad Spend"
                fill="rgba(255,255,255,0.08)"
                radius={[3, 3, 0, 0]}
              />
              <Line
                type="monotone"
                dataKey="omzet"
                name="Omzet"
                stroke="#5B6CFF"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Nettowinst trend */}
        <div
          className="rounded-[16px] border p-5"
          style={{
            background: "var(--color-card)",
            borderColor: "var(--color-border)",
          }}
        >
          <h3
            className="text-sm font-semibold mb-4"
            style={{ color: "var(--color-text-primary)" }}
          >
            Nettowinst trend
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={chartData}
              margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient
                  id="profitGradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={
                      totalNetProfit >= 0 ? "#34C759" : "#FF453A"
                    }
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="100%"
                    stopColor={
                      totalNetProfit >= 0 ? "#34C759" : "#FF453A"
                    }
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={gridStroke}
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `€${v}`}
                width={48}
              />
              <Tooltip content={<CustomTooltipBox />} />
              <ReferenceLine
                y={0}
                stroke="rgba(255,255,255,0.15)"
                strokeDasharray="4 4"
              />
              <Area
                type="monotone"
                dataKey="nettowinst"
                name="Nettowinst"
                stroke={totalNetProfit >= 0 ? "#34C759" : "#FF453A"}
                strokeWidth={2}
                fill="url(#profitGradient)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* MER trend */}
        <div
          className="rounded-[16px] border p-5"
          style={{
            background: "var(--color-card)",
            borderColor: "var(--color-border)",
          }}
        >
          <h3
            className="text-sm font-semibold mb-4"
            style={{ color: "var(--color-text-primary)" }}
          >
            MER trend
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart
              data={chartData}
              margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={gridStroke}
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={axisStyle}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip content={<CustomTooltipBox />} />
              <ReferenceLine
                y={1}
                label={{
                  value: "Break-even",
                  fill: "var(--color-text-tertiary)",
                  fontSize: 10,
                  position: "right",
                }}
                stroke="rgba(255,255,255,0.25)"
                strokeDasharray="5 3"
              />
              <Line
                type="monotone"
                dataKey="mer"
                name="MER"
                stroke="#5B6CFF"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Ad Spend Donut */}
        <div
          className="rounded-[16px] border p-5"
          style={{
            background: "var(--color-card)",
            borderColor: "var(--color-border)",
          }}
        >
          <h3
            className="text-sm font-semibold mb-4"
            style={{ color: "var(--color-text-primary)" }}
          >
            Ad Spend verdeling
          </h3>
          {pieData.length === 0 ? (
            <div
              className="flex items-center justify-center h-[220px] text-sm"
              style={{ color: "var(--color-text-tertiary)" }}
            >
              Geen ad spend data in deze periode
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    background: "rgba(20,20,30,0.9)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    color: "var(--color-text-primary)",
                    fontSize: 12,
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab 2: Dagelijkse Metrics ────────────────────────────────────────────────

function DagelijkseMetricsTab() {
  const [metrics, setMetrics] = useState<DailyMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDate, setAddDate] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<{
    id: string;
    field: string;
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const editRef = useRef<HTMLInputElement>(null);
  const today = format(new Date(), "yyyy-MM-dd");

  const supabase = createClient();

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("nucleus_daily_metrics")
      .select("*")
      .order("date", { ascending: false });
    if (data) setMetrics(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useRealtime("nucleus_daily_metrics", fetchMetrics);

  const startEdit = (id: string, field: string, value: unknown) => {
    setEditingCell({ id, field });
    setEditValue(value != null ? String(value) : "");
    setTimeout(() => editRef.current?.focus(), 40);
  };

  const saveEdit = async () => {
    if (!editingCell) return;
    const { id, field } = editingCell;
    const parsed =
      editValue.trim() === "" ? null : parseFloat(editValue);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("nucleus_daily_metrics")
      .update({ [field]: parsed })
      .eq("id", id);
    setEditingCell(null);
    fetchMetrics();
  };

  const addDay = async () => {
    if (!addDate) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("nucleus_daily_metrics")
      .insert({ date: addDate });
    setAddOpen(false);
    setAddDate("");
    fetchMetrics();
  };

  // Sort: today pinned first
  const sorted = [...metrics].sort((a, b) => {
    if (a.date === today) return -1;
    if (b.date === today) return 1;
    return b.date.localeCompare(a.date);
  });

  const EDITABLE_FIELDS: {
    key: keyof DailyMetrics;
    label: string;
    currency?: boolean;
  }[] = [
    { key: "revenue", label: "Omzet", currency: true },
    { key: "orders", label: "Bestellingen" },
    { key: "sessions", label: "Sessies" },
    { key: "ad_spend_meta", label: "Meta Spend", currency: true },
    { key: "ad_spend_tiktok", label: "TikTok Spend", currency: true },
    { key: "ad_spend_google", label: "Google Spend", currency: true },
    { key: "cogs", label: "COGS", currency: true },
  ];

  const COMPUTED_FIELDS: {
    key: keyof DailyMetrics;
    label: string;
    currency?: boolean;
    pct?: boolean;
  }[] = [
    { key: "total_ad_spend", label: "Totaal Spend", currency: true },
    { key: "aov", label: "AOV", currency: true },
    { key: "cvr", label: "CVR", pct: true },
    { key: "mer", label: "MER" },
    { key: "gross_profit", label: "Brutomarge", currency: true },
    { key: "net_profit", label: "Nettowinst", currency: true },
    { key: "profit_margin", label: "Winstmarge%", pct: true },
  ];

  function renderEditableCell(row: DailyMetrics, field: keyof DailyMetrics, currency?: boolean) {
    const isEditing =
      editingCell?.id === row.id && editingCell?.field === field;
    const val = row[field];

    if (isEditing) {
      return (
        <input
          ref={editRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit();
            if (e.key === "Escape") setEditingCell(null);
          }}
          className="w-24 rounded px-1.5 py-0.5 text-right text-xs tabular-nums outline-none"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-accent)",
            color: "var(--color-text-primary)",
          }}
          type="number"
          step="0.01"
        />
      );
    }

    return (
      <span
        onClick={() => startEdit(row.id, String(field), val)}
        className="cursor-text px-1.5 py-0.5 rounded text-xs tabular-nums hover:bg-white/5 transition-colors"
        style={{ color: "var(--color-text-primary)" }}
      >
        {val != null
          ? currency
            ? formatCurrency(Number(val))
            : formatNumber(Number(val))
          : <span style={{ color: "var(--color-text-tertiary)" }}>—</span>}
      </span>
    );
  }

  function renderComputedCell(
    row: DailyMetrics,
    field: keyof DailyMetrics,
    opts: { currency?: boolean; pct?: boolean }
  ) {
    const val = row[field];
    if (val == null)
      return (
        <span
          className="text-xs tabular-nums"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          —
        </span>
      );
    let display = "";
    if (opts.pct) display = `${formatNumber(Number(val))}%`;
    else if (opts.currency) display = formatCurrency(Number(val));
    else display = formatNumber(Number(val));

    const isProfit =
      field === "net_profit" || field === "profit_margin" || field === "gross_profit";
    const color = isProfit
      ? Number(val) >= 0
        ? "var(--color-success)"
        : "var(--color-danger)"
      : "var(--color-text-secondary)";

    return (
      <span
        className="text-xs tabular-nums font-medium"
        style={{ color }}
      >
        {display}
      </span>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Dagelijkse Metrics"
        action={
          <AddButton
            onClick={() => setAddOpen(true)}
            label="Dag toevoegen"
          />
        }
      />

      {/* Inline add date modal */}
      <AnimatePresence>
        {addOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center gap-3 p-3 rounded-xl border"
            style={{
              background: "var(--color-card)",
              borderColor: "var(--color-border)",
            }}
          >
            <span
              className="text-sm font-medium"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Datum:
            </span>
            <input
              type="date"
              value={addDate}
              onChange={(e) => setAddDate(e.target.value)}
              className="rounded-lg px-3 py-1.5 text-sm outline-none"
              style={inputStyle}
            />
            <button
              onClick={addDay}
              disabled={!addDate}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{ background: "var(--color-accent)", color: "#fff" }}
            >
              Toevoegen
            </button>
            <button
              onClick={() => setAddOpen(false)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{
                border: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)",
              }}
            >
              Annuleren
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable table */}
      <div
        className="rounded-[16px] border overflow-x-auto"
        style={{
          background: "var(--color-card)",
          borderColor: "var(--color-border)",
        }}
      >
        <table className="w-full min-w-max border-collapse text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
              <th
                className="px-4 py-3 text-left text-xs font-semibold whitespace-nowrap sticky left-0 z-10"
                style={{
                  color: "var(--color-text-secondary)",
                  background: "var(--color-card)",
                }}
              >
                Datum
              </th>
              {EDITABLE_FIELDS.map((f) => (
                <th
                  key={String(f.key)}
                  className="px-3 py-3 text-right text-xs font-semibold whitespace-nowrap"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {f.label}
                </th>
              ))}
              <th
                className="px-3 py-3 text-center text-xs"
                style={{ color: "var(--color-border)" }}
              >
                |
              </th>
              {COMPUTED_FIELDS.map((f) => (
                <th
                  key={String(f.key)}
                  className="px-3 py-3 text-right text-xs font-semibold whitespace-nowrap"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  {f.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({
                    length: EDITABLE_FIELDS.length + COMPUTED_FIELDS.length + 2,
                  }).map((_, j) => (
                    <td key={j} className="px-3 py-3">
                      <div
                        className="h-3 rounded-full animate-pulse"
                        style={{
                          background: "var(--color-border)",
                          width: "60%",
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={
                    EDITABLE_FIELDS.length + COMPUTED_FIELDS.length + 2
                  }
                  className="px-4 py-12 text-center text-sm"
                  style={{ color: "var(--color-text-tertiary)" }}
                >
                  Geen data gevonden. Voeg een dag toe om te starten.
                </td>
              </tr>
            ) : (
              sorted.map((row, idx) => {
                const isToday = row.date === today;
                return (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom:
                        idx < sorted.length - 1
                          ? "1px solid var(--color-border)"
                          : "none",
                      background: isToday
                        ? "color-mix(in srgb, var(--color-accent) 8%, transparent)"
                        : idx % 2 === 1
                        ? "color-mix(in srgb, var(--color-border) 20%, transparent)"
                        : "transparent",
                    }}
                  >
                    {/* Datum */}
                    <td
                      className="px-4 py-3 text-xs font-semibold whitespace-nowrap sticky left-0 z-10"
                      style={{
                        color: isToday
                          ? "var(--color-accent)"
                          : "var(--color-text-primary)",
                        background: isToday
                          ? "color-mix(in srgb, var(--color-accent) 8%, var(--color-card))"
                          : "var(--color-card)",
                      }}
                    >
                      {format(parseISO(row.date), "dd MMM yyyy", {
                        locale: nl,
                      })}
                      {isToday && (
                        <span
                          className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{
                            background:
                              "color-mix(in srgb, var(--color-accent) 20%, transparent)",
                            color: "var(--color-accent)",
                          }}
                        >
                          VANDAAG
                        </span>
                      )}
                    </td>

                    {/* Editable fields */}
                    {EDITABLE_FIELDS.map((f) => (
                      <td
                        key={String(f.key)}
                        className="px-3 py-2 text-right"
                      >
                        {renderEditableCell(row, f.key, f.currency)}
                      </td>
                    ))}

                    {/* Divider */}
                    <td
                      className="px-1 py-3 text-center text-xs"
                      style={{ color: "var(--color-border)" }}
                    >
                      |
                    </td>

                    {/* Computed fields */}
                    {COMPUTED_FIELDS.map((f) => (
                      <td
                        key={String(f.key)}
                        className="px-3 py-2 text-right"
                      >
                        {renderComputedCell(row, f.key, {
                          currency: f.currency,
                          pct: f.pct,
                        })}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Tab 3: Uitgaven ──────────────────────────────────────────────────────────

function UitgavenTab() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [form, setForm] = useState({
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
    amount: "",
    category: "",
    type: "",
    paid: false,
    vendor: "",
  });

  const supabase = createClient();

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("nucleus_expenses")
      .select("*")
      .order("date", { ascending: false });
    if (data) setExpenses(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const togglePaid = async (expense: Expense) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("nucleus_expenses")
      .update({ paid: !expense.paid })
      .eq("id", expense.id);
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === expense.id ? { ...e, paid: !e.paid } : e
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.description.trim() || !form.date || !form.amount) {
      setFormError("Omschrijving, datum en bedrag zijn verplicht.");
      return;
    }
    setSaving(true);
    setFormError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("nucleus_expenses")
      .insert({
        description: form.description.trim(),
        date: form.date,
        amount: parseFloat(form.amount),
        category: form.category || null,
        type: form.type || null,
        paid: form.paid,
        vendor: form.vendor || null,
      });
    if (error) {
      setFormError(error.message);
      setSaving(false);
      return;
    }
    setAddOpen(false);
    setForm({
      description: "",
      date: format(new Date(), "yyyy-MM-dd"),
      amount: "",
      category: "",
      type: "",
      paid: false,
      vendor: "",
    });
    fetchExpenses();
    setSaving(false);
  };

  const set = (key: string, val: unknown) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const paidTotal = expenses
    .filter((e) => e.paid)
    .reduce((s, e) => s + e.amount, 0);

  const columns: Column<Expense>[] = [
    {
      key: "date",
      header: "Datum",
      sortable: true,
      render: (row) => (
        <span
          className="text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {formatDate(row.date)}
        </span>
      ),
    },
    {
      key: "description",
      header: "Omschrijving",
      render: (row) => (
        <span
          className="text-sm font-medium"
          style={{ color: "var(--color-text-primary)" }}
        >
          {row.description}
        </span>
      ),
    },
    {
      key: "vendor",
      header: "Leverancier",
      render: (row) => (
        <span
          className="text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {row.vendor ?? "—"}
        </span>
      ),
    },
    {
      key: "category",
      header: "Categorie",
      render: (row) => (
        <span
          className="text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {row.category ?? "—"}
        </span>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (row) =>
        row.type ? (
          <StatusPill status={row.type} />
        ) : (
          <span style={{ color: "var(--color-text-tertiary)" }}>—</span>
        ),
    },
    {
      key: "amount",
      header: "Bedrag",
      sortable: true,
      align: "right",
      render: (row) => (
        <span
          className="text-sm font-semibold tabular-nums"
          style={{ color: "var(--color-text-primary)" }}
        >
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      key: "paid",
      header: "Betaald",
      align: "center",
      render: (row) => (
        <input
          type="checkbox"
          checked={row.paid ?? false}
          onChange={() => togglePaid(row)}
          className="cursor-pointer"
          style={{ accentColor: "var(--color-accent)" }}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Uitgaven"
        action={
          <AddButton onClick={() => setAddOpen(true)} label="Uitgave toevoegen" />
        }
      />

      <div>
        <DataTable
          data={expenses as unknown as Record<string, unknown>[]}
          columns={columns as unknown as Column<Record<string, unknown>>[]}
          loading={loading}
          emptyMessage="Geen uitgaven gevonden."
        />
        {/* Total row */}
        {!loading && expenses.length > 0 && (
          <div
            className="rounded-b-[16px] border-x border-b px-4 py-3 flex items-center justify-between"
            style={{
              borderColor: "var(--color-border)",
              background:
                "color-mix(in srgb, var(--color-accent) 5%, transparent)",
            }}
          >
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Totaal betaald
            </span>
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: "var(--color-text-primary)" }}
            >
              {formatCurrency(paidTotal)}
            </span>
          </div>
        )}
      </div>

      {/* Add expense SlideOver */}
      <SlideOver
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Uitgave toevoegen"
        width="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Omschrijving" required>
            <StyledInput
              type="text"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="bijv. Shopify abonnement"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Datum" required>
              <StyledInput
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
              />
            </FormField>
            <FormField label="Bedrag" required>
              <StyledInput
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                placeholder="0,00"
              />
            </FormField>
          </div>
          <FormField label="Leverancier">
            <StyledInput
              type="text"
              value={form.vendor}
              onChange={(e) => set("vendor", e.target.value)}
              placeholder="bijv. Stripe"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Categorie">
              <StyledInput
                type="text"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="bijv. Marketing"
              />
            </FormField>
            <FormField label="Type">
              <StyledInput
                type="text"
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                placeholder="bijv. actief"
              />
            </FormField>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="paid-check"
              checked={form.paid}
              onChange={(e) => set("paid", e.target.checked)}
              style={{ accentColor: "var(--color-accent)" }}
            />
            <label
              htmlFor="paid-check"
              className="text-sm cursor-pointer"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Betaald
            </label>
          </div>
          {formError && (
            <p className="text-sm" style={{ color: "var(--color-danger)" }}>
              {formError}
            </p>
          )}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: "var(--color-accent)", color: "#fff" }}
            >
              {saving ? "Opslaan…" : "Opslaan"}
            </button>
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                border: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)",
              }}
            >
              Annuleren
            </button>
          </div>
        </form>
      </SlideOver>
    </div>
  );
}

// ─── Tab 4: Software ──────────────────────────────────────────────────────────

function SoftwareTab() {
  const [software, setSoftware] = useState<SoftwareCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    tool: "",
    status: "actief",
    monthly_amount: "",
    category: "",
    billing: "",
    renewal_date: "",
    link: "",
  });

  const supabase = createClient();
  const today = new Date();

  const fetchSoftware = useCallback(async () => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from("nucleus_software_costs")
      .select("*")
      .order("tool");
    if (data) setSoftware(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSoftware();
  }, [fetchSoftware]);

  const set = (key: string, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tool.trim()) {
      setFormError("Tool naam is verplicht.");
      return;
    }
    setSaving(true);
    setFormError(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("nucleus_software_costs")
      .insert({
        tool: form.tool.trim(),
        status: form.status,
        monthly_amount: form.monthly_amount
          ? parseFloat(form.monthly_amount)
          : null,
        category: form.category || null,
        billing: form.billing || null,
        renewal_date: form.renewal_date || null,
        link: form.link || null,
      });
    if (error) {
      setFormError(error.message);
      setSaving(false);
      return;
    }
    setAddOpen(false);
    setForm({
      tool: "",
      status: "actief",
      monthly_amount: "",
      category: "",
      billing: "",
      renewal_date: "",
      link: "",
    });
    fetchSoftware();
    setSaving(false);
  };

  const isRenewalSoon = (dateStr: string | null) => {
    if (!dateStr) return false;
    try {
      const d = parseISO(dateStr);
      const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 14;
    } catch {
      return false;
    }
  };

  const totalAnnualRunRate = software.reduce(
    (s, sw) => s + (sw.annual_amount ?? 0),
    0
  );

  const columns: Column<SoftwareCost>[] = [
    {
      key: "tool",
      header: "Tool",
      sortable: true,
      render: (row) => (
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          {row.tool}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusPill status={row.status} />,
    },
    {
      key: "monthly_amount",
      header: "Maandelijks",
      sortable: true,
      align: "right",
      render: (row) => (
        <span
          className="text-sm tabular-nums"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {row.monthly_amount != null
            ? formatCurrency(row.monthly_amount)
            : "—"}
        </span>
      ),
    },
    {
      key: "annual_amount",
      header: "Jaarlijks",
      sortable: true,
      align: "right",
      render: (row) => (
        <span
          className="text-sm tabular-nums font-medium"
          style={{ color: "var(--color-text-primary)" }}
        >
          {row.annual_amount != null
            ? formatCurrency(row.annual_amount)
            : "—"}
        </span>
      ),
    },
    {
      key: "category",
      header: "Categorie",
      render: (row) => (
        <span
          className="text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {row.category ?? "—"}
        </span>
      ),
    },
    {
      key: "billing",
      header: "Betaalcyclus",
      render: (row) => (
        <span
          className="text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {row.billing ?? "—"}
        </span>
      ),
    },
    {
      key: "renewal_date",
      header: "Verlenging",
      sortable: true,
      render: (row) => {
        const soon = isRenewalSoon(row.renewal_date);
        return row.renewal_date ? (
          <span
            className="text-sm font-medium tabular-nums"
            style={{
              color: soon
                ? "var(--color-warning)"
                : "var(--color-text-secondary)",
            }}
          >
            {soon && "⚠ "}
            {formatDate(row.renewal_date)}
          </span>
        ) : (
          <span style={{ color: "var(--color-text-tertiary)" }}>—</span>
        );
      },
    },
    {
      key: "link",
      header: "Link",
      align: "center",
      render: (row) =>
        row.link ? (
          <a
            href={row.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center justify-center"
            style={{ color: "var(--color-accent)" }}
          >
            <ExternalLink size={14} />
          </a>
        ) : (
          <span style={{ color: "var(--color-text-tertiary)" }}>—</span>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Software Kosten"
        action={
          <AddButton onClick={() => setAddOpen(true)} label="Tool toevoegen" />
        }
      />

      <div>
        <DataTable
          data={software as unknown as Record<string, unknown>[]}
          columns={columns as unknown as Column<Record<string, unknown>>[]}
          loading={loading}
          emptyMessage="Geen software kosten gevonden."
        />
        {!loading && software.length > 0 && (
          <div
            className="rounded-b-[16px] border-x border-b px-4 py-3 flex items-center justify-between"
            style={{
              borderColor: "var(--color-border)",
              background:
                "color-mix(in srgb, var(--color-accent) 5%, transparent)",
            }}
          >
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Jaarlijkse run-rate
            </span>
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: "var(--color-text-primary)" }}
            >
              {formatCurrency(totalAnnualRunRate)}
            </span>
          </div>
        )}
      </div>

      {/* Add tool SlideOver */}
      <SlideOver
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Tool toevoegen"
        width="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Tool naam" required>
            <StyledInput
              type="text"
              value={form.tool}
              onChange={(e) => set("tool", e.target.value)}
              placeholder="bijv. Shopify"
            />
          </FormField>
          <FormField label="Status">
            <StyledSelect
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
            >
              <option value="actief">Actief</option>
              <option value="trial">Trial</option>
              <option value="paused">Gepauzeerd</option>
              <option value="opgezegd">Opgezegd</option>
            </StyledSelect>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Maandelijks bedrag">
              <StyledInput
                type="number"
                step="0.01"
                min="0"
                value={form.monthly_amount}
                onChange={(e) => set("monthly_amount", e.target.value)}
                placeholder="0,00"
              />
            </FormField>
            <FormField label="Betaalcyclus">
              <StyledSelect
                value={form.billing}
                onChange={(e) => set("billing", e.target.value)}
              >
                <option value="">—</option>
                <option value="maandelijks">Maandelijks</option>
                <option value="jaarlijks">Jaarlijks</option>
                <option value="kwartaal">Per kwartaal</option>
              </StyledSelect>
            </FormField>
          </div>
          <FormField label="Categorie">
            <StyledInput
              type="text"
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              placeholder="bijv. Marketing"
            />
          </FormField>
          <FormField label="Verlengingsdatum">
            <StyledInput
              type="date"
              value={form.renewal_date}
              onChange={(e) => set("renewal_date", e.target.value)}
            />
          </FormField>
          <FormField label="Link">
            <StyledInput
              type="url"
              value={form.link}
              onChange={(e) => set("link", e.target.value)}
              placeholder="https://..."
            />
          </FormField>
          {formError && (
            <p className="text-sm" style={{ color: "var(--color-danger)" }}>
              {formError}
            </p>
          )}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: "var(--color-accent)", color: "#fff" }}
            >
              {saving ? "Opslaan…" : "Opslaan"}
            </button>
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                border: "1px solid var(--color-border)",
                color: "var(--color-text-secondary)",
              }}
            >
              Annuleren
            </button>
          </div>
        </form>
      </SlideOver>
    </div>
  );
}

// ─── Tab 5: Inkoop ────────────────────────────────────────────────────────────

function InkoopTab() {
  const [payments, setPayments] = useState<SupplierPaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: raw } = await (supabase as any)
      .from("nucleus_supplier_payments")
      .select(
        `*, nucleus_suppliers(name), nucleus_products(name)`
      )
      .order("order_date", { ascending: false });

    if (raw) {
      const rows: SupplierPaymentRow[] = raw.map((r: Record<string, unknown>) => ({
        ...r,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supplier_name: (r.nucleus_suppliers as any)?.name ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        product_name: (r.nucleus_products as any)?.name ?? null,
      }));
      setPayments(rows);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const openTotal = payments
    .filter((p) => p.status !== "betaald")
    .reduce((s, p) => s + (p.amount ?? 0), 0);

  const columns: Column<SupplierPaymentRow>[] = [
    {
      key: "reference",
      header: "Referentie",
      render: (row) => (
        <span
          className="text-sm font-mono"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {row.reference ?? "—"}
        </span>
      ),
    },
    {
      key: "supplier_name",
      header: "Leverancier",
      sortable: true,
      render: (row) => (
        <span
          className="text-sm font-medium"
          style={{ color: "var(--color-text-primary)" }}
        >
          {row.supplier_name ?? "—"}
        </span>
      ),
    },
    {
      key: "product_name",
      header: "Product",
      render: (row) => (
        <span
          className="text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {row.product_name ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusPill status={row.status} />,
    },
    {
      key: "amount",
      header: "Bedrag",
      sortable: true,
      align: "right",
      render: (row) => (
        <span
          className="text-sm font-semibold tabular-nums"
          style={{ color: "var(--color-text-primary)" }}
        >
          {row.amount != null ? formatCurrency(row.amount) : "—"}
        </span>
      ),
    },
    {
      key: "units",
      header: "Eenheden",
      align: "right",
      render: (row) => (
        <span
          className="text-sm tabular-nums"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {row.units != null ? formatNumber(row.units) : "—"}
        </span>
      ),
    },
    {
      key: "order_date",
      header: "Besteldatum",
      sortable: true,
      render: (row) => (
        <span
          className="text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {row.order_date ? formatDate(row.order_date) : "—"}
        </span>
      ),
    },
    {
      key: "expected_delivery",
      header: "Verwachte levering",
      sortable: true,
      render: (row) => (
        <span
          className="text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {row.expected_delivery ? formatDate(row.expected_delivery) : "—"}
        </span>
      ),
    },
    {
      key: "payment_method",
      header: "Betaalmethode",
      render: (row) => (
        <span
          className="text-sm"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {row.payment_method ?? "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <SectionHeader title="Inkoopbetalingen" />

      <div>
        <DataTable
          data={payments as unknown as Record<string, unknown>[]}
          columns={columns as unknown as Column<Record<string, unknown>>[]}
          loading={loading}
          emptyMessage="Geen inkoopbetalingen gevonden."
        />
        {!loading && payments.length > 0 && (
          <div
            className="rounded-b-[16px] border-x border-b px-4 py-3 flex items-center justify-between"
            style={{
              borderColor: "var(--color-border)",
              background:
                "color-mix(in srgb, var(--color-warning) 5%, transparent)",
            }}
          >
            <span
              className="text-sm font-semibold"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Totaal openstaande verplichtingen
            </span>
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: "var(--color-warning)" }}
            >
              {formatCurrency(openTotal)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Finance Page ─────────────────────────────────────────────────────────────

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<Tab>("overzicht");
  const [metrics, setMetrics] = useState<DailyMetrics[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(true);

  const supabase = createClient();

  const fetchOverviewData = useCallback(async () => {
    setMetricsLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [{ data: m }, { data: s }] = await Promise.all([
      (supabase as any)
        .from("nucleus_daily_metrics")
        .select("*")
        .order("date", { ascending: false })
        .limit(365),
      (supabase as any)
        .from("nucleus_finance_summary")
        .select("*")
        .limit(1)
        .single(),
    ]);
    if (m) setMetrics(m);
    if (s) setSummary(s);
    setMetricsLoading(false);
  }, []);

  useEffect(() => {
    fetchOverviewData();
  }, [fetchOverviewData]);

  useRealtime("nucleus_daily_metrics", fetchOverviewData);

  return (
    <div className="flex flex-col h-full">
      {/* ── Page header ── */}
      <div
        className="flex items-center justify-between px-4 md:px-8 py-4 md:py-5 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        <div>
          <h1
            className="text-[24px] font-bold leading-tight"
            style={{ color: "var(--color-text-primary)" }}
          >
            Finance
          </h1>
          <p
            className="mt-0.5 text-sm"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Financieel overzicht, metrics en kosten
          </p>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div
        className="flex items-center gap-1 px-4 md:px-8 pt-3 md:pt-4 flex-shrink-0 overflow-x-auto"
        style={{ borderBottom: "1px solid var(--color-border)" }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative px-3 pb-3 pt-1 text-sm font-medium transition-colors whitespace-nowrap"
              style={{
                color: isActive
                  ? "var(--color-text-primary)"
                  : "var(--color-text-tertiary)",
              }}
            >
              {tab.label}
              {isActive && (
                <motion.div
                  layoutId="finance-tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
                  style={{ background: "var(--color-accent)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 36 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === "overzicht" && (
              <OverzichtTab
                metrics={metrics}
                summary={summary}
                loading={metricsLoading}
              />
            )}
            {activeTab === "dagelijks" && <DagelijkseMetricsTab />}
            {activeTab === "uitgaven" && <UitgavenTab />}
            {activeTab === "software" && <SoftwareTab />}
            {activeTab === "inkoop" && <InkoopTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

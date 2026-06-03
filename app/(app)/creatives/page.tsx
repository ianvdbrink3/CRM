"use client";

export const dynamic = "force-dynamic";

import {
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Film,
  Check,
  Trash2,
  Link as LinkIcon,
  Sparkles,
  AlertTriangle,
  ShieldCheck,
  GripVertical,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type {
  Creative,
  CreativeInsert,
  CreativeUpdate,
  Product,
  Campaign,
  CustomerInsight,
} from "@/lib/supabase/types";
import { SlideOver, EmptyState, StatusPill, toast } from "@/components/ui";
import { useRealtime } from "@/hooks/useRealtime";
import { cn } from "@/lib/utils";

// ─── Types & Constants ────────────────────────────────────────────────────────

type CreativeStatus =
  | "idea"
  | "script"
  | "recording"
  | "editing"
  | "ready"
  | "published";

const BOARD_STATUSES: CreativeStatus[] = [
  "idea",
  "script",
  "recording",
  "editing",
  "ready",
  "published",
];

const BOARD_STATUS_LABELS: Record<CreativeStatus, string> = {
  idea: "Idee",
  script: "Script",
  recording: "Opname",
  editing: "Bewerking",
  ready: "Klaar",
  published: "Gepubliceerd",
};

const PLATFORM_COLORS: Record<string, { bg: string; color: string }> = {
  Meta: {
    bg: "color-mix(in srgb, #0082FB 15%, transparent)",
    color: "#0082FB",
  },
  TikTok: {
    bg: "color-mix(in srgb, #ff2d55 15%, transparent)",
    color: "#ff2d55",
  },
  Google: {
    bg: "color-mix(in srgb, #EA4335 15%, transparent)",
    color: "#EA4335",
  },
  YouTube: {
    bg: "color-mix(in srgb, #FF0000 15%, transparent)",
    color: "#FF0000",
  },
  Instagram: {
    bg: "color-mix(in srgb, #E1306C 15%, transparent)",
    color: "#E1306C",
  },
  Snapchat: {
    bg: "color-mix(in srgb, #FFFC00 20%, transparent)",
    color: "#b8a800",
  },
};

const AVAILABLE_PLATFORMS = [
  "Meta",
  "TikTok",
  "Google",
  "YouTube",
  "Instagram",
  "Snapchat",
];

const FORMAT_OPTIONS = [
  "UGC Video",
  "Reels/Short",
  "Static Image",
  "Carousel",
  "Story",
  "Long-form Video",
  "Animation",
];

const HOOK_TYPE_OPTIONS = [
  "Problem/Solution",
  "Social Proof",
  "Fear of Missing Out",
  "Curiosity Gap",
  "Before/After",
  "Demo/Tutorial",
  "Testimonial",
  "Listicle",
  "Contrast",
  "Emotional",
];

// ─── Compliance helpers ───────────────────────────────────────────────────────

type ComplianceStatus = "none" | "ok" | "warning";

function getComplianceStatus(creative: Creative): ComplianceStatus {
  if (!creative.ai_generated) return "none";
  if (creative.disclosure_added) return "ok";
  return "warning";
}

// ─── Compliance Pill ──────────────────────────────────────────────────────────

function CompliancePill({ status }: { status: ComplianceStatus }) {
  if (status === "none") return null;

  if (status === "ok") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
        style={{
          background: "color-mix(in srgb, var(--color-success) 12%, transparent)",
          color: "var(--color-success)",
        }}
      >
        ✅ EU AI OK
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{
        background: "color-mix(in srgb, var(--color-warning) 12%, transparent)",
        color: "var(--color-warning)",
      }}
    >
      ⚠️ Disclosure vereist
    </span>
  );
}

// ─── Platform Chip ────────────────────────────────────────────────────────────

function PlatformChip({ platform }: { platform: string }) {
  const cfg = PLATFORM_COLORS[platform] ?? {
    bg: "color-mix(in srgb, var(--color-text-tertiary) 12%, transparent)",
    color: "var(--color-text-secondary)",
  };
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {platform}
    </span>
  );
}

// ─── Creative Card ────────────────────────────────────────────────────────────

interface CreativeCardProps {
  creative: Creative;
  productMap: Map<string, string>;
  onClick: () => void;
  onDragStart: (e: React.DragEvent, creative: Creative) => void;
}

function CreativeCard({
  creative,
  productMap,
  onClick,
  onDragStart,
}: CreativeCardProps) {
  const compliance = getComplianceStatus(creative);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
      draggable
      onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, creative)}
      onClick={onClick}
      className="rounded-[12px] border p-3 cursor-pointer select-none group"
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
      {/* Drag handle + name */}
      <div className="flex items-start gap-1.5 mb-1.5">
        <GripVertical
          size={12}
          className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-40 transition-opacity"
          style={{ color: "var(--color-text-tertiary)" }}
        />
        <span
          className="text-[13px] font-semibold leading-tight flex-1 line-clamp-2"
          style={{ color: "var(--color-text-primary)" }}
        >
          {creative.name}
        </span>
      </div>

      {/* Hook type + angle */}
      {(creative.hook_type || creative.angle) && (
        <p
          className="text-[11px] mb-2 truncate"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          {[creative.hook_type, creative.angle].filter(Boolean).join(" · ")}
        </p>
      )}

      {/* Format badge + Creator */}
      <div className="flex items-center justify-between gap-2 mb-2">
        {creative.format && (
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
            style={{
              background:
                "color-mix(in srgb, var(--color-accent) 10%, transparent)",
              color: "var(--color-accent)",
            }}
          >
            {creative.format}
          </span>
        )}
        {creative.creator && (
          <span
            className="text-[11px] truncate"
            style={{ color: "var(--color-text-secondary)" }}
          >
            {creative.creator}
          </span>
        )}
      </div>

      {/* Platforms */}
      {creative.platforms && creative.platforms.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {creative.platforms.map((p) => (
            <PlatformChip key={p} platform={p} />
          ))}
        </div>
      )}

      {/* Compliance pill */}
      {compliance !== "none" && (
        <div className="mt-1">
          <CompliancePill status={compliance} />
        </div>
      )}
    </motion.div>
  );
}

// ─── Board Column ─────────────────────────────────────────────────────────────

interface BoardColumnProps {
  status: CreativeStatus;
  creatives: Creative[];
  productMap: Map<string, string>;
  onCardClick: (creative: Creative) => void;
  onDragStart: (e: React.DragEvent, creative: Creative) => void;
  onDrop: (e: React.DragEvent, targetStatus: CreativeStatus) => void;
}

function BoardColumn({
  status,
  creatives,
  productMap,
  onCardClick,
  onDragStart,
  onDrop,
}: BoardColumnProps) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className="flex flex-col min-w-[210px] w-[220px] flex-shrink-0 rounded-[14px] transition-colors"
      style={{
        background: dragOver
          ? "color-mix(in srgb, var(--color-accent) 5%, var(--color-surface))"
          : "var(--color-surface)",
        border: dragOver
          ? "1.5px solid var(--color-accent)"
          : "1.5px solid var(--color-border)",
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        setDragOver(false);
        onDrop(e, status);
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
            background:
              "color-mix(in srgb, var(--color-text-tertiary) 12%, transparent)",
            color: "var(--color-text-tertiary)",
          }}
        >
          {creatives.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-2 p-2 flex-1 min-h-[80px]">
        <AnimatePresence>
          {creatives.map((c) => (
            <CreativeCard
              key={c.id}
              creative={c}
              productMap={productMap}
              onClick={() => onCardClick(c)}
              onDragStart={onDragStart}
            />
          ))}
        </AnimatePresence>
        {creatives.length === 0 && (
          <p
            className="text-xs text-center py-4"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            Geen creatives
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Form field helpers ───────────────────────────────────────────────────────

const INPUT_CLASS =
  "w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors";
const INPUT_STYLE = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  color: "var(--color-text-primary)",
};
const LABEL_CLASS =
  "block text-xs font-semibold mb-1.5 uppercase tracking-wide";
const LABEL_STYLE = { color: "var(--color-text-tertiary)" };

function onFieldFocus(
  e: React.FocusEvent<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >
) {
  e.currentTarget.style.borderColor = "var(--color-accent)";
}
function onFieldBlur(
  e: React.FocusEvent<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >
) {
  e.currentTarget.style.borderColor = "var(--color-border)";
}

// ─── Platform multi-select ────────────────────────────────────────────────────

function PlatformMultiSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (val: string[]) => void;
}) {
  const toggle = (p: string) => {
    if (value.includes(p)) {
      onChange(value.filter((x) => x !== p));
    } else {
      onChange([...value, p]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {AVAILABLE_PLATFORMS.map((p) => {
        const active = value.includes(p);
        const cfg = PLATFORM_COLORS[p] ?? {
          bg: "color-mix(in srgb, var(--color-text-tertiary) 12%, transparent)",
          color: "var(--color-text-secondary)",
        };
        return (
          <button
            key={p}
            type="button"
            onClick={() => toggle(p)}
            className="px-2.5 py-1 rounded-full text-xs font-semibold transition-all"
            style={{
              background: active
                ? cfg.bg
                : "color-mix(in srgb, var(--color-text-tertiary) 6%, transparent)",
              color: active ? cfg.color : "var(--color-text-tertiary)",
              border: active
                ? `1px solid ${cfg.color}`
                : "1px solid var(--color-border)",
            }}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}

// ─── AI Hook Generator ────────────────────────────────────────────────────────

interface HookGeneratorProps {
  productId: string | null;
  insights: CustomerInsight[];
  onAiUsed: () => void;
}

function HookGenerator({ productId, insights, onAiUsed }: HookGeneratorProps) {
  const [streaming, setStreaming] = useState(false);
  const [output, setOutput] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const relevantInsights = insights
    .filter((i) => !productId || i.product_id === productId)
    .slice(0, 10);

  if (relevantInsights.length === 0) return null;

  const generateHooks = async () => {
    if (streaming) {
      abortRef.current?.abort();
      setStreaming(false);
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
    if (!apiKey) {
      toast.error(
        "NEXT_PUBLIC_ANTHROPIC_API_KEY is niet geconfigureerd."
      );
      return;
    }

    setStreaming(true);
    setOutput("");
    onAiUsed();

    const insightBlock = relevantInsights
      .map((i) => `- ${i.title}: ${i.content ?? ""}`)
      .join("\n");

    const userPrompt = `Op basis van de volgende klantinzichten, genereer 5 krachtige hook/angle combinaties voor social media advertenties in het Nederlands. Elke combinatie moet een pakkende hook (eerste 3 seconden) en een duidelijke angle (invalshoek/boodschap) hebben.

Klantinzichten:
${insightBlock}

Geef de output als genummerde lijst met:
Hook: [de hook]
Angle: [de invalshoek]

Maak de hooks viraal, specifiek en emotioneel aansprekend.`;

    const body = JSON.stringify({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      stream: true,
      system:
        "Je bent een expert e-commerce copywriter gespecialiseerd in viral social media advertenties.",
      messages: [{ role: "user", content: userPrompt }],
    });

    abortRef.current = new AbortController();

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
          "content-type": "application/json",
        },
        body,
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        const errText = await res.text();
        toast.error(`Claude API fout: ${res.status} — ${errText.slice(0, 120)}`);
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const event = JSON.parse(data);
            if (
              event.type === "content_block_delta" &&
              event.delta?.type === "text_delta"
            ) {
              setOutput((prev) => prev + (event.delta.text ?? ""));
            }
          } catch {
            // ignore parse errors for malformed SSE lines
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast.error("Generatie mislukt. Controleer je API sleutel en verbinding.");
      }
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div
      className="rounded-[14px] p-4 space-y-3"
      style={{
        background: "color-mix(in srgb, var(--color-accent) 5%, var(--color-card))",
        border: "1px solid color-mix(in srgb, var(--color-accent) 20%, transparent)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles size={15} style={{ color: "var(--color-accent)" }} />
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--color-text-primary)" }}
        >
          AI Hook Generator
        </span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
          style={{
            background: "color-mix(in srgb, var(--color-accent) 15%, transparent)",
            color: "var(--color-accent)",
          }}
        >
          {relevantInsights.length} inzichten
        </span>
      </div>

      {/* EU AI Act notice */}
      <div
        className="flex items-start gap-2 px-3 py-2 rounded-lg text-xs"
        style={{
          background:
            "color-mix(in srgb, var(--color-warning) 10%, transparent)",
          border:
            "1px solid color-mix(in srgb, var(--color-warning) 25%, transparent)",
          color: "var(--color-warning)",
        }}
      >
        <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
        <span>
          <strong>EU AI Act Art. 50</strong> — Deze content is gegenereerd met
          AI. Voeg een zichtbaar openbaarmakingslabel toe vóór publicatie. De
          vlag &quot;AI gegenereerd&quot; en &quot;Disclosure toegevoegd&quot; worden
          automatisch ingesteld.
        </span>
      </div>

      {/* Generate button */}
      <button
        type="button"
        onClick={generateHooks}
        className="flex items-center gap-2 w-full justify-center py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
        style={{
          background: streaming
            ? "color-mix(in srgb, var(--color-accent) 70%, transparent)"
            : "var(--color-accent)",
          color: "#fff",
        }}
      >
        <Sparkles size={14} />
        {streaming ? "Genereren… (klik om te stoppen)" : "🤖 Genereer hooks met AI"}
      </button>

      {/* Output */}
      {output && (
        <textarea
          readOnly
          value={output}
          rows={10}
          className={cn(INPUT_CLASS, "resize-y font-mono text-xs leading-relaxed")}
          style={{
            ...INPUT_STYLE,
            background: "var(--color-surface)",
          }}
        />
      )}

      {streaming && !output && (
        <div
          className="text-xs text-center py-2 animate-pulse"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          Claude genereert hooks…
        </div>
      )}
    </div>
  );
}

// ─── Creative Detail SlideOver ────────────────────────────────────────────────

interface DetailSlideOverProps {
  creative: Creative | null;
  open: boolean;
  onClose: () => void;
  products: Product[];
  campaigns: Campaign[];
  insights: CustomerInsight[];
  onUpdated: () => void;
  onDeleted: () => void;
}

function CreativeDetailSlideOver({
  creative,
  open,
  onClose,
  products,
  campaigns,
  insights,
  onUpdated,
  onDeleted,
}: DetailSlideOverProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  type FormState = {
    name: string;
    product_id: string;
    campaign_id: string;
    status: CreativeStatus;
    hook_type: string;
    angle: string;
    creator: string;
    format: string;
    platforms: string[];
    ai_generated: boolean;
    disclosure_added: boolean;
    asset_link: string;
  };

  const [form, setForm] = useState<FormState>({
    name: "",
    product_id: "",
    campaign_id: "",
    status: "idea",
    hook_type: "",
    angle: "",
    creator: "",
    format: "",
    platforms: [],
    ai_generated: false,
    disclosure_added: false,
    asset_link: "",
  });

  useEffect(() => {
    if (creative) {
      setForm({
        name: creative.name,
        product_id: creative.product_id ?? "",
        campaign_id: creative.campaign_id ?? "",
        status: creative.status as CreativeStatus,
        hook_type: creative.hook_type ?? "",
        angle: creative.angle ?? "",
        creator: creative.creator ?? "",
        format: creative.format ?? "",
        platforms: creative.platforms ?? [],
        ai_generated: creative.ai_generated ?? false,
        disclosure_added: creative.disclosure_added ?? false,
        asset_link: creative.asset_link ?? "",
      });
      setError(null);
      setConfirmDelete(false);
    }
  }, [creative]);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const compliance: ComplianceStatus = form.ai_generated
    ? form.disclosure_added
      ? "ok"
      : "warning"
    : "none";

  const handleSave = async () => {
    if (!creative) return;
    if (!form.name.trim()) {
      setError("Naam is verplicht.");
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const update: CreativeUpdate = {
      name: form.name.trim(),
      product_id: form.product_id || null,
      campaign_id: form.campaign_id || null,
      status: form.status,
      hook_type: form.hook_type || null,
      angle: form.angle || null,
      creator: form.creator || null,
      format: form.format || null,
      platforms: form.platforms.length > 0 ? form.platforms : null,
      ai_generated: form.ai_generated,
      disclosure_added: form.disclosure_added,
      asset_link: form.asset_link || null,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await (supabase.from("nucleus_creatives") as any)
      .update(update)
      .eq("id", creative.id);
    setSaving(false);
    if (err) {
      setError(err.message);
    } else {
      toast.success("Creative opgeslagen!");
      onUpdated();
    }
  };

  const handleDelete = async () => {
    if (!creative) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("nucleus_creatives").delete().eq("id", creative.id);
    setDeleting(false);
    toast.success("Creative verwijderd.");
    onDeleted();
    onClose();
  };

  // Filter campaigns by selected product
  const filteredCampaigns = form.product_id
    ? campaigns.filter(
        (c) => !c.product_id || c.product_id === form.product_id
      )
    : campaigns;

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={creative?.name ?? "Creative"}
      width="lg"
    >
      {creative && (
        <div className="space-y-5">
          {/* Compliance status banner */}
          {compliance !== "none" && (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-[12px]"
              style={{
                background:
                  compliance === "ok"
                    ? "color-mix(in srgb, var(--color-success) 8%, transparent)"
                    : "color-mix(in srgb, var(--color-warning) 10%, transparent)",
                border:
                  compliance === "ok"
                    ? "1px solid color-mix(in srgb, var(--color-success) 25%, transparent)"
                    : "1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)",
              }}
            >
              {compliance === "ok" ? (
                <ShieldCheck
                  size={16}
                  style={{ color: "var(--color-success)", flexShrink: 0 }}
                />
              ) : (
                <AlertTriangle
                  size={16}
                  style={{ color: "var(--color-warning)", flexShrink: 0 }}
                />
              )}
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{
                    color:
                      compliance === "ok"
                        ? "var(--color-success)"
                        : "var(--color-warning)",
                  }}
                >
                  {compliance === "ok"
                    ? "EU AI Act — Compliance OK"
                    : "EU AI Act Art. 50 — Disclosure vereist"}
                </p>
                {compliance === "warning" && (
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    Voeg een zichtbaar openbaarmakingslabel toe vóór publicatie.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Name */}
          <div>
            <label className={LABEL_CLASS} style={LABEL_STYLE}>
              Naam <span style={{ color: "var(--color-danger)" }}>*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={INPUT_CLASS}
              style={INPUT_STYLE}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
            />
          </div>

          {/* Product + Campaign */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS} style={LABEL_STYLE}>
                Product
              </label>
              <select
                value={form.product_id}
                onChange={(e) => set("product_id", e.target.value)}
                className={INPUT_CLASS}
                style={INPUT_STYLE}
                onFocus={onFieldFocus}
                onBlur={onFieldBlur}
              >
                <option value="">— Kies product —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS} style={LABEL_STYLE}>
                Campagne
              </label>
              <select
                value={form.campaign_id}
                onChange={(e) => set("campaign_id", e.target.value)}
                className={INPUT_CLASS}
                style={INPUT_STYLE}
                onFocus={onFieldFocus}
                onBlur={onFieldBlur}
              >
                <option value="">— Kies campagne —</option>
                {filteredCampaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className={LABEL_CLASS} style={LABEL_STYLE}>
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as CreativeStatus)}
              className={INPUT_CLASS}
              style={INPUT_STYLE}
              onFocus={onFieldFocus}
              onBlur={onFieldBlur}
            >
              {BOARD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {BOARD_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          {/* Hook type + Angle */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS} style={LABEL_STYLE}>
                Hook type
              </label>
              <select
                value={form.hook_type}
                onChange={(e) => set("hook_type", e.target.value)}
                className={INPUT_CLASS}
                style={INPUT_STYLE}
                onFocus={onFieldFocus}
                onBlur={onFieldBlur}
              >
                <option value="">— Kies type —</option>
                {HOOK_TYPE_OPTIONS.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL_CLASS} style={LABEL_STYLE}>
                Angle
              </label>
              <input
                type="text"
                value={form.angle}
                onChange={(e) => set("angle", e.target.value)}
                placeholder="Bijv. 'Pijn vermijden'"
                className={INPUT_CLASS}
                style={INPUT_STYLE}
                onFocus={onFieldFocus}
                onBlur={onFieldBlur}
              />
            </div>
          </div>

          {/* Creator + Format */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS} style={LABEL_STYLE}>
                Creator
              </label>
              <input
                type="text"
                value={form.creator}
                onChange={(e) => set("creator", e.target.value)}
                placeholder="Naam creator"
                className={INPUT_CLASS}
                style={INPUT_STYLE}
                onFocus={onFieldFocus}
                onBlur={onFieldBlur}
              />
            </div>
            <div>
              <label className={LABEL_CLASS} style={LABEL_STYLE}>
                Formaat
              </label>
              <select
                value={form.format}
                onChange={(e) => set("format", e.target.value)}
                className={INPUT_CLASS}
                style={INPUT_STYLE}
                onFocus={onFieldFocus}
                onBlur={onFieldBlur}
              >
                <option value="">— Kies formaat —</option>
                {FORMAT_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Platforms */}
          <div>
            <label className={LABEL_CLASS} style={LABEL_STYLE}>
              Platforms
            </label>
            <PlatformMultiSelect
              value={form.platforms}
              onChange={(val) => set("platforms", val)}
            />
          </div>

          {/* AI Generated toggle */}
          <div>
            <label className={LABEL_CLASS} style={LABEL_STYLE}>
              AI instellingen
            </label>
            <div
              className="rounded-[12px] p-4 space-y-3"
              style={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
              }}
            >
              {/* AI generated toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    AI gegenereerd
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--color-text-tertiary)" }}
                  >
                    Content is (deels) gemaakt met AI
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    set("ai_generated", !form.ai_generated);
                    if (form.ai_generated) set("disclosure_added", false);
                  }}
                  className="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors"
                  style={{
                    background: form.ai_generated
                      ? "var(--color-accent)"
                      : "var(--color-border)",
                  }}
                  role="switch"
                  aria-checked={form.ai_generated}
                >
                  <span
                    className="absolute top-0.5 h-4 w-4 rounded-full transition-transform"
                    style={{
                      background: "#fff",
                      transform: form.ai_generated
                        ? "translateX(16px)"
                        : "translateX(2px)",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  />
                </button>
              </div>

              {/* Disclosure checkbox — only shown if ai_generated */}
              {form.ai_generated && (
                <div
                  className="flex items-start gap-3 pt-3"
                  style={{
                    borderTop:
                      "1px solid color-mix(in srgb, var(--color-warning) 30%, transparent)",
                  }}
                >
                  <input
                    type="checkbox"
                    id="disclosure-added"
                    checked={form.disclosure_added}
                    onChange={(e) =>
                      set("disclosure_added", e.target.checked)
                    }
                    className="mt-0.5 h-4 w-4 rounded"
                    style={{ accentColor: "var(--color-accent)" }}
                  />
                  <label
                    htmlFor="disclosure-added"
                    className="text-sm cursor-pointer"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    <span className="font-semibold">
                      Disclosure label toegevoegd
                    </span>
                    <p
                      className="text-xs mt-0.5 font-normal"
                      style={{ color: "var(--color-text-tertiary)" }}
                    >
                      EU AI Act Art. 50 — Er is een zichtbaar
                      openbaarmakingslabel aanwezig in de content
                    </p>
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Asset link */}
          <div>
            <label className={LABEL_CLASS} style={LABEL_STYLE}>
              Asset link
            </label>
            <div className="relative">
              <LinkIcon
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--color-text-tertiary)" }}
              />
              <input
                type="url"
                value={form.asset_link}
                onChange={(e) => set("asset_link", e.target.value)}
                placeholder="https://drive.google.com/…"
                className={cn(INPUT_CLASS, "pl-8")}
                style={INPUT_STYLE}
                onFocus={onFieldFocus}
                onBlur={onFieldBlur}
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
                  background:
                    "color-mix(in srgb, var(--color-danger) 10%, transparent)",
                  border:
                    "1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)",
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

          {/* AI Hook Generator */}
          <div
            style={{
              borderTop: "1px solid var(--color-border)",
              paddingTop: "1.25rem",
            }}
          >
            <HookGenerator
              productId={form.product_id || null}
              insights={insights}
              onAiUsed={() => {
                set("ai_generated", true);
              }}
            />
          </div>
        </div>
      )}
    </SlideOver>
  );
}

// ─── Create Creative Form ─────────────────────────────────────────────────────

interface CreateFormProps {
  products: Product[];
  campaigns: Campaign[];
  onSuccess: () => void;
  onClose: () => void;
}

function CreateCreativeForm({
  products,
  campaigns,
  onSuccess,
  onClose,
}: CreateFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  type CreateState = {
    name: string;
    product_id: string;
    campaign_id: string;
    hook_type: string;
    angle: string;
    creator: string;
    format: string;
    platforms: string[];
  };

  const [form, setForm] = useState<CreateState>({
    name: "",
    product_id: "",
    campaign_id: "",
    hook_type: "",
    angle: "",
    creator: "",
    format: "",
    platforms: [],
  });

  const set = <K extends keyof CreateState>(key: K, val: CreateState[K]) =>
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
    const insert: CreativeInsert = {
      name: form.name.trim(),
      product_id: form.product_id || null,
      campaign_id: form.campaign_id || null,
      status: "idea",
      hook_type: form.hook_type || null,
      angle: form.angle || null,
      creator: form.creator || null,
      format: form.format || null,
      platforms: form.platforms.length > 0 ? form.platforms : null,
      ai_generated: false,
      disclosure_added: false,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await (supabase.from("nucleus_creatives") as any).insert(insert);
    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }
    toast.success("Creative aangemaakt!");
    onSuccess();
    onClose();
  };

  const filteredCampaigns = form.product_id
    ? campaigns.filter(
        (c) => !c.product_id || c.product_id === form.product_id
      )
    : campaigns;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name */}
      <div>
        <label className={LABEL_CLASS} style={LABEL_STYLE}>
          Naam <span style={{ color: "var(--color-danger)" }}>*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Creative naam"
          className={INPUT_CLASS}
          style={INPUT_STYLE}
          onFocus={onFieldFocus}
          onBlur={onFieldBlur}
        />
      </div>

      {/* Product + Campaign */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLASS} style={LABEL_STYLE}>
            Product
          </label>
          <select
            value={form.product_id}
            onChange={(e) => set("product_id", e.target.value)}
            className={INPUT_CLASS}
            style={INPUT_STYLE}
            onFocus={onFieldFocus}
            onBlur={onFieldBlur}
          >
            <option value="">— Kies product —</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL_CLASS} style={LABEL_STYLE}>
            Campagne
          </label>
          <select
            value={form.campaign_id}
            onChange={(e) => set("campaign_id", e.target.value)}
            className={INPUT_CLASS}
            style={INPUT_STYLE}
            onFocus={onFieldFocus}
            onBlur={onFieldBlur}
          >
            <option value="">— Kies campagne —</option>
            {filteredCampaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Hook type + Angle */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLASS} style={LABEL_STYLE}>
            Hook type
          </label>
          <select
            value={form.hook_type}
            onChange={(e) => set("hook_type", e.target.value)}
            className={INPUT_CLASS}
            style={INPUT_STYLE}
            onFocus={onFieldFocus}
            onBlur={onFieldBlur}
          >
            <option value="">— Kies type —</option>
            {HOOK_TYPE_OPTIONS.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={LABEL_CLASS} style={LABEL_STYLE}>
            Angle
          </label>
          <input
            type="text"
            value={form.angle}
            onChange={(e) => set("angle", e.target.value)}
            placeholder="Bijv. 'Pijn vermijden'"
            className={INPUT_CLASS}
            style={INPUT_STYLE}
            onFocus={onFieldFocus}
            onBlur={onFieldBlur}
          />
        </div>
      </div>

      {/* Creator + Format */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL_CLASS} style={LABEL_STYLE}>
            Creator
          </label>
          <input
            type="text"
            value={form.creator}
            onChange={(e) => set("creator", e.target.value)}
            placeholder="Naam creator"
            className={INPUT_CLASS}
            style={INPUT_STYLE}
            onFocus={onFieldFocus}
            onBlur={onFieldBlur}
          />
        </div>
        <div>
          <label className={LABEL_CLASS} style={LABEL_STYLE}>
            Formaat
          </label>
          <select
            value={form.format}
            onChange={(e) => set("format", e.target.value)}
            className={INPUT_CLASS}
            style={INPUT_STYLE}
            onFocus={onFieldFocus}
            onBlur={onFieldBlur}
          >
            <option value="">— Kies formaat —</option>
            {FORMAT_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Platforms */}
      <div>
        <label className={LABEL_CLASS} style={LABEL_STYLE}>
          Platforms
        </label>
        <PlatformMultiSelect
          value={form.platforms}
          onChange={(val) => set("platforms", val)}
        />
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
          {saving ? "Aanmaken…" : "Creative aanmaken"}
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

// ─── Creatives Page ────────────────────────────────────────────────────────────

export default function CreativesPage() {
  const [loading, setLoading] = useState(true);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [insights, setInsights] = useState<CustomerInsight[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [selectedCreative, setSelectedCreative] = useState<Creative | null>(
    null
  );

  const draggedCreativeRef = useRef<Creative | null>(null);

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [
      { data: creativeRows },
      { data: productRows },
      { data: campaignRows },
      { data: insightRows },
    ] = await Promise.all([
      supabase
        .from("nucleus_creatives")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("nucleus_products")
        .select("id, name, status")
        .order("name"),
      supabase
        .from("nucleus_campaigns")
        .select("id, name, product_id, platform, status")
        .order("name"),
      supabase
        .from("nucleus_customer_insights")
        .select("id, title, content, product_id, type")
        .order("created_at", { ascending: false }),
    ]);
    if (creativeRows) setCreatives(creativeRows);
    if (productRows) setProducts(productRows as Product[]);
    if (campaignRows) setCampaigns(campaignRows as Campaign[]);
    if (insightRows) setInsights(insightRows as CustomerInsight[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useRealtime("nucleus_creatives", fetchAll);

  // ─── Drag & Drop ──────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, creative: Creative) => {
    draggedCreativeRef.current = creative;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (
    e: React.DragEvent,
    targetStatus: CreativeStatus
  ) => {
    e.preventDefault();
    const creative = draggedCreativeRef.current;
    draggedCreativeRef.current = null;
    if (!creative) return;
    if (creative.status === targetStatus) return;

    // Compliance gate: block move to published if AI without disclosure
    if (targetStatus === "published") {
      const compliance = getComplianceStatus(creative);
      if (compliance === "warning") {
        toast.error(
          "Publicatie geblokkeerd — EU AI Act Art. 50 vereist een openbaarmakingslabel bij AI-gegenereerde content. Voeg de disclosure toe in de details."
        );
        return;
      }
    }

    // Optimistic update
    setCreatives((prev) =>
      prev.map((c) =>
        c.id === creative.id ? { ...c, status: targetStatus } : c
      )
    );

    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("nucleus_creatives") as any)
      .update({ status: targetStatus })
      .eq("id", creative.id);

    if (error) {
      toast.error("Status bijwerken mislukt.");
      // Revert optimistic update
      setCreatives((prev) =>
        prev.map((c) =>
          c.id === creative.id ? { ...c, status: creative.status } : c
        )
      );
    } else {
      toast.success(
        `"${creative.name}" verplaatst naar ${BOARD_STATUS_LABELS[targetStatus]}.`
      );
    }
  };

  // ─── Derived ──────────────────────────────────────────────────────────────

  const productMap = new Map<string, string>(
    products.map((p) => [p.id, p.name])
  );

  const creativesByStatus = BOARD_STATUSES.reduce<
    Record<CreativeStatus, Creative[]>
  >(
    (acc, s) => {
      acc[s] = creatives.filter((c) => c.status === s);
      return acc;
    },
    {} as Record<CreativeStatus, Creative[]>
  );

  const aiWithoutDisclosure = creatives.filter(
    (c) => c.ai_generated && !c.disclosure_added
  ).length;

  // ─── Render ───────────────────────────────────────────────────────────────

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
            Creatives
          </h1>
          <p
            className="mt-0.5 text-sm"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            {creatives.length} creative{creatives.length !== 1 ? "s" : ""}{" "}
            totaal
            {aiWithoutDisclosure > 0 && (
              <span
                className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                style={{
                  background:
                    "color-mix(in srgb, var(--color-warning) 12%, transparent)",
                  color: "var(--color-warning)",
                }}
              >
                <AlertTriangle size={11} />
                {aiWithoutDisclosure} disclosure ontbreekt
              </span>
            )}
          </p>
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ background: "var(--color-accent)", color: "#fff" }}
        >
          <Plus size={15} />
          Nieuwe creative
        </button>
      </div>

      {/* ── Board ── */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex gap-4 h-full px-4 md:px-8 py-4 md:py-6 overflow-x-auto">
            {BOARD_STATUSES.map((s) => (
              <div
                key={s}
                className="min-w-[220px] w-[220px] h-40 rounded-[14px] animate-pulse flex-shrink-0"
                style={{ background: "var(--color-card)" }}
              />
            ))}
          </div>
        ) : creatives.length === 0 ? (
          <EmptyState
            icon={<Film size={24} />}
            title="Nog geen creatives"
            description="Maak je eerste creative aan om je productieflow te starten."
            action={{
              label: "Nieuwe creative",
              onClick: () => setCreateOpen(true),
            }}
          />
        ) : (
          <div className="h-full overflow-x-auto overflow-y-hidden px-4 md:px-8 py-4 md:py-6">
            <div className="flex gap-3 h-full items-start">
              {BOARD_STATUSES.map((status) => (
                <BoardColumn
                  key={status}
                  status={status}
                  creatives={creativesByStatus[status]}
                  productMap={productMap}
                  onCardClick={(c) => setSelectedCreative(c)}
                  onDragStart={handleDragStart}
                  onDrop={handleDrop}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Create SlideOver ── */}
      <SlideOver
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nieuwe creative"
        width="md"
      >
        <CreateCreativeForm
          products={products}
          campaigns={campaigns}
          onSuccess={fetchAll}
          onClose={() => setCreateOpen(false)}
        />
      </SlideOver>

      {/* ── Detail SlideOver ── */}
      <CreativeDetailSlideOver
        creative={selectedCreative}
        open={selectedCreative !== null}
        onClose={() => setSelectedCreative(null)}
        products={products}
        campaigns={campaigns}
        insights={insights}
        onUpdated={() => {
          fetchAll();
          setSelectedCreative(null);
        }}
        onDeleted={fetchAll}
      />
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";

// ─── Shimmer keyframe injected once ──────────────────────────────────────────
const SHIMMER_STYLE = `
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}
.shimmer-cell {
  background: linear-gradient(
    90deg,
    var(--color-border) 25%,
    color-mix(in srgb, var(--color-border) 60%, var(--color-surface)) 50%,
    var(--color-border) 75%
  );
  background-size: 800px 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
`;

function ShimmerStyles() {
  return <style dangerouslySetInnerHTML={{ __html: SHIMMER_STYLE }} />;
}

// ─── SkeletonRow ──────────────────────────────────────────────────────────────

interface SkeletonRowProps {
  /** Number of cells to render */
  cells?: number;
  /** Custom widths per cell, e.g. ['w-24', 'w-40', 'w-16'] */
  widths?: string[];
  className?: string;
}

export function SkeletonRow({
  cells = 4,
  widths,
  className,
}: SkeletonRowProps) {
  return (
    <>
      <ShimmerStyles />
      <tr className={cn("border-b", className)} style={{ borderColor: "var(--color-border)" }}>
        {Array.from({ length: cells }).map((_, i) => (
          <td key={i} className="px-4 py-3">
            <div
              className={cn(
                "h-4 rounded-full shimmer-cell",
                widths?.[i] ?? (i === 0 ? "w-32" : i === cells - 1 ? "w-16" : "w-24")
              )}
            />
          </td>
        ))}
      </tr>
    </>
  );
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────

interface SkeletonCardProps {
  /** Show an icon placeholder in the top-right */
  showIcon?: boolean;
  className?: string;
}

export function SkeletonCard({ showIcon = false, className }: SkeletonCardProps) {
  return (
    <>
      <ShimmerStyles />
      <div
        className={cn("p-5 rounded-[16px] border", className)}
        style={{
          background: "var(--color-card)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="h-3 w-24 rounded-full shimmer-cell" />
          {showIcon && (
            <div className="h-5 w-5 rounded-md shimmer-cell" />
          )}
        </div>
        <div className="h-9 w-36 rounded-lg shimmer-cell mb-3" />
        <div className="h-3 w-20 rounded-full shimmer-cell" />
      </div>
    </>
  );
}

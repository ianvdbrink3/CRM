"use client";

import { useState, useCallback } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { SkeletonRow } from "./SkeletonRow";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

type SortDir = "asc" | "desc" | null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getNestedValue<T>(row: T, key: string): unknown {
  return key.split(".").reduce((acc: unknown, part) => {
    if (acc && typeof acc === "object") {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, row);
}

function alignClass(align?: "left" | "right" | "center") {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  onRowClick,
  loading = false,
  emptyMessage = "Geen gegevens gevonden.",
  className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const handleSort = useCallback(
    (key: string) => {
      if (sortKey !== key) {
        setSortKey(key);
        setSortDir("asc");
      } else if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        setSortKey(null);
        setSortDir(null);
      }
    },
    [sortKey, sortDir]
  );

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey || !sortDir) return 0;
    const av = getNestedValue(a, sortKey);
    const bv = getNestedValue(b, sortKey);
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp =
      typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv), "nl");
    return sortDir === "asc" ? cmp : -cmp;
  });

  function SortIcon({ colKey }: { colKey: string }) {
    if (sortKey !== colKey)
      return <ChevronsUpDown size={13} style={{ color: "var(--color-text-tertiary)" }} />;
    if (sortDir === "asc")
      return <ChevronUp size={13} style={{ color: "var(--color-accent)" }} />;
    return <ChevronDown size={13} style={{ color: "var(--color-accent)" }} />;
  }

  return (
    <div
      className={cn(
        "w-full overflow-x-auto rounded-[16px] border",
        className
      )}
      style={{
        background: "var(--color-card)",
        borderColor: "var(--color-border)",
      }}
    >
      <table className="w-full min-w-max border-collapse text-sm">
        {/* Head */}
        <thead>
          <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
            {columns.map((col) => {
              const key = String(col.key);
              return (
                <th
                  key={key}
                  scope="col"
                  className={cn(
                    "px-4 py-3 font-medium text-[13px] select-none whitespace-nowrap",
                    alignClass(col.align),
                    col.sortable && "cursor-pointer"
                  )}
                  style={{ color: "var(--color-text-secondary)" }}
                  onClick={col.sortable ? () => handleSort(key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && <SortIcon colKey={key} />}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>

        {/* Body */}
        <tbody>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} cells={columns.length} />
            ))
          ) : sortedData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-sm"
                style={{ color: "var(--color-text-tertiary)" }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={cn(
                  "transition-colors",
                  onRowClick && "cursor-pointer",
                  rowIdx % 2 === 1 && "row-stripe"
                )}
                style={{
                  borderBottom:
                    rowIdx < sortedData.length - 1
                      ? "1px solid var(--color-border)"
                      : "none",
                }}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onMouseEnter={(e) => {
                  if (onRowClick) {
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      "color-mix(in srgb, var(--color-accent) 5%, transparent)";
                  }
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.background =
                    rowIdx % 2 === 1
                      ? "color-mix(in srgb, var(--color-border) 30%, transparent)"
                      : "transparent";
                }}
              >
                {columns.map((col) => {
                  const key = String(col.key);
                  const cellValue = getNestedValue(row, key);
                  return (
                    <td
                      key={key}
                      className={cn(
                        "px-4 py-3 whitespace-nowrap",
                        alignClass(col.align)
                      )}
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {col.render
                        ? col.render(row)
                        : cellValue != null
                        ? String(cellValue)
                        : "—"}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

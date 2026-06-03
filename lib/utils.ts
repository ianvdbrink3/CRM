import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind classes safely, resolving conflicts via tailwind-merge
 * and supporting conditional classes via clsx.
 *
 * @example cn("px-4 py-2", isActive && "bg-accent", className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ─── Dutch locale formatters ──────────────────────────────────────────────────

const NL_CURRENCY_FORMATTER = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NL_NUMBER_FORMATTER = new Intl.NumberFormat("nl-NL", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const NL_DATE_FORMATTER = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * Format a number as Dutch Euro currency.
 * Output example: € 1.234,56
 *
 * @param amount - Numeric amount in euros
 */
export function formatCurrency(amount: number): string {
  return NL_CURRENCY_FORMATTER.format(amount);
}

/**
 * Format a number with Dutch locale (period thousands separator, comma decimal).
 * Output example: 1.234,56
 *
 * @param n - Number to format
 */
export function formatNumber(n: number): string {
  return NL_NUMBER_FORMATTER.format(n);
}

/**
 * Format a date in Dutch long format.
 * Output example: 2 juni 2026
 *
 * @param d - ISO date string or Date object
 */
export function formatDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return NL_DATE_FORMATTER.format(date);
}

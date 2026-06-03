"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrendData {
  value: number;
  label: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: TrendData;
  icon?: React.ReactNode;
  loading?: boolean;
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  icon,
  loading = false,
  className,
}: MetricCardProps) {
  const isPositiveTrend = trend && trend.value >= 0;

  if (loading) {
    return (
      <div
        className={cn(
          "p-5 rounded-[16px] border overflow-hidden",
          className
        )}
        style={{
          background: "var(--color-card)",
          borderColor: "var(--color-border)",
        }}
      >
        <div className="animate-pulse flex flex-col gap-3">
          {/* Title shimmer */}
          <div
            className="h-3 w-24 rounded-full shimmer"
            style={{ background: "var(--color-border)" }}
          />
          {/* Value shimmer */}
          <div
            className="h-9 w-36 rounded-lg shimmer"
            style={{ background: "var(--color-border)" }}
          />
          {/* Subtitle shimmer */}
          <div
            className="h-3 w-20 rounded-full shimmer"
            style={{ background: "var(--color-border)" }}
          />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        "p-5 rounded-[16px] border relative overflow-hidden",
        className
      )}
      style={{
        background: "var(--color-card)",
        borderColor: "var(--color-border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between mb-2">
        <p
          className="text-[13px] font-medium leading-none"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {title}
        </p>
        {icon && (
          <span
            className="flex-shrink-0"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            {icon}
          </span>
        )}
      </div>

      {/* Big value */}
      <p
        className="tabular-nums font-semibold leading-[1.1] mt-1"
        style={{
          fontSize: "32px",
          color: "var(--color-text-primary)",
        }}
      >
        {value}
      </p>

      {/* Bottom row: subtitle + trend */}
      <div className="flex items-center gap-3 mt-2 flex-wrap">
        {subtitle && (
          <p
            className="text-[13px]"
            style={{ color: "var(--color-text-tertiary)" }}
          >
            {subtitle}
          </p>
        )}

        {trend && (
          <span
            className="inline-flex items-center gap-1 text-xs font-medium"
            style={{
              color: isPositiveTrend
                ? "var(--color-success)"
                : "var(--color-danger)",
            }}
          >
            {isPositiveTrend ? (
              <TrendingUp size={12} />
            ) : (
              <TrendingDown size={12} />
            )}
            {isPositiveTrend ? "+" : ""}
            {trend.value}% {trend.label}
          </span>
        )}
      </div>
    </motion.div>
  );
}

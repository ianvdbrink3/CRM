"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6",
        className
      )}
    >
      {icon && (
        <div
          className="mb-4 flex items-center justify-center rounded-2xl"
          style={{
            width: 56,
            height: 56,
            background: "color-mix(in srgb, var(--color-text-tertiary) 10%, transparent)",
            color: "var(--color-text-tertiary)",
          }}
        >
          {icon}
        </div>
      )}

      <h3
        className="text-[15px] font-semibold mb-1"
        style={{ color: "var(--color-text-primary)" }}
      >
        {title}
      </h3>

      {description && (
        <p
          className="text-sm max-w-xs leading-relaxed mb-5"
          style={{ color: "var(--color-text-tertiary)" }}
        >
          {description}
        </p>
      )}

      {action && !description && <div className="mb-5" />}

      {action && (
        <button
          onClick={action.onClick}
          className="btn btn-primary btn-sm"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}

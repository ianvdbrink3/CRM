"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const WIDTH_MAP = {
  sm: "w-full sm:w-[360px]",
  md: "w-full sm:w-[480px]",
  lg: "w-full sm:w-[640px]",
};

interface SlideOverProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: "sm" | "md" | "lg";
  className?: string;
}

export function SlideOver({
  open,
  onClose,
  title,
  children,
  width = "md",
  className,
}: SlideOverProps) {
  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Frosted backdrop */}
          <motion.div
            key="slideover-backdrop"
            className="fixed inset-0 z-40"
            style={{
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              background: "rgba(0, 0, 0, 0.45)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.aside
            key="slideover-panel"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              "fixed inset-y-0 right-0 z-50 flex flex-col max-w-full",
              WIDTH_MAP[width],
              className
            )}
            style={{
              background: "var(--color-surface)",
              borderLeft: "1px solid var(--color-border)",
              boxShadow: "var(--shadow-xl)",
            }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ borderBottom: "1px solid var(--color-border)" }}
            >
              <h2
                className="text-[15px] font-semibold leading-tight"
                style={{ color: "var(--color-text-primary)" }}
              >
                {title}
              </h2>
              <button
                onClick={onClose}
                aria-label="Sluiten"
                className="flex items-center justify-center rounded-md transition-colors"
                style={{
                  width: 40,
                  height: 40,
                  color: "var(--color-text-tertiary)",
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    "var(--color-card)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    "transparent")
                }
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-5">
              {children}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

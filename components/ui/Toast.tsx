"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface ToastContextValue {
  add: (type: ToastType, message: string) => void;
  remove: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// ─── Variant config ───────────────────────────────────────────────────────────

const TOAST_CONFIG: Record<ToastType, { icon: React.ElementType; color: string }> = {
  success: { icon: CheckCircle,   color: "var(--color-success)" },
  error:   { icon: XCircle,       color: "var(--color-danger)"  },
  warning: { icon: AlertTriangle, color: "var(--color-warning)" },
  info:    { icon: Info,          color: "var(--color-accent)"  },
};

// ─── Single toast item ────────────────────────────────────────────────────────

function ToastItemComponent({
  item,
  onRemove,
}: {
  item: ToastItem;
  onRemove: (id: string) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { icon: Icon, color } = TOAST_CONFIG[item.type];

  const dismiss = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    onRemove(item.id);
  }, [item.id, onRemove]);

  useEffect(() => {
    timerRef.current = setTimeout(() => onRemove(item.id), 4000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [item.id, onRemove]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 48, scale: 0.94 }}
      animate={{ opacity: 1, x: 0,  scale: 1    }}
      exit={{    opacity: 0, x: 48, scale: 0.94 }}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="flex items-start gap-3 px-4 py-3 rounded-[14px] min-w-[260px] max-w-[360px]"
      style={{
        background:          "color-mix(in srgb, var(--color-surface) 85%, transparent)",
        backdropFilter:      "blur(16px)",
        WebkitBackdropFilter:"blur(16px)",
        border:              "1px solid var(--color-border)",
        boxShadow:           "var(--shadow-lg)",
      }}
    >
      <Icon
        size={16}
        className="flex-shrink-0 mt-[1px]"
        style={{ color }}
      />
      <p
        className="flex-1 text-sm leading-snug"
        style={{ color: "var(--color-text-primary)" }}
      >
        {item.message}
      </p>
      <button
        onClick={dismiss}
        aria-label="Sluiten"
        className="flex-shrink-0 mt-[1px] rounded transition-opacity opacity-50 hover:opacity-100"
        style={{ color: "var(--color-text-tertiary)" }}
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

// ─── Imperative dispatcher (singleton) ───────────────────────────────────────
// Lets you call toast.success("…") from outside React (e.g. server actions).

let _dispatch: ((type: ToastType, message: string) => void) | null = null;

export function _registerToastDispatcher(
  fn: (type: ToastType, message: string) => void
) {
  _dispatch = fn;
}

function imperativeDispatch(type: ToastType, message: string) {
  if (!_dispatch) {
    console.warn(`[Toast] ToastProvider niet gemount. Bericht: ${message}`);
    return;
  }
  _dispatch(type, message);
}

/** Call anywhere: toast.success("Opgeslagen!") */
export const toast = {
  success: (message: string) => imperativeDispatch("success", message),
  error:   (message: string) => imperativeDispatch("error",   message),
  warning: (message: string) => imperativeDispatch("warning", message),
  info:    (message: string) => imperativeDispatch("info",    message),
} as const;

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const add = useCallback((type: ToastType, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Register imperative dispatcher on mount; clean up on unmount
  useEffect(() => {
    _registerToastDispatcher(add);
    return () => {
      _dispatch = null;
    };
  }, [add]);

  return (
    <ToastContext.Provider value={{ add, remove }}>
      {children}

      {/* Fixed bottom-right container */}
      <div
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {toasts.map((item) => (
            <div key={item.id} className="pointer-events-auto">
              <ToastItemComponent item={item} onRemove={remove} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast moet binnen een <ToastProvider> worden gebruikt.");
  }
  return ctx;
}

// Alias for convenience
export { ToastProvider as ToastStack };

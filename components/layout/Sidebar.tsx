"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  Megaphone,
  Film,
  Lightbulb,
  Truck,
  TrendingUp,
  BookOpen,
  CheckSquare,
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard",    href: "/",           icon: LayoutDashboard },
  { label: "Producten",    href: "/products",   icon: Package },
  { label: "Campagnes",    href: "/campaigns",  icon: Megaphone },
  { label: "Creatives",    href: "/creatives",  icon: Film },
  { label: "Inzichten",    href: "/insights",   icon: Lightbulb },
  { label: "Leveranciers", href: "/suppliers",  icon: Truck },
  { label: "Financiën",    href: "/finance",    icon: TrendingUp },
  { label: "SOPs",         href: "/sops",       icon: BookOpen },
  { label: "Taken",        href: "/tasks",      icon: CheckSquare },
  { label: "Vergaderingen",href: "/meetings",   icon: Calendar },
  { label: "Instellingen", href: "/settings",   icon: Settings },
];

const STORAGE_KEY = "nucleus-sidebar-collapsed";

const sidebarVariants: Variants = {
  expanded: { width: 256 },
  collapsed: { width: 64 },
};

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden:  { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 28 },
  },
};

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Persist collapsed state
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      localStorage.setItem(STORAGE_KEY, String(!prev));
      return !prev;
    });
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  const sidebarContent = (
    <motion.div
      className="flex flex-col h-full"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-4 flex-shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
        <div className="flex items-center gap-2 min-w-0">
          {/* Accent dot */}
          <span
            className="flex-shrink-0 rounded-full"
            style={{ width: 8, height: 8, background: "#5B6CFF", boxShadow: "0 0 8px rgba(91,108,255,0.6)" }}
          />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                key="wordmark"
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.18 }}
                style={{
                  fontWeight: 600,
                  fontSize: 18,
                  letterSpacing: "-0.03em",
                  color: "#5B6CFF",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                }}
              >
                Nucleus
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse toggle — only visible on desktop */}
        <button
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Sidebar uitvouwen" : "Sidebar inklappen"}
          className="ml-auto flex-shrink-0 hidden md:flex items-center justify-center rounded-md transition-colors"
          style={{
            width: 28,
            height: 28,
            color: "var(--color-text-tertiary)",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
        <ul className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <motion.li key={item.href} variants={itemVariants}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="relative flex items-center gap-3 rounded-md px-3 py-2 transition-all"
                  style={{
                    color: active ? "#5B6CFF" : "var(--color-text-secondary)",
                    background: active ? "rgba(91,108,255,0.10)" : "transparent",
                    fontWeight: active ? 500 : 400,
                    fontSize: 14,
                    minHeight: 36,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      e.currentTarget.style.color = "var(--color-text-primary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "var(--color-text-secondary)";
                    }
                  }}
                >
                  {/* Active indicator bar */}
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-full"
                      style={{ width: 3, height: 20, background: "#5B6CFF" }}
                    />
                  )}
                  <Icon size={16} className="flex-shrink-0" />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        key={`label-${item.href}`}
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.15 }}
                        style={{ whiteSpace: "nowrap", overflow: "hidden" }}
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </motion.li>
            );
          })}
        </ul>
      </nav>
    </motion.div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        className="hidden md:flex flex-col flex-shrink-0 h-screen sticky top-0"
        style={{
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          background: "rgba(22,22,24,0.8)",
          borderRight: "1px solid var(--color-border)",
          overflow: "hidden",
        }}
        variants={sidebarVariants}
        animate={collapsed ? "collapsed" : "expanded"}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {sidebarContent}
      </motion.aside>

      {/* Mobile: hamburger toggle (shown in TopBar on mobile) */}
      {/* Mobile: overlay drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: "rgba(0,0,0,0.6)" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            {/* Drawer */}
            <motion.aside
              key="drawer"
              className="fixed inset-y-0 left-0 z-50 md:hidden flex flex-col"
              style={{
                width: 256,
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                background: "rgba(22,22,24,0.95)",
                borderRight: "1px solid var(--color-border)",
              }}
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

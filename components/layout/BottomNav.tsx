"use client";

import { useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  CheckSquare,
  MessageSquare,
  MoreHorizontal,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { label: "Home",      href: "/",        icon: LayoutDashboard },
  { label: "Financiën", href: "/finance",  icon: TrendingUp },
  { label: "Taken",     href: "/tasks",    icon: CheckSquare },
  { label: "Chat",      href: "/chat",     icon: MessageSquare },
];

export function BottomNav() {
  const pathname = usePathname();
  const supabase = createClient();
  const [unreadChat, setUnreadChat] = useState(0);

  const loadUnread = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: status } = await supabase
      .from("chat_read_status")
      .select("last_read_at")
      .eq("user_id", user.id)
      .single();
    const since = (status as { last_read_at?: string } | null)?.last_read_at ?? "1970-01-01";
    const { count } = await supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .gt("created_at", since)
      .neq("sender_id", user.id)
      .is("deleted_at", null);
    setUnreadChat(count ?? 0);
  }, [supabase]);

  useEffect(() => {
    loadUnread();
    const channel = supabase
      .channel("bottom-nav-badge")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, () => {
        if (pathname !== "/chat") loadUnread();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadUnread, pathname, supabase]);

  useEffect(() => {
    if (pathname === "/chat") setUnreadChat(0);
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  // Don't show on known "more" pages that aren't in the bottom nav
  const isMorePage = !NAV_ITEMS.some((item) => isActive(item.href));

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex items-stretch"
      style={{
        height: 60,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        background: "rgba(18,18,20,0.96)",
        borderTop: "1px solid var(--color-border)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {NAV_ITEMS.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        const isChat = item.href === "/chat";

        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
            style={{
              color: active ? "#5B6CFF" : "var(--color-text-tertiary)",
            }}
          >
            <div className="relative">
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
              {isChat && unreadChat > 0 && (
                <span
                  className="absolute -top-1 -right-1.5 flex items-center justify-center rounded-full text-white font-bold"
                  style={{ minWidth: 16, height: 16, background: "#FF453A", fontSize: 9, padding: "0 3px" }}
                >
                  {unreadChat > 99 ? "99+" : unreadChat}
                </span>
              )}
            </div>
            <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{item.label}</span>
          </Link>
        );
      })}

      {/* More tab */}
      <Link
        href="/settings"
        className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors"
        style={{ color: isMorePage ? "#5B6CFF" : "var(--color-text-tertiary)" }}
      >
        <MoreHorizontal size={22} strokeWidth={isMorePage ? 2.2 : 1.8} />
        <span style={{ fontSize: 10, fontWeight: isMorePage ? 600 : 400 }}>Meer</span>
      </Link>
    </nav>
  );
}

"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  content: string;
  created_at: string;
  edited_at: string | null;
  sender_id: string;
  user_profiles: {
    display_name: string;
    initials: string;
    avatar_color: string;
  };
}

interface UserProfile {
  id: string;
  display_name: string;
  initials: string;
  avatar_color: string;
  online_at: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Vandaag";
  if (d.toDateString() === yesterday.toDateString()) return "Gisteren";
  return d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
}

function isOnline(onlineAt: string | null): boolean {
  if (!onlineAt) return false;
  return Date.now() - new Date(onlineAt).getTime() < 5 * 60 * 1000;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ initials, color, size = 32, showBadge, online }: {
  initials: string;
  color: string;
  size?: number;
  showBadge?: boolean;
  online?: boolean;
}) {
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex items-center justify-center rounded-full font-bold text-white select-none"
        style={{
          width: size, height: size,
          background: color,
          fontSize: size * 0.35,
        }}
      >
        {initials}
      </div>
      {showBadge && (
        <div
          className="absolute rounded-full"
          style={{
            width: 9, height: 9,
            bottom: -1, right: -1,
            background: online ? "#30D158" : "rgba(255,255,255,0.2)",
            border: "2px solid var(--color-card, #1C1C1F)",
          }}
        />
      )}
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  isOwn,
  showAvatar,
  showName,
}: {
  msg: ChatMessage;
  isOwn: boolean;
  showAvatar: boolean;
  showName: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-end gap-2 ${isOwn ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar placeholder */}
      <div style={{ width: 32, flexShrink: 0 }}>
        {showAvatar && !isOwn && (
          <Avatar
            initials={msg.user_profiles.initials}
            color={msg.user_profiles.avatar_color}
            size={32}
          />
        )}
      </div>

      <div
        className={`flex flex-col gap-1 max-w-[70%] ${isOwn ? "items-end" : "items-start"}`}
      >
        {showName && !isOwn && (
          <span className="text-[11px] px-1 font-medium" style={{ color: "var(--color-text-tertiary)" }}>
            {msg.user_profiles.display_name}
          </span>
        )}

        <div
          className="px-3.5 py-2.5 rounded-[16px] text-sm leading-relaxed"
          style={{
            background: isOwn
              ? "#5B6CFF"
              : "var(--color-card)",
            color: isOwn ? "#fff" : "var(--color-text-primary)",
            border: isOwn ? "none" : "1px solid var(--color-border)",
            borderBottomRightRadius: isOwn ? 4 : 16,
            borderBottomLeftRadius: isOwn ? 16 : 4,
            wordBreak: "break-word",
          }}
        >
          {msg.content}
        </div>

        <span className="text-[10px] px-1" style={{ color: "var(--color-text-tertiary)" }}>
          {formatTime(msg.created_at)}
          {msg.edited_at && " · bewerkt"}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Day Divider ──────────────────────────────────────────────────────────────

function DayDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
      <span className="text-[11px] font-medium px-2" style={{ color: "var(--color-text-tertiary)" }}>
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const supabase = createClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load initial data
  const loadMessages = useCallback(async (before?: string) => {
    const url = before
      ? `/api/chat?limit=50&cursor=${before}`
      : "/api/chat?limit=50";
    const res = await fetch(url);
    const data = await res.json() as { messages: ChatMessage[] };
    return data.messages ?? [];
  }, []);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const [msgs, { data: profiles }] = await Promise.all([
        loadMessages(),
        supabase.from("user_profiles").select("id, display_name, initials, avatar_color, online_at"),
      ]);

      setMessages(msgs);
      setHasMore(msgs.length === 50);
      if (msgs.length > 0) setCursor(msgs[0].created_at);
      setTeamMembers((profiles ?? []) as UserProfile[]);
      setLoading(false);

      // Mark as read
      await fetch("/api/chat/read", { method: "POST" });

      // Update own online_at
      if (user) {
        await supabase
          .from("user_profiles")
          .update({ online_at: new Date().toISOString() } as never)
          .eq("id", user.id);
      }
    }

    init();
  }, [loadMessages, supabase]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (!loading) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, loading]);

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("chat-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async (payload) => {
          // Fetch the full message with profile
          const { data } = await supabase
            .from("chat_messages")
            .select("id, content, created_at, edited_at, sender_id, user_profiles!inner(display_name, initials, avatar_color)")
            .eq("id", (payload.new as { id: string }).id)
            .single();

          if (data) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === (data as ChatMessage).id)) return prev;
              return [...prev, data as ChatMessage];
            });
            // Mark read
            fetch("/api/chat/read", { method: "POST" });
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  async function sendMessage() {
    const content = input.trim();
    if (!content || sending) return;
    setInput("");
    setSending(true);

    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    setSending(false);
    textareaRef.current?.focus();
  }

  async function loadMore() {
    if (!cursor || !hasMore) return;
    const older = await loadMessages(cursor);
    if (older.length > 0) {
      setMessages((prev) => [...older, ...prev]);
      setCursor(older[0].created_at);
      setHasMore(older.length === 50);
    } else {
      setHasMore(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Build grouped messages with day labels
  const grouped: Array<{ type: "day"; label: string } | { type: "message"; msg: ChatMessage; showAvatar: boolean; showName: boolean }> = [];
  let lastDay = "";
  let lastSender = "";

  for (const msg of messages) {
    const day = formatDay(msg.created_at);
    if (day !== lastDay) {
      grouped.push({ type: "day", label: day });
      lastDay = day;
      lastSender = "";
    }
    const showAvatar = msg.sender_id !== lastSender;
    const showName = msg.sender_id !== lastSender;
    grouped.push({ type: "message", msg, showAvatar, showName });
    lastSender = msg.sender_id;
  }

  return (
    <div className="flex h-full">
      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center rounded-[10px]"
              style={{ width: 36, height: 36, background: "color-mix(in srgb, var(--color-accent) 12%, transparent)", color: "var(--color-accent)" }}
            >
              <MessageSquare size={17} />
            </div>
            <div>
              <h1 className="text-[15px] font-bold" style={{ color: "var(--color-text-primary)" }}>
                Team Chat
              </h1>
              <p className="text-xs" style={{ color: "var(--color-text-tertiary)" }}>
                {teamMembers.filter((m) => isOnline(m.online_at)).length} online
              </p>
            </div>
          </div>

          {/* Team avatars */}
          <div className="flex items-center -space-x-1.5">
            {teamMembers.map((m) => (
              <Avatar
                key={m.id}
                initials={m.initials}
                color={m.avatar_color}
                size={28}
                showBadge
                online={isOnline(m.online_at)}
              />
            ))}
          </div>
        </div>

        {/* Messages */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-1"
        >
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-5 h-5 rounded-full border-2 border-[#5B6CFF] border-t-transparent animate-spin" />
            </div>
          ) : (
            <>
              {hasMore && (
                <div className="text-center mb-4">
                  <button
                    onClick={loadMore}
                    className="text-xs px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
                    style={{ background: "var(--color-surface)", color: "var(--color-text-tertiary)", border: "1px solid var(--color-border)" }}
                  >
                    Oudere berichten laden
                  </button>
                </div>
              )}

              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-3">
                  <MessageSquare size={32} style={{ color: "var(--color-text-tertiary)" }} />
                  <p className="text-sm" style={{ color: "var(--color-text-tertiary)" }}>
                    Nog geen berichten. Stuur het eerste bericht!
                  </p>
                </div>
              )}

              <AnimatePresence initial={false}>
                {grouped.map((item, idx) => {
                  if (item.type === "day") {
                    return <DayDivider key={`day-${idx}`} label={item.label} />;
                  }
                  return (
                    <MessageBubble
                      key={item.msg.id}
                      msg={item.msg}
                      isOwn={item.msg.sender_id === currentUserId}
                      showAvatar={item.showAvatar}
                      showName={item.showName}
                    />
                  );
                })}
              </AnimatePresence>
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div
          className="flex-shrink-0 px-3 sm:px-6 py-3"
          style={{ borderTop: "1px solid var(--color-border)" }}
        >
          <div
            className="flex items-end gap-3 rounded-[14px] p-3"
            style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Stuur een bericht…"
              rows={1}
              className="flex-1 resize-none outline-none text-sm leading-relaxed"
              style={{
                background: "transparent",
                color: "var(--color-text-primary)",
                minHeight: 24,
                maxHeight: 120,
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="flex-shrink-0 flex items-center justify-center rounded-[10px] transition-all"
              style={{
                width: 36,
                height: 36,
                background: input.trim() ? "#5B6CFF" : "rgba(91,108,255,0.2)",
                color: input.trim() ? "#fff" : "rgba(91,108,255,0.5)",
              }}
            >
              <Send size={15} />
            </button>
          </div>
          <p className="text-[10px] mt-1.5 text-center" style={{ color: "var(--color-text-tertiary)" }}>
            Enter om te sturen · Shift+Enter voor nieuwe regel
          </p>
        </div>
      </div>

      {/* Sidebar: team info */}
      <div
        className="w-64 flex-shrink-0 hidden lg:flex flex-col"
        style={{ borderLeft: "1px solid var(--color-border)" }}
      >
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--color-text-tertiary)" }}>
            Team
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {teamMembers.map((m) => {
            const online = isOnline(m.online_at);
            return (
              <div key={m.id} className="flex items-center gap-3 py-1.5">
                <Avatar initials={m.initials} color={m.avatar_color} size={32} showBadge online={online} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>
                    {m.display_name}
                  </p>
                  <p className="text-[11px]" style={{ color: online ? "#30D158" : "var(--color-text-tertiary)" }}>
                    {online ? "Online" : "Offline"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

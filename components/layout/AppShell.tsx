"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--color-bg)" }}>
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar onMenuClick={() => setMobileOpen((v) => !v)} />

        <main
          className="flex-1 overflow-y-auto"
          style={{ background: "var(--color-bg)" }}
        >
          {/* Extra bottom padding on mobile so content isn't hidden behind BottomNav */}
          <div className="pb-20 md:pb-0">
            {children}
          </div>
        </main>
      </div>

      {/* Fixed bottom nav — only on mobile */}
      <BottomNav />
    </div>
  );
}

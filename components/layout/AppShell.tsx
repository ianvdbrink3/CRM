"use client";

import { type ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--color-bg)" }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main column: topbar + scrollable content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />

        <main
          className="flex-1 overflow-y-auto"
          style={{ background: "var(--color-bg)" }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

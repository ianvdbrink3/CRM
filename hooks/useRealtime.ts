"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to a Supabase table for realtime INSERT/UPDATE/DELETE changes
 * and calls `callback` on any event. Unsubscribes on component unmount.
 *
 * @param table    - The Supabase table name to watch
 * @param callback - Function called whenever a row changes
 */
export function useRealtime(table: string, callback: () => void) {
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`realtime:${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          callback();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);
}

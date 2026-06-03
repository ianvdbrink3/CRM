"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const appUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password/confirm`
        : "/reset-password/confirm";

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: appUrl,
    });

    setLoading(false);

    if (err) {
      setError(err.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0A0A0B" }}>
      <div
        aria-hidden
        style={{
          position: "fixed", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(91,108,255,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        style={{
          background: "rgba(28,28,31,0.85)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          padding: "clamp(24px, 6vw, 48px) clamp(20px, 5vw, 40px)",
          width: "100%",
          maxWidth: 400,
        }}
      >
        {sent ? (
          <div className="text-center space-y-4">
            <CheckCircle size={40} style={{ color: "#30D158", margin: "0 auto" }} />
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#F5F5F7" }}>
              E-mail verstuurd
            </h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", lineHeight: 1.6 }}>
              Als {email} een account heeft, ontvang je een e-mail met een reset-link. Controleer ook je spamfolder.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-medium"
              style={{ color: "#5B6CFF", textDecoration: "none" }}
            >
              <ArrowLeft size={14} />
              Terug naar inloggen
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-2 text-center">
              <span style={{ fontWeight: 600, fontSize: 26, letterSpacing: "-0.03em", color: "#5B6CFF" }}>
                Wachtwoord vergeten
              </span>
            </div>
            <p className="text-center mb-8 text-xs" style={{ color: "rgba(255,255,255,0.38)" }}>
              Vul je e-mailadres in en ontvang een reset-link
            </p>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.65)" }}>
                  E-mailadres
                </label>
                <div className="relative">
                  <Mail size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="naam@bedrijf.nl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    style={{ width: "100%", padding: "12px 14px 12px 36px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(91,108,255,0.6)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
                  />
                </div>
              </div>

              {error && (
                <p style={{ fontSize: 13, color: "#FF5050" }}>{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                style={{
                  width: "100%", padding: "13px 0", borderRadius: 10, border: "none",
                  background: loading || !email ? "rgba(91,108,255,0.4)" : "#5B6CFF",
                  color: "#fff", fontSize: 15, fontWeight: 600,
                  cursor: loading || !email ? "not-allowed" : "pointer",
                }}
              >
                {loading ? "Versturen…" : "Reset-link versturen"}
              </button>

              <div className="text-center">
                <Link href="/login" className="inline-flex items-center gap-1.5 text-sm" style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}>
                  <ArrowLeft size={12} />
                  Terug naar inloggen
                </Link>
              </div>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}

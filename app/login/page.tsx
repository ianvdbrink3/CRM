"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    fetch("/api/auth/setup")
      .then((r) => r.json())
      .then((d: { needsSetup?: boolean }) => {
        if (d.needsSetup) router.replace("/setup");
      })
      .catch(() => {});
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const next = searchParams.get("next") ?? "/";
        router.push(next);
        router.refresh();
      } else {
        const data = await res.json() as { error?: string };
        setError(data.error ?? "Inloggen mislukt");
        setPassword("");
      }
    } catch {
      setError("Verbindingsfout, probeer opnieuw");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#0A0A0B" }}
    >
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(91,108,255,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22, mass: 0.9 }}
        style={{
          background: "rgba(28,28,31,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          padding: "48px 40px",
          width: "100%",
          maxWidth: 400,
          boxShadow:
            "0 8px 40px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.06) inset",
        }}
      >
        {/* Wordmark */}
        <div className="mb-2 text-center">
          <span
            style={{
              fontFamily: "Inter, system-ui, sans-serif",
              fontWeight: 600,
              fontSize: 28,
              letterSpacing: "-0.03em",
              color: "#5B6CFF",
              lineHeight: 1,
            }}
          >
            CRM Tool
          </span>
        </div>

        <p
          className="text-center mb-10"
          style={{
            color: "rgba(255,255,255,0.38)",
            fontSize: 13,
            letterSpacing: "0.01em",
          }}
        >
          Ian &amp; Tygo · Operations OS
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 500,
                color: "rgba(255,255,255,0.65)",
              }}
            >
              E-mailadres
            </label>
            <div className="relative">
              <Mail
                size={14}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "rgba(255,255,255,0.3)",
                }}
              />
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="naam@bedrijf.nl"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 36px",
                  borderRadius: 10,
                  border: error
                    ? "1px solid rgba(255,80,80,0.7)"
                    : "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => { if (!error) e.currentTarget.style.borderColor = "rgba(91,108,255,0.6)"; }}
                onBlur={(e) => { if (!error) e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              style={{
                display: "block",
                marginBottom: 6,
                fontSize: 13,
                fontWeight: 500,
                color: "rgba(255,255,255,0.65)",
              }}
            >
              Wachtwoord
            </label>
            <div className="relative">
              <Lock
                size={14}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "rgba(255,255,255,0.3)",
                }}
              />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "12px 40px 12px 36px",
                  borderRadius: 10,
                  border: error
                    ? "1px solid rgba(255,80,80,0.7)"
                    : "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.05)",
                  color: "#fff",
                  fontSize: 14,
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => { if (!error) e.currentTarget.style.borderColor = "rgba(91,108,255,0.6)"; }}
                onBlur={(e) => { if (!error) e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((p) => !p)}
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "rgba(255,255,255,0.3)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 2,
                }}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ fontSize: 13, color: "#FF5050", margin: 0 }}
            >
              {error}
            </motion.p>
          )}

          <div className="flex items-center justify-end">
            <Link
              href="/reset-password"
              style={{ fontSize: 12, color: "rgba(91,108,255,0.8)", textDecoration: "none" }}
            >
              Wachtwoord vergeten?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            style={{
              width: "100%",
              padding: "13px 0",
              borderRadius: 10,
              border: "none",
              background:
                loading || !email || !password
                  ? "rgba(91,108,255,0.4)"
                  : "#5B6CFF",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              cursor: loading || !email || !password ? "not-allowed" : "pointer",
              transition: "background 0.15s",
              marginTop: 4,
            }}
          >
            {loading ? "Inloggen…" : "Inloggen"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

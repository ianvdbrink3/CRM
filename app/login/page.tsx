"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(false);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(true);
        setPassword("");
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#0A0A0B" }}
    >
      {/* Subtle radial glow behind the card */}
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
          background: "rgba(28,28,31,0.8)",
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
              fontSize: 32,
              letterSpacing: "-0.03em",
              color: "#5B6CFF",
              lineHeight: 1,
            }}
          >
            Nucleus
          </span>
        </div>

        {/* Subtitle */}
        <p
          className="text-center mb-10"
          style={{
            color: "rgba(255,255,255,0.38)",
            fontSize: 13,
            fontFamily: "Inter, system-ui, sans-serif",
            letterSpacing: "0.01em",
          }}
        >
          Ian &amp; Tygo · Operations OS
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label
              htmlFor="password"
              style={{
                display: "block",
                marginBottom: 8,
                fontSize: 13,
                fontWeight: 500,
                color: "rgba(255,255,255,0.65)",
                fontFamily: "Inter, system-ui, sans-serif",
                letterSpacing: "0.01em",
              }}
            >
              Wachtwoord
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="Voer het wachtwoord in"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(false);
              }}
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 10,
                border: error
                  ? "1px solid rgba(255,80,80,0.7)"
                  : "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)",
                color: "#fff",
                fontSize: 15,
                fontFamily: "Inter, system-ui, sans-serif",
                outline: "none",
                transition: "border-color 0.15s",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                if (!error) {
                  e.currentTarget.style.borderColor = "rgba(91,108,255,0.6)";
                }
              }}
              onBlur={(e) => {
                if (!error) {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
                }
              }}
            />

            {/* Error message */}
            <motion.div
              initial={false}
              animate={error ? { opacity: 1, height: "auto", marginTop: 8 } : { opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.18 }}
              style={{ overflow: "hidden" }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: "#FF5050",
                  fontFamily: "Inter, system-ui, sans-serif",
                }}
              >
                Onjuist wachtwoord
              </span>
            </motion.div>
          </div>

          <button
            type="submit"
            disabled={loading || password.length === 0}
            style={{
              width: "100%",
              padding: "13px 0",
              borderRadius: 10,
              border: "none",
              background: loading || password.length === 0
                ? "rgba(91,108,255,0.45)"
                : "#5B6CFF",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              fontFamily: "Inter, system-ui, sans-serif",
              cursor: loading || password.length === 0 ? "not-allowed" : "pointer",
              transition: "background 0.15s, transform 0.1s",
              marginTop: 8,
              letterSpacing: "0.01em",
            }}
            onMouseEnter={(e) => {
              if (!loading && password.length > 0) {
                e.currentTarget.style.background = "#6B7CFF";
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && password.length > 0) {
                e.currentTarget.style.background = "#5B6CFF";
              }
            }}
            onMouseDown={(e) => {
              if (!loading && password.length > 0) {
                e.currentTarget.style.transform = "scale(0.98)";
              }
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            {loading ? "Bezig…" : "Inloggen"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

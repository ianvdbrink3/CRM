"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, User, Mail, Lock, CheckCircle } from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/setup")
      .then((r) => r.json())
      .then((d: { needsSetup?: boolean }) => {
        if (!d.needsSetup) router.replace("/login");
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0A0A0B" }}>
        <div className="w-6 h-6 rounded-full border-2 border-[#5B6CFF] border-t-transparent animate-spin" />
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Wachtwoorden komen niet overeen");
      return;
    }
    if (password.length < 8) {
      setError("Wachtwoord moet minimaal 8 tekens zijn");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });

      const data = await res.json() as { success?: boolean; error?: string };
      if (data.success) {
        router.push("/");
        router.refresh();
      } else {
        setError(data.error ?? "Setup mislukt");
      }
    } catch {
      setError("Verbindingsfout, probeer opnieuw");
    } finally {
      setLoading(false);
    }
  }

  const passwordStrength = () => {
    if (password.length === 0) return null;
    if (password.length < 8) return { label: "Te kort", color: "#FF453A" };
    if (password.length < 12 || !/[A-Z]/.test(password) || !/[0-9]/.test(password))
      return { label: "Redelijk", color: "#FF9F0A" };
    return { label: "Sterk", color: "#30D158" };
  };

  const strength = passwordStrength();

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
          width: 700,
          height: 700,
          borderRadius: "50%",
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
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          padding: "clamp(24px, 6vw, 48px) clamp(20px, 5vw, 40px)",
          width: "100%",
          maxWidth: 440,
          boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
        }}
      >
        <div className="mb-1 text-center">
          <span
            style={{ fontWeight: 600, fontSize: 28, letterSpacing: "-0.03em", color: "#5B6CFF" }}
          >
            CRM Tool
          </span>
        </div>
        <div className="text-center mb-2">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ background: "rgba(91,108,255,0.15)", color: "#5B6CFF" }}
          >
            Eerste account aanmaken
          </span>
        </div>
        <p className="text-center mb-8 text-xs" style={{ color: "rgba(255,255,255,0.38)" }}>
          Dit is een eenmalige stap. Daarna kun je een teamgenoot uitnodigen.
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Name */}
          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.65)" }}>
              Volledige naam
            </label>
            <div className="relative">
              <User size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
              <input
                type="text"
                autoComplete="name"
                placeholder="Ian van den Brink"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loading}
                style={{ width: "100%", padding: "12px 14px 12px 36px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(91,108,255,0.6)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
              />
            </div>
          </div>

          {/* Email */}
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

          {/* Password */}
          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.65)" }}>
              Wachtwoord
            </label>
            <div className="relative">
              <Lock size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Min. 8 tekens"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{ width: "100%", padding: "12px 40px 12px 36px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(91,108,255,0.6)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
              />
              <button type="button" tabIndex={-1} onClick={() => setShowPassword((p) => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer" }}>
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {strength && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className="flex gap-1">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 28, height: 3, borderRadius: 2,
                        background:
                          strength.color === "#FF453A" && i === 1 ? strength.color :
                          strength.color === "#FF9F0A" && i <= 2 ? strength.color :
                          strength.color === "#30D158" ? strength.color :
                          "rgba(255,255,255,0.1)",
                      }}
                    />
                  ))}
                </div>
                <span style={{ fontSize: 11, color: strength.color }}>{strength.label}</span>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.65)" }}>
              Wachtwoord bevestigen
            </label>
            <div className="relative">
              <Lock size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.3)" }} />
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Herhaal wachtwoord"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                style={{ width: "100%", padding: "12px 40px 12px 36px", borderRadius: 10, border: confirmPassword && confirmPassword !== password ? "1px solid rgba(255,80,80,0.7)" : "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.05)", color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(91,108,255,0.6)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = confirmPassword && confirmPassword !== password ? "rgba(255,80,80,0.7)" : "rgba(255,255,255,0.1)"; }}
              />
              {confirmPassword && confirmPassword === password && (
                <CheckCircle size={14} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "#30D158" }} />
              )}
            </div>
          </div>

          {error && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: 13, color: "#FF5050" }}>
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password || !displayName || !confirmPassword}
            style={{
              width: "100%",
              padding: "13px 0",
              borderRadius: 10,
              border: "none",
              background: loading || !email || !password || !displayName || !confirmPassword ? "rgba(91,108,255,0.4)" : "#5B6CFF",
              color: "#fff",
              fontSize: 15,
              fontWeight: 600,
              cursor: loading || !email || !password || !displayName || !confirmPassword ? "not-allowed" : "pointer",
              marginTop: 4,
            }}
          >
            {loading ? "Account aanmaken…" : "Account aanmaken"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

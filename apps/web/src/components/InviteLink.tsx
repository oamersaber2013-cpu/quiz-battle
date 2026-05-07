// InviteLink — simplified (isPrivate/password features removed from MVP)
"use client";
import { useGameStore } from "@/store/gameStore";
import { useState } from "react";

export function InviteLink() {
  const { joinCode, language } = useGameStore();
  const [copied, setCopied] = useState(false);
  const isRTL = language === "ar";

  if (!joinCode) return null;

  const link = `${typeof window !== "undefined" ? window.location.origin : ""}/join/${joinCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="glass-card p-3" style={{ border: "1px solid var(--clr-primary)" }} dir={isRTL ? "rtl" : "ltr"}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <code style={{ flex: 1, fontSize: "1.1rem", fontWeight: 800, letterSpacing: "0.15em", color: "var(--clr-gold)" }}>
          {joinCode}
        </code>
        <button className="btn btn-secondary" style={{ fontSize: "0.75rem", padding: "6px 12px" }} onClick={handleCopy}>
          {copied ? (isRTL ? "✓ تم النسخ" : "✓ Copied!") : (isRTL ? "نسخ" : "Copy")}
        </button>
      </div>
      <div style={{ fontSize: "0.7rem", opacity: 0.5, marginTop: 4 }}>
        {isRTL ? "شارك هذا الرمز مع أصدقائك" : "Share this code with your friends"}
      </div>
    </div>
  );
}

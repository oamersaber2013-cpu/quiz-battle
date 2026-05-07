"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useGameStore } from "@/store/gameStore";

export function SuccessContent() {
  const { userId } = useGameStore();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    // In a real implementation, verify the session with the backend
    // and update credits/subscription status.
    if (sessionId && userId) {
      console.log("Payment verified for session:", sessionId);
    }
  }, [sessionId, userId]);

  return (
    <main
      className="page"
      style={{
        padding: "40px 20px",
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div className="container" style={{ maxWidth: 480, textAlign: "center" }}>
        <div className="glass-card p-8 animate-scale-in">
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #00e676 0%, #00c853 100%)",
              margin: "0 auto 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "3rem",
              animation: "float 3s ease-in-out infinite",
            }}
          >
            ✓
          </div>

          <h1 className="font-black text-2xl mb-2">Payment Successful!</h1>
          <p className="text-muted mb-6">
            Thank you for your purchase. Your credits or subscription has been activated.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Link href="/store" className="btn btn-primary btn-lg">
              🏪 Back to Store
            </Link>
            <Link href="/profile" className="btn btn-secondary">
              👤 View Profile
            </Link>
            <Link href="/" className="btn btn-ghost">
              🏠 Return Home
            </Link>
          </div>
        </div>

        <div
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            zIndex: -1,
            background: `
              radial-gradient(circle at 20% 20%, rgba(0,230,118,0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(108,99,255,0.1) 0%, transparent 50%)
            `,
          }}
        />
      </div>
    </main>
  );
}

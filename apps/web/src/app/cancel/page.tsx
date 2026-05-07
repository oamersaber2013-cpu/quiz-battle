"use client";

import Link from "next/link";

export default function CancelPage() {
  return (
    <main className="page" style={{ padding: "40px 20px", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="container" style={{ maxWidth: 480, textAlign: "center" }}>
        <div className="glass-card p-8 animate-scale-in">
          {/* Cancel Icon */}
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #ffa502 0%, #ff6348 100%)",
              margin: "0 auto 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2.5rem",
            }}
          >
            ✕
          </div>

          <h1 className="font-black text-2xl mb-2">Payment Cancelled</h1>
          <p className="text-muted mb-6">
            No worries! You can try again whenever you are ready.
          </p>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Link href="/store" className="btn btn-primary btn-lg">
              🏪 Return to Store
            </Link>
            <Link href="/" className="btn btn-ghost">
              🏠 Back to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

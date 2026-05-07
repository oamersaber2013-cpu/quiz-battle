"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useGameStore } from "@/store/gameStore";
import { connectSocket } from "@/lib/socket";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, addToast } = useGameStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast("error", data.error || "Login failed");
        return;
      }

      setAuth({
        userId: data.userId,
        username: data.username,
        token: data.token,
        isGuest: false,
        xp: data.xp,
        rank: data.rank,
        role: data.role,
        credits: data.credits,
        isSubscribed: data.isSubscribed,
      });

      connectSocket(data.userId, data.username, data.token, false);
      addToast("success", "Welcome back, warrior!");
      router.push("/");
    } catch (err) {
      addToast("error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page" style={{ padding: "40px 20px", minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="container" style={{ maxWidth: 420 }}>
        <div className="glass-card p-8 animate-scale-in">
          {/* Header */}
          <div className="text-center mb-8">
            <div style={{ fontSize: "3rem", marginBottom: 12 }}>⚔️</div>
            <h1 className="font-black text-2xl">Welcome Back</h1>
            <p className="text-muted text-sm">Sign in to your warrior account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label className="text-muted text-sm" style={{ display: "block", marginBottom: 8 }}>
                Email
              </label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="warrior@example.com"
                required
              />
            </div>

            <div>
              <label className="text-muted text-sm" style={{ display: "block", marginBottom: 8 }}>
                Password
              </label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
            >
              {loading ? "Signing in..." : "⚔️ Sign In"}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-muted text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Create one
              </Link>
            </p>
            <div className="mt-4">
              <Link href="/" className="btn btn-ghost btn-sm">
                ← Continue as Guest
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

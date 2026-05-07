"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useGameStore } from "@/store/gameStore";
import { connectSocket } from "@/lib/socket";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth, addToast } = useGameStore();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !email || !password) return;

    if (password !== confirmPassword) {
      addToast("error", "Passwords do not match");
      return;
    }

    if (password.length < 8) {
      addToast("error", "Password must be at least 8 characters");
      return;
    }

    if (username.length < 3) {
      addToast("error", "Username must be at least 3 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        addToast("error", data.error || "Registration failed");
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
        credits: 0,
        isSubscribed: false,
      });

      connectSocket(data.userId, data.username, data.token, false);
      addToast("success", "Welcome to the battle, warrior!");
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
            <div style={{ fontSize: "3rem", marginBottom: 12 }}>🛡️</div>
            <h1 className="font-black text-2xl">Join the Battle</h1>
            <p className="text-muted text-sm">Create your warrior account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label className="text-muted text-sm" style={{ display: "block", marginBottom: 8 }}>
                Warrior Name
              </label>
              <input
                type="text"
                className="input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Warrior123"
                required
                minLength={3}
                maxLength={20}
              />
            </div>

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
              <p className="text-muted text-xs mt-1">Must be at least 8 characters</p>
            </div>

            <div>
              <label className="text-muted text-sm" style={{ display: "block", marginBottom: 8 }}>
                Confirm Password
              </label>
              <input
                type="password"
                className="input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading ? "Creating account..." : "🛡️ Create Account"}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center mt-6">
            <p className="text-muted text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
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

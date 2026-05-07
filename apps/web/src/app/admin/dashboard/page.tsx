"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "@/store/gameStore";

interface AdminStats {
  totalUsers: number;
  totalGames: number;
  totalQuestions: number;
  activeGames: number;
  suspiciousUsers: string[];
}

export default function AdminDashboard() {
  const { language, userId, role } = useGameStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  const isRTL = language === "ar";

  const T = {
    title: { en: "Admin Dashboard", ar: "لوحة التحكم" },
    users: { en: "Total Users", ar: "إجمالي المستخدمين" },
    games: { en: "Total Games", ar: "إجمالي الألعاب" },
    questions: { en: "Total Questions", ar: "إجمالي الأسئلة" },
    active: { en: "Active Games", ar: "الألعاب النشطة" },
    suspicious: { en: "Suspicious Users", ar: "مستخدمون مشبوهون" },
    unauthorized: { en: "Unauthorized Access", ar: "وصول غير مصرح" },
  };

  useEffect(() => {
    if (role !== "admin") return;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [role]);

  if (role !== "admin") {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h1>{T.unauthorized[language]}</h1>
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: 40 }}>Loading...</div>;
  }

  return (
    <div style={{ padding: 40, maxWidth: 1200, margin: "0 auto" }} dir={isRTL ? "rtl" : "ltr"}>
      <h1 style={{ marginBottom: 40 }}>{T.title[language]}</h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>
        <StatCard title={T.users[language]} value={stats?.totalUsers || 0} />
        <StatCard title={T.games[language]} value={stats?.totalGames || 0} />
        <StatCard title={T.questions[language]} value={stats?.totalQuestions || 0} />
        <StatCard title={T.active[language]} value={stats?.activeGames || 0} />
      </div>

      {stats?.suspiciousUsers && stats.suspiciousUsers.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <h2>{T.suspicious[language]}</h2>
          <ul>
            {stats.suspiciousUsers.map(id => (
              <li key={id}>{id}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div style={{
      background: "var(--grad-primary)",
      padding: 30,
      borderRadius: 12,
      textAlign: "center",
    }}>
      <div style={{ fontSize: 48, fontWeight: "bold", marginBottom: 10 }}>{value}</div>
      <div style={{ fontSize: 18, opacity: 0.9 }}>{title}</div>
    </div>
  );
}

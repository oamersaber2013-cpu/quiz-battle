"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { Difficulty, QuestionCategory } from "@quiz-battle/shared";

interface QuestionData {
  id: string;
  category: string;
  topic: string | null;
  subtopic: string | null;
  difficulty: string;
  textEn: string;
  textAr: string;
  optionsEnJson: string;
  optionsArJson: string;
  explanationEn: string | null;
  explanationAr: string | null;
  correctIndex: number;
  sourceType: string;
  sourceDetail: string | null;
  createdAt: string;
}

export default function AdminPage() {
  const { role, token, addToast } = useGameStore();
  const router = useRouter();

  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("ai_generated");
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [editForm, setEditForm] = useState<Partial<QuestionData>>({});

  const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";

  useEffect(() => {
    if (role !== "ADMIN") {
      router.push("/");
      return;
    }
    fetchQuestions();
  }, [filterType, role]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/admin/questions?status=${filterType}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setQuestions(data.questions);
      } else {
        addToast("error", data.error || "Failed to fetch questions");
      }
    } catch (err) {
      console.error(err);
      addToast("error", "Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: string) => {
    try {
      const res = await fetch(`${API}/api/admin/questions/${id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ sourceType: "verified" })
      });
      if (res.ok) {
        addToast("success", "Question verified!");
        setQuestions(q => q.filter(x => x.id !== id));
      } else {
        addToast("error", "Failed to verify");
      }
    } catch (err) {
      addToast("error", "Network error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      const res = await fetch(`${API}/api/admin/questions/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        addToast("success", "Question deleted");
        setQuestions(q => q.filter(x => x.id !== id));
      }
    } catch (err) {
      addToast("error", "Network error");
    }
  };

  if (role !== "ADMIN") return null;

  return (
    <main className="page" style={{ padding: "24px 20px" }}>
      <div className="container" style={{ maxWidth: 1200 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <h1 className="font-black text-3xl">🛡️ Moderation Dashboard</h1>
          <Link href="/" className="btn btn-secondary text-sm">🏠 Back to App</Link>
        </div>

        {/* Filters */}
        <div className="glass-card p-4 mb-6" style={{ display: "flex", gap: 16 }}>
          <button 
            className={`btn ${filterType === 'ai_generated' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setFilterType('ai_generated')}
          >
            🤖 AI Generated
          </button>
          <button 
            className={`btn ${filterType === 'hybrid' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setFilterType('hybrid')}
          >
            🔄 Hybrid
          </button>
          <button 
            className={`btn ${filterType === 'verified' ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => setFilterType('verified')}
          >
            ✅ Verified
          </button>
        </div>

        {/* Question List */}
        {loading ? (
          <div className="text-center p-12 text-muted animate-pulse">Loading database...</div>
        ) : questions.length === 0 ? (
          <div className="glass-card p-12 text-center text-muted">
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>✨</div>
            No questions found in this category.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {questions.map((q) => (
              <div key={q.id} className="glass-card p-6" style={{ borderLeft: `4px solid ${q.sourceType === 'verified' ? '#00e676' : '#ffa502'}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <span className="badge badge-primary">{q.category}</span>
                    {q.topic && <span className="badge" style={{ background: "rgba(255,255,255,0.1)" }}>{q.topic}</span>}
                    {q.subtopic && <span className="badge" style={{ background: "rgba(255,255,255,0.1)" }}>{q.subtopic}</span>}
                    <span className="badge" style={{ color: "var(--clr-text)", borderColor: "var(--clr-border)" }}>{q.difficulty}</span>
                  </div>
                  <div className="text-xs text-muted font-mono">{q.id}</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 20 }}>
                  {/* English Side */}
                  <div>
                    <h3 className="text-xs font-bold text-muted mb-2 uppercase tracking-wider">English</h3>
                    <div className="font-bold mb-3">{q.textEn}</div>
                    <ul className="text-sm" style={{ paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                      {JSON.parse(q.optionsEnJson).map((opt: string, i: number) => (
                        <li key={i} style={{ color: q.correctIndex === i ? "#00e676" : "inherit", fontWeight: q.correctIndex === i ? "bold" : "normal" }}>
                          {i === q.correctIndex ? "✓ " : "• "}{opt}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* Arabic Side */}
                  <div dir="rtl" style={{ textAlign: "right" }}>
                    <h3 className="text-xs font-bold text-muted mb-2 uppercase tracking-wider">العربية</h3>
                    <div className="font-bold mb-3">{q.textAr}</div>
                    <ul className="text-sm" style={{ paddingRight: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
                      {JSON.parse(q.optionsArJson).map((opt: string, i: number) => (
                        <li key={i} style={{ color: q.correctIndex === i ? "#00e676" : "inherit", fontWeight: q.correctIndex === i ? "bold" : "normal" }}>
                          {opt} {i === q.correctIndex ? " ✓" : " •"}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", paddingTop: 16, borderTop: "1px solid var(--clr-border)" }}>
                  {q.sourceType !== 'verified' && (
                    <button className="btn btn-primary btn-sm" onClick={() => handleVerify(q.id)} style={{ background: "#00e676", color: "#000", border: "none" }}>
                      ✅ Verify & Publish
                    </button>
                  )}
                  <button className="btn btn-secondary btn-sm" onClick={() => addToast("info", "Edit coming soon")}>
                    ✏️ Edit
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => handleDelete(q.id)} style={{ color: "#ff4757", borderColor: "#ff4757" }}>
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { AccountShell, AccountState } from "@/components/account/AccountShell";
import styles from "@/components/account/Account.module.css";
import { getApiOrigin } from "@/lib/apiOrigin";
import { useGameStore } from "@/store/gameStore";
import { AdminState } from "./AdminState";
import { useAdminResource } from "./useAdminResource";
import review from "./review.module.css";

interface Question {
  id: string; category: string; difficulty: string; topic?: string; subtopic?: string; sourceType: string;
  textEn: string; textAr: string; optionsEnJson: string; optionsArJson: string; correctIndex: number;
}

function readAnswers(raw: string): string[] {
  try { const data: unknown = JSON.parse(raw); return Array.isArray(data) && data.every(v => typeof v === "string") ? data : []; }
  catch { return []; }
}

const filters = [
  { id: "ai_generated", en: "AI generated", ar: "مولّدة آليًا" },
  { id: "hybrid", en: "Hybrid", ar: "هجينة" },
  { id: "verified", en: "Verified", ar: "معتمدة" },
];

export default function AdminPage() {
  const ar = useGameStore(s => s.language) === "ar";
  const notify = useGameStore(s => s.addToast);
  const [filter, setFilter] = useState("ai_generated");
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<string | null>(null);
  const { token, data, error, retry } = useAdminResource<{ questions: Question[]; pagination: { totalPages: number } }>(
    `questions?status=${filter}&page=${page}`
  );

  async function moderate(id: string, action: "verify" | "delete") {
    if (pending || !token) return;
    const remove = action === "delete";
    if (remove && !window.confirm(ar ? "حذف هذا السؤال نهائيًا؟" : "Permanently delete this question?")) return;
    setPending(id);
    try {
      const res = await fetch(`${getApiOrigin()}/api/admin/questions/${encodeURIComponent(id)}`, {
        method: remove ? "DELETE" : "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: remove ? undefined : JSON.stringify({ sourceType: "verified" }),
      });
      if (!res.ok) throw new Error(String(res.status));
      notify("success", remove ? (ar ? "تم حذف السؤال" : "Question deleted") : (ar ? "تم اعتماد السؤال" : "Question verified"));
      if (page > 1 && data?.questions.length === 1) setPage(page - 1);
      else retry();
    } catch {
      notify("error", ar ? "تعذّر حفظ التغيير. حاول مجددًا." : "Couldn’t save the change. Try again.");
    } finally { setPending(null); }
  }

  return <AccountShell title={ar ? "مراجعة الأسئلة" : "Question review"}>
    {error === "access" ? <AdminState ar={ar} error={error} retry={retry} /> : <>
      <div className={review.tools}>
        <nav aria-label={ar ? "حالة السؤال" : "Question status"} className={review.filters}>
          {filters.map(f => <button key={f.id} className={styles.secondary} aria-pressed={f.id === filter}
            onClick={() => { setFilter(f.id); setPage(1); }}>{ar ? f.ar : f.en}</button>)}
        </nav>
        <Link className={styles.textLink} href="/admin/dashboard">{ar ? "إحصائيات الإدارة" : "Admin dashboard"}</Link>
      </div>
      {!data ? <AdminState ar={ar} error={error} retry={retry} /> : <>
        {data.questions.length === 0 && <AccountState title={ar ? "لا توجد أسئلة بهذه الحالة" : "No questions with this status"} />}
        {data.questions.map(q => <article key={q.id} className={`${styles.panel} ${review.question}`}>
          <p className={review.meta}>{[q.category, q.topic, q.subtopic, q.difficulty].filter(Boolean).join(" · ")}</p>
          <div className={review.languages}>
            {(["en", "ar"] as const).map(lang => <div key={lang} lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
              <h2>{lang === "ar" ? q.textAr : q.textEn}</h2>
              <ol>{readAnswers(lang === "ar" ? q.optionsArJson : q.optionsEnJson).map((opt, i) =>
                <li key={i} data-correct={q.correctIndex === i}>{opt} {q.correctIndex === i && <span>✓ <small>{lang === "ar" ? "صحيحة" : "Correct"}</small></span>}</li>)}</ol>
            </div>)}
          </div>
          <div className={review.actions}>
            {q.sourceType !== "verified" && <button className={styles.primary} disabled={Boolean(pending)} onClick={() => moderate(q.id, "verify")}>{ar ? "اعتماد ونشر" : "Verify and publish"}</button>}
            <button className={styles.secondary} disabled={Boolean(pending)} onClick={() => moderate(q.id, "delete")}>{ar ? "حذف السؤال" : "Delete question"}</button>
          </div>
        </article>)}
        {data.pagination.totalPages > 1 && <nav className={review.actions} aria-label={ar ? "صفحات النتائج" : "Results pages"}>
          <button className={styles.secondary} disabled={page <= 1} onClick={() => setPage(page - 1)}>{ar ? "السابق" : "Previous"}</button>
          <bdi>{page} / {data.pagination.totalPages}</bdi>
          <button className={styles.secondary} disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)}>{ar ? "التالي" : "Next"}</button>
        </nav>}
      </>}
    </>}
  </AccountShell>;
}

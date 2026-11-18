"use client";

import Link from "next/link";
import { AccountShell } from "@/components/account/AccountShell";
import styles from "@/components/account/Account.module.css";
import { useGameStore } from "@/store/gameStore";
import { AdminState } from "../AdminState";
import { useAdminResource } from "../useAdminResource";

interface AdminStats {
  totalUsers: number; totalGames: number; totalQuestions: number; activeGames: number; suspiciousUsers: string[];
}

export default function AdminDashboard() {
  const ar = useGameStore(s => s.language) === "ar";
  const { data, error, retry } = useAdminResource<AdminStats>("stats");
  return <AccountShell title={ar ? "إحصائيات الإدارة" : "Admin dashboard"}>
    {!data ? <AdminState ar={ar} error={error} retry={retry} /> : <>
      <section className={styles.panel}><dl className={styles.metrics}>
        {[
          [ar ? "عدد اللاعبين" : "Total players", data.totalUsers],
          [ar ? "المباريات المكتملة" : "Completed matches", data.totalGames],
          [ar ? "عدد الأسئلة" : "Questions", data.totalQuestions],
          [ar ? "المباريات الجارية" : "Live matches", data.activeGames],
        ].map(([label, value]) => <div key={label} className={styles.metric}><dt>{label}</dt><dd>{Number(value).toLocaleString(ar ? "ar" : "en")}</dd></div>)}
      </dl><Link className={styles.textLink} href="/admin">{ar ? "مراجعة الأسئلة" : "Review questions"}</Link></section>
      {data.suspiciousUsers.length > 0 && <section className={styles.panel}><h2>{ar ? "حسابات تتطلب المراجعة" : "Accounts flagged for review"}</h2>
        <ul>{data.suspiciousUsers.map(id => <li key={id}><bdi>{id}</bdi></li>)}</ul></section>}
    </>}
  </AccountShell>;
}

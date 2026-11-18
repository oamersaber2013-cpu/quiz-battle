"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/gameStore";
import { usePlayerStats } from "@/hooks/usePlayerStats";
import { AccountShell, AccountState } from "@/components/account/AccountShell";
import styles from "@/components/account/Account.module.css";

export default function ProfilePage() {
  const router = useRouter();
  const { userId, username, role, isGuest, isSubscribed, language, logout, balanceQar } = useGameStore();
  const { ready, signedIn, stats, failed, needsSignIn, retry } = usePlayerStats();
  const [leaving, setLeaving] = useState(false);
  const ar = language === "ar";
  const number = new Intl.NumberFormat(language);
  const since = stats && Number.isFinite(new Date(stats.memberSince).getTime())
    ? new Date(stats.memberSince).toLocaleDateString(language, { year: "numeric", month: "long" }) : "—";
  async function signOut() { setLeaving(true); await logout(); router.push("/"); }
  return <AccountShell title={ar ? "ملف المحارب" : "Warrior Profile"} active="profile">
    {!ready ? <AccountState title={ar ? "جارٍ تحميل الملف…" : "Loading your profile…"} loading />
      : !userId || !signedIn ? <AccountState title={ar ? "مساحتك تبدأ هنا" : "Your place starts here"}>
        <p>{ar ? "سجّل الدخول لعرض ملفك، أو عد إلى الرئيسية للعب كضيف." : "Sign in to view your profile, or return home to play as a guest."}</p>
        <div className={styles.actions}><Link className={styles.primary} href="/login">{ar ? "تسجيل الدخول" : "Sign in"}</Link><Link className={styles.secondary} href="/">{ar ? "العب كضيف" : "Play as guest"}</Link></div>
      </AccountState> : <>
      {failed && <AccountState error title={needsSignIn ? (ar ? "سجّل الدخول مجدداً" : "Sign in again") : (ar ? "تعذر تحميل إحصائياتك" : "Your statistics could not be loaded")}>
        <p>{needsSignIn ? (ar ? "انتهت صلاحية جلستك. سجّل الدخول لعرض البيانات المحفوظة." : "Your session has expired. Sign in to view your saved data.") : (ar ? "لم تتغير نتائجك المحفوظة. حاول مجدداً عند استعادة الاتصال." : "Your saved results are unchanged. Try again when your connection is available.")}</p>
        <div className={styles.actions}>{needsSignIn ? <Link className={styles.primary} href="/login">{ar ? "تسجيل الدخول" : "Sign in"}</Link> : <button className={styles.secondary} onClick={retry}>{ar ? "أعد المحاولة" : "Retry"}</button>}</div>
      </AccountState>}
      <div className={styles.profileGrid}>
        <section className={styles.panel} aria-labelledby="profile-name">
          <div className={styles.identity}><span className={styles.avatar} aria-hidden="true">{username?.charAt(0).toUpperCase() || "W"}</span><div>
            <h2 id="profile-name">{username || (ar ? "محارب" : "Warrior")}</h2><p className={styles.muted}>{ar ? "عضو منذ" : "Member since"} <bdi>{since}</bdi></p>
          </div></div>
          {!stats && !failed && <p role="status" className={styles.muted}>{ar ? "جارٍ تحميل الإحصائيات…" : "Loading statistics…"}</p>}
          <dl className={styles.metrics}>
            {[[ar ? "المعارك المكتملة" : "Completed battles", stats ? number.format(stats.totalGames) : "—"],
              [ar ? "الانتصارات" : "Wins", stats ? number.format(stats.wins) : "—"],
              [ar ? "الرصيد" : "Balance", `${number.format(balanceQar)} QAR`],
              [ar ? "الحساب" : "Account", isGuest ? (ar ? "ضيف" : "Guest") : (ar ? "مسجّل" : "Registered")]].map(([label, value]) => <div className={styles.metric} key={label}><dt>{label}</dt><dd><bdi>{value}</bdi></dd></div>)}
          </dl>
          <div className={styles.actions}><Link href="/" className={styles.primary}>{ar ? "ابدأ معركة" : "Play now"}</Link><Link href="/stats" className={styles.secondary}>{ar ? "عرض الإحصائيات" : "View statistics"}</Link></div>
        </section>
        <div className={styles.stack}>
          <section className={styles.panel} aria-labelledby="account-status"><h2 id="account-status">{ar ? "حالة الحساب" : "Account status"}</h2>
            <dl className={styles.accountRows}><div><dt>{ar ? "نوع الحساب" : "Account type"}</dt><dd>{isGuest ? (ar ? "ضيف" : "Guest") : role?.toLowerCase() === "admin" ? (ar ? "مسؤول" : "Administrator") : (ar ? "لاعب مسجّل" : "Registered player")}</dd></div>
              <div><dt>{ar ? "الاشتراك" : "Subscription"}</dt><dd>{isSubscribed ? (ar ? "نشط" : "Active") : (ar ? "لا يوجد اشتراك" : "No subscription")}</dd></div></dl>
            <p className={styles.muted}>{ar ? "عمليات الشراء غير متاحة حاليًا." : "Purchases are currently unavailable."}</p>
            <button className={styles.secondary} style={{ marginTop: 20 }} onClick={signOut} disabled={leaving}>{leaving ? (ar ? "جارٍ الخروج…" : "Signing out…") : (ar ? "تسجيل الخروج" : "Sign out")}</button>
          </section>
          <section className={`${styles.panel} ${styles.paper}`} aria-labelledby="earned-achievements"><h2 id="earned-achievements">{ar ? "إنجازاتك" : "Your achievements"}</h2>
            {stats?.achievements.length ? <ul className={styles.achievementList}>{stats.achievements.map(item => <li key={item.nameEn}>{ar ? item.nameAr : item.nameEn}</li>)}</ul>
              : <p>{stats ? (ar ? "ستظهر إنجازاتك هنا عندما تحققها في المعارك." : "Your achievements will appear here as you earn them in battle.") : (ar ? "تظهر الإنجازات بعد تحميل إحصائياتك." : "Achievements appear once your statistics are loaded.")}</p>}
          </section>
        </div>
      </div>
    </>}
  </AccountShell>;
}

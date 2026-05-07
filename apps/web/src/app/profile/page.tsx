"use client";
import { useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

export default function ProfilePage() {
  const router = useRouter();
  const { userId, username, role, isSubscribed, language, logout, balanceQar } = useGameStore();
  const isRTL = language === "ar";

  const T = {
    profile: { en: "Warrior Profile", ar: "ملف المحارب" },
    wins: { en: "Wins", ar: "الانتصارات" },
    subscriber: { en: "⭐ SUBSCRIBER ⭐", ar: "⭐ مشترك مميز ⭐" },
    subscriberDesc: { en: "Unlimited games & premium features", ar: "ألعاب غير محدودة ومميزات حصرية" },
    getCredits: { en: "💎 Get Credits or Subscribe", ar: "💎 احصل على رصيد أو اشترك" },
    accountStatus: { en: "Account Status", ar: "حالة الحساب" },
    signOut: { en: "🚪 Sign Out", ar: "🚪 تسجيل الخروج" },
    viewStats: { en: "📊 View Statistics", ar: "📊 عرض الإحصائيات" },
    balance: { en: "Balance", ar: "الرصيد" },
    memberSince: { en: "Member Since", ar: "عضو منذ" },
    achievements: { en: "Achievements", ar: "الإنجازات" },
    quickActions: { en: "Quick Actions", ar: "إجراءات سريعة" },
    playNow: { en: "⚔️ Play Now", ar: "⚔️ العب الآن" },
    store: { en: "🛒 Store", ar: "🛒 المتجر" },
    spectate: { en: "👁️ Spectate", ar: "👁️ شاهد" },
  };

  useEffect(() => {
    if (!userId) {
      router.push("/");
    }
  }, [userId, router]);

  if (!userId) return null;

  function handleLogout() {
    logout();
    router.push("/");
  }

  // Generate member since date
  const memberSince = new Date().toLocaleDateString(language === "ar" ? "ar-QA" : "en-US", {
    year: "numeric",
    month: "short"
  });

  // Sample achievements (placeholder)
  const achievements = [
    { icon: "🏆", name: { en: "First Victory", ar: "أول انتصار" }, color: "#FFD700" },
    { icon: "⚡", name: { en: "Speed Demon", ar: "شيطان السرعة" }, color: "#00BFFF" },
    { icon: "🎯", name: { en: "Sharp Shooter", ar: "القناص" }, color: "#32CD32" },
  ];

  return (
    <main className="page" dir={isRTL ? "rtl" : "ltr"} style={{ padding: "24px 20px" }}>
      <div className="container" style={{ maxWidth: 700 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}
        >
          <h1 className="font-black text-2xl">{T.profile[language]}</h1>
          <div style={{ display: "flex", gap: 12 }}>
            <Link href="/" className="btn btn-secondary text-sm" style={{ padding: "8px 16px" }}>
              🏠 {isRTL ? "الرئيسية" : "Home"}
            </Link>
            <button onClick={handleLogout} className="btn btn-ghost text-sm" style={{ padding: "8px 16px" }}>
              {T.signOut[language]}
            </button>
          </div>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-8 text-center"
          style={{ marginBottom: 20, position: "relative", overflow: "hidden" }}
        >
          {/* Animated background glow for subscribers */}
          {isSubscribed && (
            <motion.div
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 3 }}
              style={{
                position: "absolute",
                inset: 0,
                background: "radial-gradient(circle at 50% 0%, rgba(255,215,0,0.15), transparent 60%)",
                pointerEvents: "none"
              }}
            />
          )}

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            style={{
              width: 80, height: 80, borderRadius: "50%",
              background: isSubscribed ? "linear-gradient(135deg, #FFD700, #FFA500)" : "var(--grad-primary)",
              margin: "0 auto 16px",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "2.5rem", fontWeight: "bold",
              boxShadow: isSubscribed ? "0 0 30px rgba(255,215,0,0.4)" : "none"
            }}
          >
            {username?.charAt(0).toUpperCase() || "W"}
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold mb-2"
          >
            {username || "Unknown Warrior"}
          </motion.h2>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-sm text-muted mb-4"
          >
            {T.memberSince[language]}: {memberSince}
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginTop: 24 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="glass-card p-4"
              style={{ flex: 1, minWidth: 120 }}
            >
              <div className="text-muted text-xs uppercase tracking-wider mb-1">{isRTL ? "إجمالي المعارك" : "Total Battles"}</div>
              <div className="font-black text-xl">—</div>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="glass-card p-4"
              style={{ flex: 1, minWidth: 120 }}
            >
              <div className="text-muted text-xs uppercase tracking-wider mb-1">{T.wins[language]}</div>
              <div className="font-black text-xl" style={{ color: "var(--clr-gold)" }}>—</div>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="glass-card p-4"
              style={{ flex: 1, minWidth: 120 }}
            >
              <div className="text-muted text-xs uppercase tracking-wider mb-1">{T.balance[language]}</div>
              <div className="font-black text-xl" style={{ color: "var(--clr-primary)" }}>
                {balanceQar.toLocaleString()} QAR
              </div>
            </motion.div>
          </motion.div>

          {/* Subscriber Badge or Store CTA */}
          {isSubscribed ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-6 p-4 text-center"
              style={{ background: "linear-gradient(135deg, #FFD700, #FFA500)", borderRadius: "var(--radius-md)", color: "#000" }}
            >
              <motion.div
                animate={{ textShadow: ["0 0 10px rgba(0,0,0,0.2)", "0 0 20px rgba(0,0,0,0.4)", "0 0 10px rgba(0,0,0,0.2)"] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="font-bold"
              >
                {T.subscriber[language]}
              </motion.div>
              <div className="text-sm opacity-80">{T.subscriberDesc[language]}</div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-6 text-center"
            >
              <Link href="/store" className="btn btn-secondary btn-lg w-full">
                {T.getCredits[language]}
              </Link>
            </motion.div>
          )}
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-card p-6 mb-4"
        >
          <h3 className="font-bold mb-4">{T.quickActions[language]}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link href="/game/play" className="btn btn-primary w-full text-center p-4">
                {T.playNow[language]}
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link href="/store" className="btn btn-secondary w-full text-center p-4">
                {T.store[language]}
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link href="/spectate" className="btn btn-ghost w-full text-center p-4" style={{ border: "1px solid var(--clr-border)" }}>
                {T.spectate[language]}
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Achievements Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="glass-card p-6 mb-4"
        >
          <h3 className="font-bold mb-4">{T.achievements[language]}</h3>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: isRTL ? "flex-end" : "flex-start" }}>
            {achievements.map((achievement, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.9 + index * 0.1 }}
                whileHover={{ scale: 1.1, rotate: 5 }}
                className="flex flex-col items-center p-3 rounded-xl bg-white/5 border border-white/10"
                style={{ minWidth: 80 }}
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ repeat: Infinity, duration: 2, delay: index * 0.3 }}
                  style={{ fontSize: "2rem", filter: `drop-shadow(0 0 8px ${achievement.color})` }}
                >
                  {achievement.icon}
                </motion.div>
                <span className="text-xs text-muted mt-1 text-center">{achievement.name[language]}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Account Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="glass-card p-6 mb-4"
        >
          <h3 className="font-bold mb-4">{T.accountStatus[language]}</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="text-muted">{isRTL ? "نوع الحساب" : "Account Type"}</span>
              <span className="font-bold px-3 py-1 rounded-full bg-white/10">{role || "WARRIOR"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="text-muted">{isRTL ? "الاشتراك" : "Subscription"}</span>
              <span className="font-bold px-3 py-1 rounded-full" style={{
                color: isSubscribed ? "#000" : "inherit",
                background: isSubscribed ? "linear-gradient(135deg, #FFD700, #FFA500)" : "rgba(255,255,255,0.1)"
              }}>
                {isSubscribed ? (isRTL ? "⭐ نشط" : "⭐ Active") : (isRTL ? "لا يوجد" : "None")}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Stats Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
        >
          <Link
            href="/stats"
            className="glass-card p-6 mb-20 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <motion.span
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-2xl"
              >
                📊
              </motion.span>
              <div>
                <div className="font-bold">{isRTL ? "إحصائياتك" : "Your Statistics"}</div>
                <div className="text-sm text-muted">{isRTL ? "عرض تفاصيل أدائك" : "View your performance details"}</div>
              </div>
            </div>
            <motion.span
              animate={{ x: isRTL ? [-5, 0, -5] : [0, 5, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-2xl"
            >
              {isRTL ? "←" : "→"}
            </motion.span>
          </Link>
        </motion.div>
      </div>
    </main>
  );
}

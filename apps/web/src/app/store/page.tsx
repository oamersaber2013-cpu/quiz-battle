"use client";
import { useGameStore } from "@/store/gameStore";
import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TIME_PASSES: Array<{
  id: string;
  name: { en: string; ar: string };
  price: string;
  duration: string;
  icon: string;
  popular?: boolean;
  paypalLink?: string;
}> = [
  { id: "1d", name: { en: "1 Day Pass", ar: "تذكرة يوم" }, price: "20", duration: "1 day", icon: "⏳" },
  { id: "3d", name: { en: "3 Day Pass", ar: "تذكرة ٣ أيام" }, price: "50", duration: "3 days", icon: "🕒" },
  { id: "7d", name: { en: "7 Day Pass", ar: "تذكرة ٧ أيام" }, price: "100", duration: "7 days", icon: "🗓️" },
  { id: "14d", name: { en: "14 Day Pass", ar: "تذكرة ١٤ يوم" }, price: "180", duration: "14 days", icon: "🌓" },
  { id: "30d", name: { en: "30 Day Pass", ar: "تذكرة ٣٠ يوم" }, price: "350", duration: "30 days", icon: "🌕", popular: true },
  { id: "3m", name: { en: "3 Month Pass", ar: "تذكرة ٣ أشهر" }, price: "900", duration: "3 months", icon: "🏰" },
  { id: "6m", name: { en: "6 Month Pass", ar: "تذكرة ٦ أشهر" }, price: "1600", duration: "6 months", icon: "👑" },
  { id: "1y", name: { en: "1 Year Pass", ar: "تذكرة سنة" }, price: "2500", duration: "1 year", icon: "💎" },
];

const GAME_PACKS = [
  { amount: 1, name: { en: "1 Battle", ar: "معركة واحدة" }, price: "10", icon: "⚔️", paypalLink: "https://www.paypal.com/ncp/payment/GTKK7X5UZXWZG" },
  { amount: 3, name: { en: "3 Battles", ar: "٣ معارك" }, price: "25", icon: "⚔️⚔️", popular: true, paypalLink: "https://www.paypal.com/ncp/payment/YOUR_LINK_HERE" },
  { amount: 9, name: { en: "9 Battles", ar: "٩ معارك" }, price: "75", icon: "🛡️", paypalLink: "https://www.paypal.com/ncp/payment/YOUR_LINK_HERE" },
  { amount: 15, name: { en: "15 Battles", ar: "١٥ معركة" }, price: "120", icon: "🔥", paypalLink: "https://www.paypal.com/ncp/payment/YOUR_LINK_HERE" },
  { amount: 30, name: { en: "30 Battles", ar: "٣٠ معركة" }, price: "200", icon: "🌋", paypalLink: "https://www.paypal.com/ncp/payment/YOUR_LINK_HERE" },
];

export default function StorePage() {
  const { language, addToast } = useGameStore();
  const [tab, setTab] = useState<"time" | "games">("time");
  const isRTL = language === "ar";

  const handlePurchase = (link: string | undefined) => {
    if (!link || link.includes("YOUR_LINK_HERE")) {
      addToast("info", isRTL ? "سيتم توفير رابط الدفع قريباً" : "Payment link coming soon");
      return;
    }
    window.open(link, "_blank");
  };

  const T = {
    storeTitle: { en: "The Royal Treasury", ar: "الخزينة الملكية" },
    timeTab: { en: "Unlimited Passes", ar: "تذاكر غير محدودة" },
    gameTab: { en: "Battle Packs", ar: "حزم المعارك" },
    unlimitedDesc: { en: "Unlimited play for the selected duration", ar: "لعب غير محدود للمدة المختارة" },
    packDesc: { en: "Pay-as-you-go battle tokens", ar: "رموز معارك حسب الاستخدام" },
    buyNow: { en: "Purchase", ar: "شراء الآن" },
  };

  return (
    <main className="page" dir={isRTL ? "rtl" : "ltr"} style={{ background: "var(--clr-bg)", padding: "40px 20px" }}>
      <div className="container" style={{ maxWidth: 1000 }}>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 50 }}
        >
          <Link href="/" className="btn btn-ghost">
            {isRTL ? "← عودة" : "← Back"}
          </Link>
          <motion.h1
            className="text-3xl font-black"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            style={{ background: "var(--grad-primary)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            {T.storeTitle[language]}
          </motion.h1>
          <div style={{ width: 40 }} />
        </motion.div>

        {/* Tab Switcher */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ display: "flex", gap: 10, background: "rgba(255,255,255,0.05)", padding: 6, borderRadius: 16, maxWidth: 500, margin: "0 auto 60px" }}
        >
          <motion.button
            onClick={() => setTab("time")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: 12,
              background: tab === "time" ? "var(--grad-primary)" : "transparent",
              color: tab === "time" ? "white" : "var(--clr-text-2)",
              fontWeight: 800,
              border: "none",
              cursor: "pointer",
              transition: "all 0.3s"
            }}
          >
            {T.timeTab[language]}
          </motion.button>
          <motion.button
            onClick={() => setTab("games")}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              flex: 1,
              padding: "14px",
              borderRadius: 12,
              background: tab === "games" ? "var(--grad-primary)" : "transparent",
              color: tab === "games" ? "white" : "var(--clr-text-2)",
              fontWeight: 800,
              border: "none",
              cursor: "pointer",
              transition: "all 0.3s"
            }}
          >
            {T.gameTab[language]}
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
          style={{ marginBottom: 40 }}
        >
          <h2 className="text-2xl font-bold">{tab === "time" ? T.timeTab[language] : T.gameTab[language]}</h2>
          <p className="text-muted">{tab === "time" ? T.unlimitedDesc[language] : T.packDesc[language]}</p>
        </motion.div>

        {/* Grid Display with Animations */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}
          >
            {tab === "time" ? (
              TIME_PASSES.map((pass, index) => (
                <motion.div
                  key={pass.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.03, y: -5 }}
                  className={`glass-card p-6 ${pass.popular ? "popular-card" : ""}`}
                  style={{
                    textAlign: "center",
                    position: "relative",
                    border: pass.popular ? "2px solid var(--clr-gold)" : "1px solid var(--clr-border)",
                    boxShadow: pass.popular ? "0 0 30px rgba(255,215,0,0.15)" : "none",
                    cursor: "pointer"
                  }}
                >
                  {pass.popular && (
                    <motion.div
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "var(--clr-gold)", color: "black", padding: "4px 16px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 900 }}
                    >
                      ⭐ BEST VALUE
                    </motion.div>
                  )}
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 2, delay: index * 0.2 }}
                    style={{ fontSize: "2.5rem", marginBottom: 16 }}
                  >
                    {pass.icon}
                  </motion.div>
                  <div style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: 10 }}>{pass.name[language]}</div>
                  <div style={{ fontSize: "2rem", fontWeight: 900, marginBottom: 20, color: pass.popular ? "var(--clr-gold)" : "inherit" }}>
                    QAR {pass.price}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="btn btn-primary w-full"
                    onClick={() => handlePurchase(pass.paypalLink)}
                    style={{ background: pass.popular ? "var(--clr-gold)" : "var(--grad-primary)", color: pass.popular ? "black" : "white" }}
                  >
                    {T.buyNow[language]}
                  </motion.button>
                </motion.div>
              ))
            ) : (
              GAME_PACKS.map((pack, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.03, y: -5 }}
                  className={`glass-card p-6 ${pack.popular ? "popular-card" : ""}`}
                  style={{
                    textAlign: "center",
                    border: pack.popular ? "2px solid var(--clr-primary)" : "1px solid var(--clr-border)",
                    boxShadow: pack.popular ? "0 0 20px rgba(108,99,255,0.15)" : "none",
                    cursor: "pointer"
                  }}
                >
                  {pack.popular && (
                    <motion.div
                      initial={{ y: -20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: "var(--clr-primary)", color: "white", padding: "4px 16px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 900 }}
                    >
                      🔥 POPULAR
                    </motion.div>
                  )}
                  <motion.div
                    animate={pack.popular ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    style={{ fontSize: "2.5rem", marginBottom: 16 }}
                  >
                    {pack.icon}
                  </motion.div>
                  <div style={{ fontWeight: 800, fontSize: "1.1rem", marginBottom: 10 }}>{pack.name[language]}</div>
                  <div style={{ fontSize: "2rem", fontWeight: 900, marginBottom: 20 }}>QAR {pack.price}</div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="btn btn-primary w-full"
                    onClick={() => handlePurchase(pack.paypalLink)}
                  >
                    {T.buyNow[language]}
                  </motion.button>
                </motion.div>
              ))
            )}
          </motion.div>
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ marginTop: 80, textAlign: "center" }}
        >
          <div style={{ display: "flex", justifyContent: "center", gap: 30, opacity: 0.6 }}>
             {/* Payment Icons */}
             <motion.div whileHover={{ scale: 1.2, filter: "grayscale(0)" }} style={{ fontSize: "2rem", cursor: "pointer" }}>💳</motion.div>
             <motion.div whileHover={{ scale: 1.2, filter: "grayscale(0)" }} style={{ fontSize: "2rem", cursor: "pointer" }}>🍎</motion.div>
             <motion.div whileHover={{ scale: 1.2, filter: "grayscale(0)" }} style={{ fontSize: "2rem", cursor: "pointer" }}>🅿️</motion.div>
          </div>
          <p className="text-muted text-sm mt-6">
            {isRTL
              ? "سيتم تفعيل الرصيد فوراً بعد الدفع. جميع العمليات آمنة ومشفرة."
              : "Balance will be activated immediately after payment. All transactions are secure & encrypted."}
          </p>
        </motion.div>
      </div>
    </main>
  );
}

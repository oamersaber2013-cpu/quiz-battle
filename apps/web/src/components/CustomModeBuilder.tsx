"use client";

import { useEffect } from "react";
import { Difficulty, PowerUpType, getPlayableDifficulties, type CustomGameSettings } from "@quiz-battle/shared";

const difficulties = [
  [Difficulty.Novice, "Novice", "مبتدئ"], [Difficulty.Scholar, "Scholar", "باحث"],
  [Difficulty.Sage, "Sage", "حكيم"], [Difficulty.Master, "Master", "خبير"],
  [Difficulty.Legend, "Legend", "أسطورة"],
] as const;
const powers = [
  [PowerUpType.Shield, "Shield", "درع"], [PowerUpType.FiftyFifty, "50/50", "حذف إجابتين"],
  [PowerUpType.Freeze, "Freeze", "تجميد"], [PowerUpType.DoubleDown, "Double points", "مضاعفة النقاط"],
  [PowerUpType.Steal, "Steal", "سرقة"],
  [PowerUpType.Sandstorm, "Sandstorm", "عاصفة"], [PowerUpType.TimeWarp, "Time Warp", "وقت إضافي"],
  [PowerUpType.Whole, "Whole", "ثقب"],
] as const;
const categories = [
  ["general", "General knowledge", "معلومات عامة"], ["islamic", "Islamic knowledge", "الثقافة الإسلامية"],
  ["science", "Science", "العلوم"], ["technology", "Technology", "التكنولوجيا"],
  ["history", "History", "التاريخ"], ["geography", "Geography", "الجغرافيا"],
  ["sports", "Sports", "الرياضة"], ["anime", "Anime", "الأنمي"],
] as const;

export function CustomModeBuilder({ value, onChange, language = "en", selectedCategories = ["general"] }: {
  value: CustomGameSettings;
  onChange: (value: CustomGameSettings) => void;
  language?: "en" | "ar";
  selectedCategories?: string[];
}) {
  const isAr = language === "ar";
  const playable = getPlayableDifficulties(value.categoryFilter ? [value.categoryFilter] : selectedCategories);
  useEffect(() => {
    if (playable.length && !playable.includes(value.difficulty)) onChange({ ...value, difficulty: playable[0] });
  }, [value, onChange, playable.join(",")]);
  const update = <K extends keyof CustomGameSettings>(key: K, next: CustomGameSettings[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <section className="glass-card p-5" aria-labelledby="custom-settings-heading" dir={isAr ? "rtl" : "ltr"}>
      <h2 id="custom-settings-heading" className="text-xl font-bold mb-4">
        {isAr ? "إعدادات المعركة المخصصة" : "Custom battle settings"}
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 16 }}>
        <label htmlFor="custom-name">
          {isAr ? "اسم المعركة" : "Battle name"}
          <input id="custom-name" className="input mt-2" maxLength={60} value={value.name}
            onChange={event => update("name", event.target.value)} />
        </label>
        <label htmlFor="custom-rounds">
          {isAr ? "عدد الجولات" : "Number of rounds"}
          <input id="custom-rounds" className="input mt-2" type="number" min={1} max={30} value={value.rounds}
            onChange={event => update("rounds", Math.max(1, Math.min(30, Number(event.target.value) || 1)))} />
        </label>
        <label htmlFor="custom-time">
          {isAr ? "ثواني لكل سؤال" : "Seconds per question"}
          <select id="custom-time" className="input mt-2" value={value.timePerQuestion}
            onChange={event => update("timePerQuestion", Number(event.target.value))}>
            {[5, 10, 15, 20, 30, 45, 60].map(seconds => <option key={seconds} value={seconds}>{seconds}</option>)}
          </select>
        </label>
        <label htmlFor="custom-difficulty">
          {isAr ? "الصعوبة" : "Difficulty"}
          <select id="custom-difficulty" className="input mt-2" value={value.difficulty}
            onChange={event => update("difficulty", event.target.value as Difficulty)}>
            {difficulties.filter(([difficulty]) => playable.includes(difficulty)).map(([difficulty, en, ar]) => <option key={difficulty} value={difficulty}>{isAr ? ar : en}</option>)}
          </select>
        </label>
        <label htmlFor="custom-player-limit">
          {isAr ? "الحد الأقصى للاعبين" : "Player limit"}
          <input id="custom-player-limit" className="input mt-2" type="number" min={2} max={20} value={value.maxPlayers}
            onChange={event => update("maxPlayers", Math.max(2, Math.min(20, Number(event.target.value) || 2)))} />
        </label>
        <label htmlFor="custom-category">
          {isAr ? "قسم الأسئلة" : "Question category"}
          <select id="custom-category" className="input mt-2" value={value.categoryFilter || ""}
            onChange={event => update("categoryFilter", event.target.value || null)}>
            <option value="">{isAr ? "الأقسام المختارة سابقاً" : "Previously selected categories"}</option>
            {categories.map(([id, en, ar]) => <option key={id} value={id}>{isAr ? ar : en}</option>)}
          </select>
        </label>
      </div>
      <p className="text-muted text-sm mt-3">{isAr ? "تظهر مستويات الصعوبة التي تتوفر لها أسئلة محلية في الأقسام المحددة." : "Difficulty choices match local questions in the selected categories."}</p>
      {!playable.length && <p role="alert">{isAr ? "لا يوجد مستوى مشترك لهذه الأقسام. اختر معلومات متنوعة أو قسماً آخر." : "These categories have no shared difficulty. Choose mixed trivia or another category."}</p>}
      <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={() => update("categoryFilter", "general")}>
        {isAr ? "استخدام معلومات متنوعة" : "Use mixed trivia"}
      </button>
      <fieldset className="mt-6">
        <legend className="font-bold mb-3">{isAr ? "القوى المتاحة" : "Available powers"}</legend>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))", gap: 12 }}>
          {powers.map(([power, en, ar]) => <label key={power} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={value.enabledPowerUps.includes(power)} onChange={() =>
              update("enabledPowerUps", value.enabledPowerUps.includes(power)
                ? value.enabledPowerUps.filter(selected => selected !== power) : [...value.enabledPowerUps, power])} />
            {isAr ? ar : en}
          </label>)}
        </div>
        <button type="button" className="btn btn-ghost btn-sm mt-3" onClick={() => update("enabledPowerUps", [])}>
          {isAr ? "تعطيل جميع القوى" : "Disable all powers"}
        </button>
      </fieldset>
    </section>
  );
}

export default CustomModeBuilder;

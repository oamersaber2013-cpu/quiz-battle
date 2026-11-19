"use client";

import { useEffect, useState } from "react";
import { Difficulty, PowerUpType, getPlayableDifficulties, type CustomGameSettings } from "@quiz-battle/shared";
import { POWER_UP_INFO } from "./powerUpPresentation";

const difficulties = [
  [Difficulty.Novice, "Novice", "مبتدئ"], [Difficulty.Scholar, "Scholar", "باحث"],
  [Difficulty.Sage, "Sage", "حكيم"], [Difficulty.Master, "Master", "خبير"],
  [Difficulty.Legend, "Legend", "أسطورة"],
] as const;
const powers = [
  PowerUpType.Shield, PowerUpType.FiftyFifty, PowerUpType.Freeze, PowerUpType.DoubleDown,
  PowerUpType.Steal, PowerUpType.Sandstorm, PowerUpType.TimeWarp, PowerUpType.Whole,
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
  const [roundsDraft, setRoundsDraft] = useState(String(value.rounds));
  const [playerLimitDraft, setPlayerLimitDraft] = useState(String(value.maxPlayers));
  useEffect(() => setRoundsDraft(String(value.rounds)), [value.rounds]);
  useEffect(() => setPlayerLimitDraft(String(value.maxPlayers)), [value.maxPlayers]);
  const playable = getPlayableDifficulties(value.categoryFilter ? [value.categoryFilter] : selectedCategories);
  useEffect(() => {
    if (playable.length && !playable.includes(value.difficulty)) onChange({ ...value, difficulty: playable[0] });
  }, [value, onChange, playable.join(",")]);
  const update = <K extends keyof CustomGameSettings>(key: K, next: CustomGameSettings[K]) =>
    onChange({ ...value, [key]: next });
  const commitInteger = (key: "rounds" | "maxPlayers", draft: string) => {
    const [min, max] = key === "rounds" ? [1, 30] : [2, 20];
    const parsed = draft.trim() ? Number(draft) : NaN;
    const next = Number.isFinite(parsed) ? Math.max(min, Math.min(max, Math.trunc(parsed))) : value[key];
    if (key === "rounds") setRoundsDraft(String(next));
    else setPlayerLimitDraft(String(next));
    if (next !== value[key]) update(key, next);
  };

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
          <input id="custom-rounds" className="input mt-2" type="number" inputMode="numeric" min={1} max={30} step={1} value={roundsDraft}
            onChange={event => setRoundsDraft(event.target.value)}
            onBlur={event => commitInteger("rounds", event.currentTarget.value)}
            onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} />
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
          <input id="custom-player-limit" className="input mt-2" type="number" inputMode="numeric" min={2} max={20} step={1} value={playerLimitDraft}
            onChange={event => setPlayerLimitDraft(event.target.value)}
            onBlur={event => commitInteger("maxPlayers", event.currentTarget.value)}
            onKeyDown={event => { if (event.key === "Enter") event.currentTarget.blur(); }} />
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
          {powers.map(power => <label key={power} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={value.enabledPowerUps.includes(power)} onChange={() =>
              update("enabledPowerUps", value.enabledPowerUps.includes(power)
                ? value.enabledPowerUps.filter(selected => selected !== power) : [...value.enabledPowerUps, power])} />
            {POWER_UP_INFO[power].label[language]}
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

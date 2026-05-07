"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PowerUpType, Difficulty } from "@quiz-battle/shared";

// ═══════════════════════════════════════════════════════════════════════════════
// CUSTOM MODE BUILDER - Host configuration panel for custom game settings
// ═══════════════════════════════════════════════════════════════════════════════

export interface CustomGameConfig {
  name: string;
  rounds: number;
  timePerQuestion: number;
  difficulty: Difficulty;
  enabledPowerUps: PowerUpType[];
  teamSize: number;
  maxPlayers: number;
  allowLateJoin: boolean;
  showLeaderboard: boolean;
  categoryFilter: string | null;
}

const DEFAULT_CONFIG: CustomGameConfig = {
  name: "Custom Battle",
  rounds: 10,
  timePerQuestion: 15,
  difficulty: Difficulty.Scholar,
  enabledPowerUps: [
    PowerUpType.Shield,
    PowerUpType.FiftyFifty,
    PowerUpType.DoubleDown,
    PowerUpType.Freeze,
    PowerUpType.Sandstorm,
    PowerUpType.Steal,
  ],
  teamSize: 2,
  maxPlayers: 8,
  allowLateJoin: false,
  showLeaderboard: true,
  categoryFilter: null,
};

const POWER_UP_CONFIG = {
  [PowerUpType.Shield]: {
    icon: "🛡️",
    name: { en: "Shield", ar: "درع" },
    color: "#3b82f6",
  },
  [PowerUpType.FiftyFifty]: {
    icon: "✂️",
    name: { en: "50/50", ar: "٥٠/٥٠" },
    color: "#8b5cf6",
  },
  [PowerUpType.Freeze]: {
    icon: "❄️",
    name: { en: "Freeze", ar: "تجميد" },
    color: "#06b6d4",
  },
  [PowerUpType.DoubleDown]: {
    icon: "💥",
    name: { en: "Double", ar: "مضاعف" },
    color: "#ef4444",
  },
  [PowerUpType.Steal]: {
    icon: "🦹",
    name: { en: "Steal", ar: "سرقة" },
    color: "#ec4899",
  },
  [PowerUpType.DoublePick]: {
    icon: "✌️",
    name: { en: "2 Pick", ar: "خيارين" },
    color: "#22c55e",
  },
  [PowerUpType.Sandstorm]: {
    icon: "🌪️",
    name: { en: "Sandstorm", ar: "عاصفة" },
    color: "#d97706",
  },
  [PowerUpType.TimeWarp]: {
    icon: "⏳",
    name: { en: "Time", ar: "وقت" },
    color: "#f97316",
  },
  [PowerUpType.Whole]: {
    icon: "🌀",
    name: { en: "Whole", ar: "ثقب" },
    color: "#a855f7",
  },
};

interface CustomModeBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: CustomGameConfig) => void;
  initialConfig?: Partial<CustomGameConfig>;
  language?: "en" | "ar";
}

export function CustomModeBuilder({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  language = "en",
}: CustomModeBuilderProps) {
  const isAr = language === "ar";
  const [config, setConfig] = useState<CustomGameConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });
  const [activeTab, setActiveTab] = useState<"basic" | "powerups" | "advanced">("basic");
  const [savedPresets, setSavedPresets] = useState<CustomGameConfig[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [presetName, setPresetName] = useState("");

  const updateConfig = useCallback(<K extends keyof CustomGameConfig>(
    key: K,
    value: CustomGameConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const togglePowerUp = useCallback((powerUp: PowerUpType) => {
    setConfig((prev) => {
      const isEnabled = prev.enabledPowerUps.includes(powerUp);
      return {
        ...prev,
        enabledPowerUps: isEnabled
          ? prev.enabledPowerUps.filter((p) => p !== powerUp)
          : [...prev.enabledPowerUps, powerUp],
      };
    });
  }, []);

  const savePreset = useCallback(() => {
    if (presetName.trim()) {
      setSavedPresets((prev) => [...prev, { ...config, name: presetName }]);
      setShowSaveDialog(false);
      setPresetName("");
    }
  }, [config, presetName]);

  const loadPreset = useCallback((preset: CustomGameConfig) => {
    setConfig(preset);
  }, []);

  const handleSave = useCallback(() => {
    onSave(config);
    onClose();
  }, [config, onSave, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-2xl bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-700"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-6 border-b border-gray-800 bg-gradient-to-r from-purple-900/50 to-blue-900/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                  <span className="text-3xl">⚙️</span>
                  {isAr ? "إعدادات مخصصة" : "Custom Mode Builder"}
                </h2>
                <p className="text-gray-400 mt-1 text-sm">
                  {isAr 
                    ? "قم بتخصيص إعدادات اللعبة كما تريد" 
                    : "Configure your perfect battle settings"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mt-6">
              {(["basic", "powerups", "advanced"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    px-4 py-2 rounded-xl text-sm font-bold transition-all
                    ${activeTab === tab 
                      ? "bg-white/20 text-white" 
                      : "text-gray-400 hover:text-white hover:bg-white/10"
                    }
                  `}
                >
                  {tab === "basic" && (isAr ? "أساسي" : "Basic")}
                  {tab === "powerups" && (isAr ? "القوى" : "Power-ups")}
                  {tab === "advanced" && (isAr ? "متقدم" : "Advanced")}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            {/* BASIC TAB */}
            {activeTab === "basic" && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Game Name */}
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">
                    {isAr ? "اسم اللعبة" : "Game Name"}
                  </label>
                  <input
                    type="text"
                    value={config.name}
                    onChange={(e) => updateConfig("name", e.target.value)}
                    className="w-full px-4 py-3 bg-gray-800 rounded-xl border border-gray-700 text-white focus:border-purple-500 focus:outline-none transition-colors"
                    placeholder={isAr ? "أدخل اسم اللعبة" : "Enter game name"}
                  />
                </div>

                {/* Rounds Slider */}
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-bold text-gray-300">
                      {isAr ? "عدد الجولات" : "Number of Rounds"}
                    </label>
                    <span className="text-purple-400 font-bold">{config.rounds}</span>
                  </div>
                  <input
                    type="range"
                    min={3}
                    max={30}
                    value={config.rounds}
                    onChange={(e) => updateConfig("rounds", parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>3</span>
                    <span>30</span>
                  </div>
                </div>

                {/* Time Per Question */}
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-bold text-gray-300">
                      {isAr ? "الوقت لكل سؤال" : "Time Per Question"}
                    </label>
                    <span className="text-purple-400 font-bold">{config.timePerQuestion}s</span>
                  </div>
                  <div className="flex gap-2">
                    {[5, 10, 15, 20, 30, 45, 60].map((time) => (
                      <button
                        key={time}
                        onClick={() => updateConfig("timePerQuestion", time)}
                        className={`
                          px-3 py-2 rounded-lg text-sm font-bold transition-all
                          ${config.timePerQuestion === time
                            ? "bg-purple-500 text-white"
                            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                          }
                        `}
                      >
                        {time}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">
                    {isAr ? "الصعوبة" : "Difficulty"}
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { value: Difficulty.Novice, label: { en: "Novice", ar: "مبتدئ" }, color: "#00e676" },
                      { value: Difficulty.Scholar, label: { en: "Scholar", ar: "باحث" }, color: "#00d4ff" },
                      { value: Difficulty.Sage, label: { en: "Sage", ar: "حكيم" }, color: "#ffa502" },
                      { value: Difficulty.Master, label: { en: "Master", ar: "خبير" }, color: "#ff6b6b" },
                      { value: Difficulty.Legend, label: { en: "Legend", ar: "أسطورة" }, color: "#ffd700" },
                    ].map((diff) => (
                      <button
                        key={diff.value}
                        onClick={() => updateConfig("difficulty", diff.value)}
                        className={`
                          p-3 rounded-xl text-center transition-all border-2
                          ${config.difficulty === diff.value
                            ? "border-white bg-white/10"
                            : "border-transparent bg-gray-800 hover:bg-gray-700"
                          }
                        `}
                        style={{
                          boxShadow: config.difficulty === diff.value ? `0 0 20px ${diff.color}40` : "none",
                        }}
                      >
                        <div 
                          className="w-4 h-4 rounded-full mx-auto mb-1"
                          style={{ background: diff.color }}
                        />
                        <div className="text-xs font-bold" style={{ color: diff.color }}>
                          {isAr ? diff.label.ar : diff.label.en}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* POWER-UPS TAB */}
            {activeTab === "powerups" && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-400">
                    {isAr 
                      ? `مفعل: ${config.enabledPowerUps.length} قوى` 
                      : `Enabled: ${config.enabledPowerUps.length} power-ups`}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateConfig("enabledPowerUps", Object.values(PowerUpType))}
                      className="px-3 py-1 rounded-lg bg-gray-800 text-xs font-bold text-gray-400 hover:text-white transition-colors"
                    >
                      {isAr ? "الكل" : "All"}
                    </button>
                    <button
                      onClick={() => updateConfig("enabledPowerUps", [])}
                      className="px-3 py-1 rounded-lg bg-gray-800 text-xs font-bold text-gray-400 hover:text-white transition-colors"
                    >
                      {isAr ? "لا شيء" : "None"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(POWER_UP_CONFIG).map(([type, powerUp]) => {
                    const isEnabled = config.enabledPowerUps.includes(type as PowerUpType);
                    return (
                      <motion.button
                        key={type}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => togglePowerUp(type as PowerUpType)}
                        className={`
                          relative p-4 rounded-xl border-2 transition-all text-left
                          ${isEnabled 
                            ? "border-current bg-current/10" 
                            : "border-gray-700 bg-gray-800 opacity-50"
                          }
                        `}
                        style={{ color: isEnabled ? powerUp.color : undefined }}
                      >
                        <div className="text-3xl mb-2">{powerUp.icon}</div>
                        <div className="font-bold text-sm">
                          {isAr ? powerUp.name.ar : powerUp.name.en}
                        </div>
                        {isEnabled && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-current flex items-center justify-center"
                          >
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ADVANCED TAB */}
            {activeTab === "advanced" && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Team Size */}
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-bold text-gray-300">
                      {isAr ? "حجم الفريق" : "Team Size"}
                    </label>
                    <span className="text-purple-400 font-bold">
                      {config.teamSize}v{config.teamSize}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={config.teamSize}
                    onChange={(e) => updateConfig("teamSize", parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>

                {/* Max Players */}
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm font-bold text-gray-300">
                      {isAr ? "الحد الأقصى للاعبين" : "Max Players"}
                    </label>
                    <span className="text-purple-400 font-bold">{config.maxPlayers}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {[4, 6, 8, 10, 12, 16, 20].map((num) => (
                      <button
                        key={num}
                        onClick={() => updateConfig("maxPlayers", num)}
                        className={`
                          px-4 py-2 rounded-lg text-sm font-bold transition-all
                          ${config.maxPlayers === num
                            ? "bg-purple-500 text-white"
                            : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                          }
                        `}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggle Options */}
                <div className="space-y-3">
                  {[
                    { key: "allowLateJoin" as const, icon: "🚪", label: { en: "Allow Late Join", ar: "السماح بالانضمام المتأخر" } },
                    { key: "showLeaderboard" as const, icon: "📊", label: { en: "Show Live Leaderboard", ar: "عرض لوحة الصدارة" } },
                  ].map((option) => (
                    <button
                      key={option.key}
                      onClick={() => updateConfig(option.key, !config[option.key])}
                      className="w-full flex items-center justify-between p-4 bg-gray-800 rounded-xl hover:bg-gray-750 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{option.icon}</span>
                        <span className="font-bold text-gray-300">
                          {isAr ? option.label.ar : option.label.en}
                        </span>
                      </div>
                      <div
                        className={`
                          w-12 h-6 rounded-full transition-colors relative
                          ${config[option.key] ? "bg-purple-500" : "bg-gray-600"}
                        `}
                      >
                        <div
                          className={`
                            absolute top-1 w-4 h-4 rounded-full bg-white transition-all
                            ${config[option.key] ? "left-7" : "left-1"}
                          `}
                        />
                      </div>
                    </button>
                  ))}
                </div>

                {/* Saved Presets */}
                {savedPresets.length > 0 && (
                  <div className="pt-4 border-t border-gray-800">
                    <label className="block text-sm font-bold text-gray-300 mb-2">
                      {isAr ? "الإعدادات المحفوظة" : "Saved Presets"}
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {savedPresets.map((preset, idx) => (
                        <button
                          key={idx}
                          onClick={() => loadPreset(preset)}
                          className="px-3 py-2 rounded-lg bg-gray-800 text-sm text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                        >
                          {preset.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-800 bg-gray-900/50 flex items-center justify-between">
            <button
              onClick={() => setShowSaveDialog(true)}
              className="px-4 py-2 rounded-xl bg-gray-800 text-gray-400 hover:text-white font-bold text-sm transition-colors flex items-center gap-2"
            >
              <span>💾</span>
              {isAr ? "حفظ الإعداد" : "Save Preset"}
            </button>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-xl bg-gray-800 text-white font-bold hover:bg-gray-700 transition-colors"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold hover:from-purple-600 hover:to-blue-600 transition-colors shadow-lg shadow-purple-500/25"
              >
                {isAr ? "إنشاء اللعبة" : "Create Game"}
              </button>
            </div>
          </div>

          {/* Save Preset Dialog */}
          <AnimatePresence>
            {showSaveDialog && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl"
              >
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.9 }}
                  className="bg-gray-800 p-6 rounded-2xl w-full max-w-sm mx-4"
                >
                  <h3 className="text-lg font-bold text-white mb-4">
                    {isAr ? "حفظ الإعداد" : "Save Preset"}
                  </h3>
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder={isAr ? "اسم الإعداد" : "Preset name"}
                    className="w-full px-4 py-3 bg-gray-900 rounded-xl border border-gray-700 text-white focus:border-purple-500 focus:outline-none mb-4"
                    onKeyDown={(e) => e.key === "Enter" && savePreset()}
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowSaveDialog(false)}
                      className="flex-1 px-4 py-2 rounded-xl bg-gray-700 text-white font-bold hover:bg-gray-600 transition-colors"
                    >
                      {isAr ? "إلغاء" : "Cancel"}
                    </button>
                    <button
                      onClick={savePreset}
                      disabled={!presetName.trim()}
                      className="flex-1 px-4 py-2 rounded-xl bg-purple-500 text-white font-bold hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAr ? "حفظ" : "Save"}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default CustomModeBuilder;

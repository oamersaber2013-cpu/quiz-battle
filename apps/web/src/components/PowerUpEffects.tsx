"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PowerUpType, ActivePowerUpEffect } from "@quiz-battle/shared";

// ═══════════════════════════════════════════════════════════════════════════════
// POWER-UP VISUAL EFFECTS - In-game animations when power-ups are activated
// ═══════════════════════════════════════════════════════════════════════════════

interface PowerUpEffectsProps {
  activeEffects: ActivePowerUpEffect[];
  currentUserId: string;
  onEffectComplete: (id: string) => void;
}

// Effect configurations with visual themes
const EFFECT_CONFIG: Record<PowerUpType, {
  icon: string;
  title: { en: string; ar: string };
  color: string;
  bgGradient: string;
  animation: string;
  sound?: string;
}> = {
  [PowerUpType.Shield]: {
    icon: "🛡️",
    title: { en: "SHIELD ACTIVATED", ar: "الدرع مفعل" },
    color: "#3b82f6",
    bgGradient: "from-blue-500/30 to-cyan-500/20",
    animation: "shield-bubble",
  },
  [PowerUpType.FiftyFifty]: {
    icon: "✂️",
    title: { en: "OPTIONS ELIMINATED", ar: "تم حذف الخيارات" },
    color: "#8b5cf6",
    bgGradient: "from-purple-500/30 to-pink-500/20",
    animation: "slice",
  },
  [PowerUpType.Freeze]: {
    icon: "❄️",
    title: { en: "FROZEN!", ar: "متجمد!" },
    color: "#06b6d4",
    bgGradient: "from-cyan-500/30 to-blue-500/20",
    animation: "frost-overlay",
  },
  [PowerUpType.DoubleDown]: {
    icon: "💰",
    title: { en: "DOUBLE POINTS", ar: "نقاط مضاعفة" },
    color: "#eab308",
    bgGradient: "from-yellow-500/30 to-amber-500/20",
    animation: "gold-burst",
  },
  [PowerUpType.Steal]: {
    icon: "🦹",
    title: { en: "POINTS STOLEN!", ar: "تم سرقة النقاط!" },
    color: "#ec4899",
    bgGradient: "from-pink-500/30 to-rose-500/20",
    animation: "shadow-swipe",
  },
  [PowerUpType.DoublePick]: {
    icon: "✌️",
    title: { en: "DOUBLE PICK", ar: "اختيار مزدوج" },
    color: "#22c55e",
    bgGradient: "from-green-500/30 to-emerald-500/20",
    animation: "split-screen",
  },
  [PowerUpType.Sandstorm]: {
    icon: "🌪️",
    title: { en: "SANDSTORM", ar: "عاصفة رملية" },
    color: "#d97706",
    bgGradient: "from-amber-500/30 to-orange-500/20",
    animation: "sand-blur",
  },
  [PowerUpType.TimeWarp]: {
    icon: "⏰",
    title: { en: "TIME EXTENDED", ar: "تمديد الوقت" },
    color: "#f97316",
    bgGradient: "from-orange-500/30 to-red-500/20",
    animation: "time-warp",
  },
  [PowerUpType.Whole]: {
    icon: "🌀",
    title: { en: "WHOLE ACTIVATED", ar: "ثقب مفعل" },
    color: "#a855f7",
    bgGradient: "from-violet-500/30 to-purple-500/20",
    animation: "vortex",
  },
};

export function PowerUpEffects({ activeEffects, currentUserId, onEffectComplete }: PowerUpEffectsProps) {
  const [visibleEffects, setVisibleEffects] = useState<(ActivePowerUpEffect & { id: string; duration: number })[]>([]);

  // Default durations per effect type (ms)
  const getDuration = (type: PowerUpType): number => {
    switch (type) {
      case PowerUpType.Freeze: return 5000;
      case PowerUpType.Sandstorm: return 4000;
      case PowerUpType.Shield: return 3000;
      case PowerUpType.DoubleDown: return 2000;
      case PowerUpType.Whole: return 3000;
      case PowerUpType.TimeWarp: return 2500;
      case PowerUpType.FiftyFifty: return 2000;
      default: return 2000;
    }
  };

  // Add new effects to visible list
  useEffect(() => {
    activeEffects.forEach((effect, index) => {
      const effectId = `${effect.type}-${effect.sourceUserId}-${index}-${Date.now()}`;
      if (!visibleEffects.find((e) => e.id === effectId)) {
        const effectWithMeta = { ...effect, id: effectId, duration: getDuration(effect.type) };
        setVisibleEffects((prev) => [...prev, effectWithMeta]);
        
        // Auto-remove after duration
        setTimeout(() => {
          setVisibleEffects((prev) => prev.filter((e) => e.id !== effectId));
          onEffectComplete(effectId);
        }, effectWithMeta.duration);
      }
    });
  }, [activeEffects, visibleEffects, onEffectComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {visibleEffects.map((effect) => {
          const config = EFFECT_CONFIG[effect.type];
          const isTargeted = effect.targetUserId === currentUserId;
          const isSource = effect.sourceUserId === currentUserId;
          
          return (
            <motion.div
              key={effect.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              {/* Targeted Effect Overlay */}
              {isTargeted && effect.type === PowerUpType.Freeze && <FreezeOverlay />}
              {isTargeted && effect.type === PowerUpType.Sandstorm && <SandstormOverlay />}
              
              {/* Source Effect Animation */}
              {isSource && (
                <SourceEffectAnimation 
                  config={config} 
                  type={effect.type}
                />
              )}
              
              {/* General Effect Notification */}
              <EffectNotification 
                config={config}
                isTargeted={isTargeted}
                isSource={isSource}
              />
            </motion.div>
          );
        })}
      </AnimatePresence>
      
      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes shield-pulse {
          0%, 100% { 
            box-shadow: 0 0 30px rgba(59,130,246,0.5), inset 0 0 30px rgba(59,130,246,0.2);
            transform: scale(1);
          }
          50% { 
            box-shadow: 0 0 60px rgba(59,130,246,0.8), inset 0 0 50px rgba(59,130,246,0.4);
            transform: scale(1.02);
          }
        }
        
        @keyframes frost-spread {
          0% { 
            background: radial-gradient(circle at center, rgba(6,182,212,0) 0%, transparent 100%);
            opacity: 0;
          }
          50% { 
            background: radial-gradient(circle at center, rgba(6,182,212,0.6) 0%, transparent 70%);
            opacity: 1;
          }
          100% { 
            background: radial-gradient(circle at 150% 150%, rgba(6,182,212,0.8) 0%, transparent 60%);
            opacity: 0.8;
          }
        }
        
        @keyframes sand-blow {
          0% { transform: translateX(-100%) skewX(-15deg); opacity: 0; }
          50% { opacity: 0.8; }
          100% { transform: translateX(100%) skewX(-15deg); opacity: 0; }
        }
        
        @keyframes gold-sparkle {
          0%, 100% { 
            text-shadow: 0 0 20px currentColor;
            transform: scale(1);
          }
          50% { 
            text-shadow: 0 0 40px currentColor, 0 0 60px currentColor;
            transform: scale(1.2);
          }
        }
        
        @keyframes slice-cut {
          0% { clip-path: polygon(0 0, 0 0, 0 100%, 0 100%); }
          50% { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); }
          100% { clip-path: polygon(100% 0, 100% 0, 100% 100%, 100% 100%); }
        }
        
        @keyframes vortex-spin {
          0% { transform: rotate(0deg) scale(0.8); opacity: 0; }
          50% { transform: rotate(180deg) scale(1.2); opacity: 0.8; }
      100% { transform: rotate(360deg) scale(0.8); opacity: 0; }
        }
        
        @keyframes time-ripple {
          0% { transform: scale(0); opacity: 0.8; }
          100% { transform: scale(4); opacity: 0; }
        }
        
        @keyframes shadow-swipe {
          0% { transform: translateX(-200px) scale(0.5); opacity: 0; filter: blur(10px); }
          50% { transform: translateX(0) scale(1.5); opacity: 1; filter: blur(0); }
          100% { transform: translateX(200px) scale(0.5); opacity: 0; filter: blur(10px); }
        }
        
        @keyframes fade-up {
          0% { transform: translateY(20px); opacity: 0; }
          50% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-20px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// Freeze overlay effect
function FreezeOverlay() {
  return (
    <div 
      className="absolute inset-0 z-40"
      style={{
        background: "linear-gradient(135deg, rgba(6,182,212,0.4) 0%, rgba(59,130,246,0.3) 100%)",
        backdropFilter: "blur(2px)",
        animation: "frost-spread 0.5s ease-out forwards",
      }}
    >
      {/* Ice crystals */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-4xl"
          initial={{ 
            x: Math.random() * 100 + "%", 
            y: Math.random() * 100 + "%",
            opacity: 0,
            scale: 0 
          }}
          animate={{ 
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
            rotate: [0, 180, 360]
          }}
          transition={{ 
            duration: 3,
            delay: i * 0.1,
            repeat: Infinity
          }}
        >
          ❄️
        </motion.div>
      ))}
      
      {/* Frozen text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          className="text-6xl font-black text-white"
          style={{
            textShadow: "0 0 40px rgba(6,182,212,1), 0 0 80px rgba(6,182,212,0.8)",
          }}
        >
          ❄️ FROZEN ❄️
        </motion.div>
      </div>
    </div>
  );
}

// Sandstorm overlay effect
function SandstormOverlay() {
  return (
    <div className="absolute inset-0 z-40 overflow-hidden">
      {/* Sand particles */}
      {Array.from({ length: 50 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full"
          style={{
            background: `rgba(217,119,6,${0.3 + Math.random() * 0.4})`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            x: [0, 100, 200, 300, 400],
            y: [0, -30, 20, -40, 0],
            opacity: [0, 1, 1, 1, 0],
          }}
          transition={{
            duration: 2 + Math.random(),
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
      
      {/* Wind lines */}
      {Array.from({ length: 10 }).map((_, i) => (
        <motion.div
          key={`wind-${i}`}
          className="absolute h-px w-40"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(217,119,6,0.6), transparent)",
            top: `${Math.random() * 100}%`,
            left: "-10%",
          }}
          animate={{
            x: ["0%", "120%"],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 1 + Math.random(),
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
      
      {/* Blur overlay */}
      <div 
        className="absolute inset-0"
        style={{
          backdropFilter: "blur(4px)",
          background: "rgba(217,119,6,0.1)",
        }}
      />
    </div>
  );
}

// Source effect animation (when you use a power-up)
function SourceEffectAnimation({ 
  config, 
  type 
}: { 
  config: typeof EFFECT_CONFIG[PowerUpType]; 
  type: PowerUpType;
}) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 1.5, opacity: 0 }}
      className="absolute inset-0 flex items-center justify-center z-30"
    >
      {/* Effect-specific animations */}
      {type === PowerUpType.Shield && (
        <div 
          className="w-64 h-64 rounded-full border-8 border-blue-400"
          style={{
            animation: "shield-pulse 2s ease-in-out infinite",
            background: "radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)",
          }}
        />
      )}
      
      {type === PowerUpType.DoubleDown && (
        <div className="text-8xl" style={{ animation: "gold-sparkle 1s ease-in-out infinite" }}>
          💰
        </div>
      )}
      
      {type === PowerUpType.FiftyFifty && (
        <div 
          className="absolute inset-0 bg-purple-500/20"
          style={{ animation: "slice-cut 1s ease-out" }}
        />
      )}
      
      {type === PowerUpType.Whole && (
        <div 
          className="text-9xl"
          style={{ animation: "vortex-spin 2s ease-in-out", color: config.color }}
        >
          🌀
        </div>
      )}
      
      {type === PowerUpType.TimeWarp && (
        <>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-40 h-40 rounded-full border-4"
              style={{
                borderColor: config.color,
                animation: `time-ripple 1.5s ease-out ${i * 0.3}s infinite`,
              }}
            />
          ))}
        </>
      )}
      
      {type === PowerUpType.Steal && (
        <div className="flex flex-col items-center gap-4">
          <div className="text-8xl" style={{ animation: "shadow-swipe 1.5s ease-out forwards" }}>
            🦹‍♂️
          </div>
          <div 
            className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500" 
            style={{ animation: "fade-up 1.5s ease-in-out forwards", textShadow: "0 0 20px rgba(236,72,153,0.5)" }}
          >
            STEAL
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Effect notification toast
function EffectNotification({
  config,
  isTargeted,
  isSource,
}: {
  config: typeof EFFECT_CONFIG[PowerUpType];
  isTargeted: boolean;
  isSource: boolean;
}) {
  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      className="absolute top-24 left-1/2 -translate-x-1/2 z-50"
    >
      <div
        className={`
          px-8 py-4 rounded-2xl border-2 backdrop-blur-md
          ${isTargeted ? "bg-red-500/20 border-red-500" : ""}
          ${isSource ? "bg-green-500/20 border-green-500" : ""}
          ${!isTargeted && !isSource ? "bg-gray-800/80 border-gray-600" : ""}
        `}
        style={{
          boxShadow: `0 0 40px ${config.color}40`,
        }}
      >
        <div className="flex items-center gap-4">
          <span className="text-4xl">{config.icon}</span>
          <div>
            <div className="font-bold text-lg" style={{ color: config.color }}>
              {config.title.en}
            </div>
            <div className="text-xs text-gray-400">
              {isTargeted ? "😱 Used on you!" : isSource ? "✨ You used this!" : "👀 Someone used this"}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Hook to manage power-up effects locally (alternative to store-managed effects)
export function usePowerUpEffects() {
  const [effects, setEffects] = useState<(ActivePowerUpEffect & { id: string; duration: number })[]>([]);

  const addEffect = (type: PowerUpType, sourceUserId: string, targetUserId?: string) => {
    const duration = type === PowerUpType.Freeze || type === PowerUpType.Sandstorm ? 5000 : 3000;
    const newEffect = {
      id: `effect_${Date.now()}_${Math.random()}`,
      type,
      sourceUserId,
      targetUserId,
      duration,
    };
    
    setEffects((prev) => [...prev, newEffect]);
  };

  const removeEffect = (id: string) => {
    setEffects((prev) => prev.filter((e) => e.id !== id));
  };

  return { effects, addEffect, removeEffect };
}

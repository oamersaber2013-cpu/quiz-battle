import { PowerUpType } from "@quiz-battle/shared";

export const POWER_UP_INFO: Record<PowerUpType, { icon: string; label: { en: string; ar: string }; description: { en: string; ar: string }; needsTarget?: boolean; unavailable?: boolean }> = {
  [PowerUpType.Shield]: { icon: "🛡️", label: { en: "Shield", ar: "الدرع" }, description: { en: "Block one attack, or one Survival elimination, this round.", ar: "احجب هجومًا واحدًا أو إقصاءً واحدًا في وضع البقاء خلال هذه الجولة." } },
  [PowerUpType.FiftyFifty]: { icon: "✂️", label: { en: "50/50", ar: "٥٠ / ٥٠" }, description: { en: "Remove up to two wrong options from a choice question.", ar: "احذف ما يصل إلى خيارين خاطئين من سؤال الاختيارات." } },
  [PowerUpType.Freeze]: { icon: "❄️", label: { en: "Freeze", ar: "التجميد" }, description: { en: "Stop a chosen opponent answering for 5 seconds.", ar: "امنع خصمًا تختاره من الإجابة لمدة ٥ ثوانٍ." }, needsTarget: true },
  [PowerUpType.DoubleDown]: { icon: "×2", label: { en: "Double points", ar: "مضاعفة النقاط" }, description: { en: "Double the points for a correct answer this round.", ar: "ضاعف نقاط الإجابة الصحيحة في هذه الجولة." } },
  [PowerUpType.Steal]: { icon: "↗", label: { en: "Steal", ar: "السرقة" }, description: { en: "Take up to 200 points from a chosen opponent.", ar: "خذ ما يصل إلى ٢٠٠ نقطة من خصم تختاره." }, needsTarget: true },
  [PowerUpType.DoublePick]: { icon: "↔", label: { en: "Double pick", ar: "الاختيار المزدوج" }, description: { en: "This power is currently unavailable.", ar: "هذه القدرة غير متاحة حاليًا." }, unavailable: true },
  [PowerUpType.Whole]: { icon: "◉", label: { en: "Echo", ar: "الصدى" }, description: { en: "Their last answer: correct earns you 300 points; wrong costs them 200.", ar: "إذا كانت إجابة خصمك الأخيرة صحيحة، تكسب ٣٠٠ نقطة؛ وإلا يخسر ٢٠٠ نقطة." }, needsTarget: true },
  [PowerUpType.Sandstorm]: { icon: "🌪️", label: { en: "Sandstorm", ar: "العاصفة الرملية" }, description: { en: "Obscure a chosen opponent's question for 7 seconds.", ar: "شوّش سؤال خصم تختاره لمدة ٧ ثوانٍ." }, needsTarget: true },
  [PowerUpType.TimeWarp]: { icon: "+5", label: { en: "Extra time", ar: "وقت إضافي" }, description: { en: "Add 5 seconds to your answer window.", ar: "أضف ٥ ثوانٍ إلى الوقت المتاح لإجابتك." } },
};

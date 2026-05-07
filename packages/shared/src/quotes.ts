import { PowerUpType } from "./enums";

export const SARCASTIC_QUOTES = {
  wrong: [
    { en: "How less smart can you be? 🧐", ar: "إلى أي مدى يمكن أن يقل ذكاؤك؟ 🧐" },
    { en: "You run faster than your understanding. 🏃💨", ar: "ذكاؤك يركض أسرع منك! 🏃💨" },
    { en: "Is your brain on battery saver mode? 🔋", ar: "عقلك في وضع توفير الطاقة؟ 🔋" },
    { en: "Error 404: Brain not found. 🚫🧠", ar: "خطأ ٤٠٤: العقل غير موجود. 🚫🧠" },
    { en: "I've seen plants with more correct answers. 🌱", ar: "لقد رأيت نباتات تجيب بشكل أفضل! 🌱" },
    { en: "Did you click that by accident? Please say yes. 🤡", ar: "هل ضغطت على هذا بالخطأ؟ قل نعم أرجوك. 🤡" },
    { en: "Your IQ is taking a nap. 😴", ar: "مستوى ذكائك يأخذ قيلولة الآن. 😴" },
    { en: "A coin flip would have been better. 🪙", ar: "كان رمي العملة سيكون أدق من اختيارك. 🪙" },
  ],
  right: [
    { en: "Einstein is sweating! 💦🧠", ar: "أينشتاين يتصبب عرقاً الآن! 💦🧠" },
    { en: "Absolute Unit of Intelligence. 🔥", ar: "أنت كتلة من الذكاء المتفجر! 🔥" },
    { en: "Knowledge King! 👑", ar: "ملك المعرفة! 👑" },
    { en: "Are you cheating? Or just a genius? 🤔✨", ar: "هل تغش؟ أم أنك عبقري بالفطرة؟ 🤔✨" },
    { en: "Pure Fire! 🌋", ar: "شعلة ذكاء نقية! 🌋" },
    { en: "Saif Al-Ma'rifah is proud of you. ⚔️", ar: "سيف المعرفة يفخر بك. ⚔️" },
    { en: "Your brain is on Overdrive! 🚀", ar: "عقلك في وضع القوة القصوى! 🚀" },
  ]
};

export function getRandomQuote(type: 'right' | 'wrong') {
  const pool = SARCASTIC_QUOTES[type];
  return pool[Math.floor(Math.random() * pool.length)];
}

const POWER_UP_QUOTES: Record<
  PowerUpType,
  {
    self: { en: string; ar: string };
    target?: { en: string; ar: string };
    other?: { en: string; ar: string };
  }
> = {
  [PowerUpType.Shield]: {
    self: { en: "Shield raised. Let them waste their tricks.", ar: "تم رفع الدرع. دعهم يهدرون حيلهم." },
    other: { en: "A shield just went up. Annoying, really.", ar: "هناك درع تم تفعيله الآن. مزعج، أليس كذلك؟" },
  },
  [PowerUpType.FiftyFifty]: {
    self: { en: "Two lies removed. Try not to miss the gift.", ar: "تم حذف كذبتين. حاول ألا تضيع الهدية." },
    other: { en: "The board just got cleaner for someone.", ar: "لوحة الإجابة أصبحت أنظف لشخص ما." },
  },
  [PowerUpType.Freeze]: {
    self: { en: "Ice deployed. Someone else can panic now.", ar: "تم نشر الجليد. ليدخل شخص آخر في حالة ذعر." },
    target: { en: "Frozen. Your reflexes are on unpaid leave.", ar: "تم تجميدك. ردود فعلك أخذت إجازة غير مدفوعة." },
    other: { en: "A player just got frozen solid.", ar: "أحد اللاعبين تجمد تماماً." },
  },
  [PowerUpType.DoubleDown]: {
    self: { en: "Double Down armed. Confidence is expensive.", ar: "تم تفعيل المضاعفة. الثقة هنا مكلفة." },
    other: { en: "Somebody just doubled the stakes.", ar: "هناك من ضاعف الرهان الآن." },
  },
  [PowerUpType.Steal]: {
    self: { en: "Clean theft. Try to look innocent.", ar: "سرقة نظيفة. حاول أن تبدو بريئاً." },
    target: { en: "Your points were borrowed without permission.", ar: "تمت استعارة نقاطك دون إذن." },
    other: { en: "Points just changed owners.", ar: "النقاط غيرت مالكها الآن." },
  },
  [PowerUpType.DoublePick]: {
    self: { en: "Two picks ready. Please waste them wisely.", ar: "خياران جاهزان. لا تهدرهما من فضلك." },
    other: { en: "Someone earned extra indecision.", ar: "أحدهم حصل على مساحة إضافية للتردد." },
  },
  [PowerUpType.Whole]: {
    self: { en: "WHOLE engaged. Reality is now your intern.", ar: "تم تفعيل WHOLE. الواقع يعمل عندك متدرباً الآن." },
    target: { en: "Your answer just echoed in someone else's favor.", ar: "إجابتك انعكست لصالح شخص آخر." },
    other: { en: "A mirrored answer just bent the round.", ar: "إجابة معكوسة غيّرت مسار الجولة." },
  },
  [PowerUpType.Sandstorm]: {
    self: { en: "Sandstorm unleashed. Let them read through the desert.", ar: "تم إطلاق العاصفة الرملية. دعهم يقرؤون وسط الصحراء." },
    target: { en: "Sand in the eyes. Unfortunate timing.", ar: "الرمل في عينيك. توقيت غير موفق." },
    other: { en: "A sandstorm just swallowed someone's screen.", ar: "عاصفة رملية ابتلعت شاشة أحدهم." },
  },
  [PowerUpType.TimeWarp]: {
    self: { en: "Time bent in your favor. Use it before it snaps back.", ar: "الوقت انحنى لصالحك. استخدمه قبل أن يرتد." },
    other: { en: "Someone just bribed the clock.", ar: "هناك من رشى الساعة للتو." },
  },
};

export function getPowerUpMessage(params: {
  type: PowerUpType;
  language: "en" | "ar";
  viewerUserId?: string | null;
  sourceUserId: string;
  targetUserId?: string;
}): string {
  const entry = POWER_UP_QUOTES[params.type];
  if (!entry) return params.language === "ar" ? "تم استخدام قوة خاصة." : "A power-up was used.";

  if (params.viewerUserId && params.viewerUserId === params.targetUserId && entry.target) {
    return entry.target[params.language];
  }

  if (params.viewerUserId && params.viewerUserId === params.sourceUserId) {
    return entry.self[params.language];
  }

  return entry.other?.[params.language] || entry.self[params.language];
}

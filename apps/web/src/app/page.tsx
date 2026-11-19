"use client";
import { getApiOrigin } from "@/lib/apiOrigin";
import { createRoomInvitePath, isRoomCode, isRoomId, normalizeRoomCode } from "@/lib/roomInvites";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GameMode, Difficulty, DEFAULT_CUSTOM_SETTINGS, getPlayableDifficulties, type CustomGameSettings } from "@quiz-battle/shared";
import { useGameStore } from "@/store/gameStore";
import { connectSocket } from "@/lib/socket";
import styles from "./home.module.css";
import { CustomModeBuilder } from "@/components/CustomModeBuilder";
import { isValidRoomPassword } from "@/components/RoomPasswordPrompt";
import { useDocumentLocale } from "@/hooks/useDocumentLocale";

const MODE_THEMES = [
  { mode: GameMode.Classic, label: { en: "Classic", ar: "كلاسيك" }, desc: { en: "Compete for the highest score.", ar: "تنافس على أعلى نتيجة." } },
  { mode: GameMode.Survival, label: { en: "Survival", ar: "البقاء" }, desc: { en: "One wrong answer means elimination.", ar: "إجابة خاطئة واحدة تعني الإقصاء." } },
  { mode: GameMode.Conquest, label: { en: "Conquest", ar: "غزو" }, desc: { en: "Answer questions and claim territories.", ar: "أجب عن الأسئلة وسيطر على الأقاليم." } },
  { mode: GameMode.Chaos, label: { en: "Chaos", ar: "فوضى" }, desc: { en: "Quiz rounds with unpredictable twists.", ar: "تحديات ثقافية مليئة بالمفاجآت." } },
  { mode: GameMode.Custom, label: { en: "Custom", ar: "مخصص" }, desc: { en: "Set the pace, subjects, and powers.", ar: "اختر الجولات والمواضيع والقوى." } },
];

const DIFFICULTIES = [
  { value: Difficulty.Novice, label: { en: "Novice", ar: "مبتدئ" } },
  { value: Difficulty.Scholar, label: { en: "Scholar", ar: "باحث" } },
  { value: Difficulty.Sage, label: { en: "Sage", ar: "حكيم" } },
  { value: Difficulty.Master, label: { en: "Master", ar: "خبير" } },
  { value: Difficulty.Legend, label: { en: "Legend", ar: "أسطورة" } },
];

const CATEGORIES: Record<string, { label: { en: string; ar: string }; icon: string; topics: { id: string; label: { en: string; ar: string } }[] }> = {
  // RELIGION & SPIRITUALITY
  islamic: { 
    label: { en: "Islamic Knowledge", ar: "الثقافة الإسلامية" }, 
    icon: "🕌", 
    topics: [
      { id: "prophets", label: { en: "Prophets & Messengers", ar: "الأنبياء والمرسلين" } },
      { id: "seerah", label: { en: "Seerah (Life of Prophet ﷺ)", ar: "السيرة النبوية" } },
      { id: "pillars", label: { en: "Five Pillars of Islam", ar: "أركان الإسلام الخمسة" } },
      { id: "quran", label: { en: "Quranic Verses & Tafsir", ar: "آيات القرآن وتفسيرها" } },
      { id: "hadith", label: { en: "Hadith & Sunnah", ar: "الحديث والسنة" } },
      { id: "islamic_history", label: { en: "Islamic Golden Age", ar: "العصر الذهبي الإسلامي" } },
      { id: "caliphs", label: { en: "Rightly Guided Caliphs", ar: "الخلفاء الراشدون" } },
      { id: "islamic_law", label: { en: "Fiqh & Islamic Law", ar: "الفقه والشريعة" } },
      { id: "ramadan", label: { en: "Ramadan & Eid", ar: "رمضان والأعياد" } },
      { id: "hajj", label: { en: "Hajj & Umrah", ar: "الحج والعمرة" } },
      { id: "companions", label: { en: "Sahabah (Companions)", ar: "الصحابة الكرام" } },
    ]
  },
  
  // SCIENCE & NATURE
  science: { 
    label: { en: "Science & Discovery", ar: "العلوم والاكتشافات" }, 
    icon: "🔬", 
    topics: [
      { id: "physics", label: { en: "Physics & Laws of Nature", ar: "الفيزياء وقوانين الطبيعة" } },
      { id: "chemistry", label: { en: "Chemistry & Elements", ar: "الكيمياء والعناصر" } },
      { id: "biology", label: { en: "Biology & Living Things", ar: "الأحياء والكائنات الحية" } },
      { id: "human_body", label: { en: "Human Body & Anatomy", ar: "جسم الإنسان والتشريح" } },
      { id: "astronomy", label: { en: "Astronomy & Space", ar: "علم الفلك والفضاء" } },
      { id: "planets", label: { en: "Planets & Solar System", ar: "الكواكب والنظام الشمسي" } },
      { id: "dinosaurs", label: { en: "Dinosaurs & Prehistoric", ar: "الديناصورات والعصور القديمة" } },
      { id: "animals", label: { en: "Animals & Wildlife", ar: "الحيوانات والحياة البرية" } },
      { id: "plants", label: { en: "Plants & Botany", ar: "النباتات وعلم النبات" } },
      { id: "inventions", label: { en: "Great Inventions", ar: "الاختراعات العظيمة" } },
      { id: "scientists", label: { en: "Famous Scientists", ar: "العلماء المشهورون" } },
    ]
  },
  
  technology: { 
    label: { en: "Technology & Future", ar: "التكنولوجيا والمستقبل" }, 
    icon: "💻", 
    topics: [
      { id: "ai", label: { en: "Artificial Intelligence", ar: "الذكاء الاصطناعي" } },
      { id: "programming", label: { en: "Programming & Coding", ar: "البرمجة والتكويد" } },
      { id: "internet", label: { en: "Internet & Web", ar: "الإنترنت والشبكة" } },
      { id: "smartphones", label: { en: "Smartphones & Apps", ar: "الهواتف الذكية والتطبيقات" } },
      { id: "gaming_tech", label: { en: "Gaming Technology", ar: "تقنية الألعاب" } },
      { id: "robots", label: { en: "Robotics & Automation", ar: "الروبوتات والأتمتة" } },
      { id: "space_tech", label: { en: "Space Technology", ar: "تقنية الفضاء" } },
      { id: "crypto", label: { en: "Crypto & Blockchain", ar: "العملات الرقمية والبلوكتشين" } },
    ]
  },
  
  // HISTORY
  history: { 
    label: { en: "World History", ar: "تاريخ العالم" }, 
    icon: "🏛️", 
    topics: [
      { id: "ancient_egypt", label: { en: "Ancient Egypt & Pharaohs", ar: "مصر القديمة والفراعنة" } },
      { id: "ancient_greece", label: { en: "Ancient Greece & Rome", ar: "اليونان وروما القديمة" } },
      { id: "mesopotamia", label: { en: "Mesopotamia & Babylon", ar: "بلاد الرافدين وبابل" } },
      { id: "world_war_1", label: { en: "World War I", ar: "الحرب العالمية الأولى" } },
      { id: "world_war_2", label: { en: "World War II", ar: "الحرب العالمية الثانية" } },
      { id: "cold_war", label: { en: "Cold War Era", ar: "عصر الحرب الباردة" } },
      { id: "arab_history", label: { en: "Arab & Islamic History", ar: "التاريخ العربي والإسلامي" } },
      { id: "medieval", label: { en: "Medieval & Knights", ar: "العصور الوسطى والفرسان" } },
      { id: "renaissance", label: { en: "Renaissance & Reformation", ar: "عصر النهضة والإصلاح" } },
      { id: "modern_history", label: { en: "Modern History (1900+)", ar: "التاريخ الحديث (1900+)" } },
      { id: "revolutions", label: { en: "Famous Revolutions", ar: "الثورات الشهيرة" } },
      { id: "empires", label: { en: "Great Empires", ar: "الإمبراطوريات العظيمة" } },
    ]
  },
  
  // GEOGRAPHY
  geography: { 
    label: { en: "Geography & Nature", ar: "الجغرافيا والطبيعة" }, 
    icon: "🌍", 
    topics: [
      { id: "countries", label: { en: "Countries & Capitals", ar: "الدول والعواصم" } },
      { id: "flags", label: { en: "Flags & Symbols", ar: "الأعلام والرموز" } },
      { id: "arab_world", label: { en: "Arab World Map", ar: "خريطة الوطن العربي" } },
      { id: "africa", label: { en: "Africa", ar: "أفريقيا" } },
      { id: "asia", label: { en: "Asia", ar: "آسيا" } },
      { id: "europe", label: { en: "Europe", ar: "أوروبا" } },
      { id: "americas", label: { en: "Americas", ar: "الأمريكتان" } },
      { id: "oceans", label: { en: "Oceans & Seas", ar: "المحيطات والبحار" } },
      { id: "mountains", label: { en: "Mountains & Deserts", ar: "الجبال والصحاري" } },
      { id: "rivers", label: { en: "Rivers & Lakes", ar: "الأنهار والبحيرات" } },
      { id: "wonders", label: { en: "Seven Wonders", ar: "العجائب السبعة" } },
      { id: "cities", label: { en: "Famous Cities", ar: "المدن الشهيرة" } },
    ]
  },
  
  // ENTERTAINMENT
  movies: { 
    label: { en: "Movies & Cinema", ar: "الأفلام والسينما" }, 
    icon: "🎬", 
    topics: [
      { id: "hollywood", label: { en: "Hollywood Classics", ar: "كلاسيكيات هوليوود" } },
      { id: "arab_movies", label: { en: "Arab Cinema", ar: "السينما العربية" } },
      { id: "bollywood", label: { en: "Bollywood", ar: "بوليوود" } },
      { id: "marvel", label: { en: "Marvel Universe", ar: "عالم مارفل" } },
      { id: "dc", label: { en: "DC Universe", ar: "عالم دي سي" } },
      { id: "disney", label: { en: "Disney & Pixar", ar: "ديزني وبيكسار" } },
      { id: "horror", label: { en: "Horror Films", ar: "أفلام الرعب" } },
      { id: "action", label: { en: "Action & Adventure", ar: "الأكشن والمغامرة" } },
      { id: "oscars", label: { en: "Oscar Winners", ar: "الفائزون بالأوسكار" } },
      { id: "directors", label: { en: "Famous Directors", ar: "المخرجون المشهورون" } },
      { id: "quotes", label: { en: "Famous Movie Quotes", ar: "اقتباسات أفلام شهيرة" } },
    ]
  },
  
  anime: { 
    label: { en: "Anime & Manga", ar: "الأنمي والمانجا" }, 
    icon: "⛩️", 
    topics: [
      { id: "one_piece", label: { en: "One Piece", ar: "ون بيس" } },
      { id: "naruto", label: { en: "Naruto & Boruto", ar: "ناروتو وبوروتو" } },
      { id: "dbz", label: { en: "Dragon Ball Series", ar: "سلسلة دراغون بول" } },
      { id: "aot", label: { en: "Attack on Titan", ar: "هجوم العمالقة" } },
      { id: "demon_slayer", label: { en: "Demon Slayer", ar: "قاتل الشياطين" } },
      { id: "death_note", label: { en: "Death Note", ar: "ديث نوت" } },
      { id: "hxh", label: { en: "Hunter x Hunter", ar: "هنتر x هنتر" } },
      { id: "mha", label: { en: "My Hero Academia", ar: "أكاديميتي للأبطال" } },
      { id: "jojo", label: { en: "JoJo's Bizarre Adventure", ar: "مغامرات جوجو" } },
      { id: "classic_anime", label: { en: "90s Anime (Spacetoon)", ar: "أنمي التسعينيات (سبيستون)" } },
      { id: "studio_ghibli", label: { en: "Studio Ghibli", ar: "استوديو جيبلي" } },
      { id: "manga", label: { en: "Manga Artistry", ar: "فن المانجا" } },
    ]
  },
  // SPORTS
  sports: { 
    label: { en: "Sports & Athletics", ar: "الرياضة والألعاب الرياضية" }, 
    icon: "🏆", 
    topics: [
      { id: "football", label: { en: "Football/Soccer", ar: "كرة القدم" } },
      { id: "world_cup", label: { en: "FIFA World Cup", ar: "كأس العالم" } },
      { id: "champions_league", label: { en: "Champions League", ar: "دوري الأبطال" } },
      { id: "premier_league", label: { en: "Premier League", ar: "الدوري الإنجليزي" } },
      { id: "laliga", label: { en: "La Liga", ar: "الدوري الإسباني" } },
      { id: "arab_football", label: { en: "Arab Football Leagues", ar: "الدوريات العربية" } },
      { id: "basketball", label: { en: "Basketball & NBA", ar: "كرة السلة وNBA" } },
      { id: "olympics", label: { en: "Olympic Games", ar: "الألعاب الأولمبية" } },
      { id: "tennis", label: { en: "Tennis", ar: "التنس" } },
      { id: "f1", label: { en: "Formula 1 Racing", ar: "سباق الفورمولا 1" } },
      { id: "mma", label: { en: "MMA & Boxing", ar: "فنون القتال والملاكمة" } },
      { id: "sports_legends", label: { en: "Sports Legends", ar: "أساطير الرياضة" } },
    ]
  },
  
  // ARTS & CULTURE
  literature: { 
    label: { en: "Literature & Books", ar: "الأدب والكتب" }, 
    icon: "📚", 
    topics: [
      { id: "arabic_lit", label: { en: "Arabic Literature", ar: "الأدب العربي" } },
      { id: "world_lit", label: { en: "World Literature", ar: "الأدب العالمي" } },
      { id: "poetry", label: { en: "Poetry", ar: "الشعر" } },
      { id: "novels", label: { en: "Famous Novels", ar: "الروايات الشهيرة" } },
      { id: "authors", label: { en: "Famous Authors", ar: "الكتاب المشهورون" } },
      { id: "harry_potter", label: { en: "Harry Potter", ar: "هاري بوتر" } },
      { id: "lord_rings", label: { en: "Lord of the Rings", ar: "سيد الخواتم" } },
      { id: "poets", label: { en: "Famous Poets", ar: "الشعراء المشهورون" } },
    ]
  },
  
  art: { 
    label: { en: "Art & Culture", ar: "الفن والثقافة" }, 
    icon: "🎨", 
    topics: [
      { id: "paintings", label: { en: "Famous Paintings", ar: "اللوحات الشهيرة" } },
      { id: "artists", label: { en: "Great Artists", ar: "الفنانون العظام" } },
      { id: "museums", label: { en: "Museums & Galleries", ar: "المتاحف والمعارض" } },
      { id: "sculpture", label: { en: "Sculpture & Architecture", ar: "النحت والعمارة" } },
      { id: "arab_art", label: { en: "Arab & Islamic Art", ar: "الفن العربي والإسلامي" } },
      { id: "modern_art", label: { en: "Modern & Contemporary", ar: "الفن الحديث والمعاصر" } },
    ]
  },
  
  // GAMES & FUN
  gaming: { 
    label: { en: "Video Games", ar: "ألعاب الفيديو" }, 
    icon: "🎮", 
    topics: [
      { id: "minecraft", label: { en: "Minecraft", ar: "ماينكرافت" } },
      { id: "fortnite", label: { en: "Fortnite", ar: "فورتنايت" } },
      { id: "cod", label: { en: "Call of Duty", ar: "كول أوف ديوتي" } },
      { id: "fifa", label: { en: "FIFA & EA Sports", ar: "فيفا و EA سبورتس" } },
      { id: "pokemon", label: { en: "Pokémon", ar: "بوكيمون" } },
      { id: "zelda", label: { en: "Zelda & Nintendo", ar: "زيلدا ونينتندو" } },
      { id: "gta", label: { en: "GTA Series", ar: "سلسلة جي تي أي" } },
      { id: "esports", label: { en: "Esports & Pro Gaming", ar: "الرياضات الإلكترونية" } },
      { id: "retro", label: { en: "Retro Gaming", ar: "ألعاب الرترو" } },
      { id: "gaming_characters", label: { en: "Gaming Icons", ar: "شخصيات الألعاب" } },
    ]
  },
  
  mythology: { 
    label: { en: "Mythology", ar: "الأساطير" }, 
    icon: "⚡", 
    topics: [
      { id: "greek", label: { en: "Greek Mythology", ar: "الأساطير اليونانية" } },
      { id: "norse", label: { en: "Norse Mythology", ar: "الأساطير الإسكندنافية" } },
      { id: "egyptian", label: { en: "Egyptian Mythology", ar: "الأساطير المصرية" } },
      { id: "arab_folklore", label: { en: "Arab Folklore", ar: "التراث والفولكلور العربي" } },
      { id: "legends", label: { en: "Legends & Folklore", ar: "الأساطير والخرافات" } },
    ]
  },
  
  // GENERAL KNOWLEDGE
  general: { 
    label: { en: "General Knowledge", ar: "المعلومات العامة" }, 
    icon: "🧠", 
    topics: [
      { id: "random_facts", label: { en: "Random Facts", ar: "حقائق عشوائية" } },
      { id: "brain_teasers", label: { en: "Brain Teasers", ar: "ألغاز العقل" } },
      { id: "logo_quiz", label: { en: "Logo Quiz", ar: "اختبار الشعارات" } },
      { id: "famous_quotes", label: { en: "Famous Quotes", ar: "اقتباسات مشهورة" } },
      { id: "riddles", label: { en: "Riddles & Puzzles", ar: "الألغاز والأحجيات" } },
      { id: "trivia", label: { en: "Mixed Trivia", ar: "معلومات متنوعة" } },
      { id: "firsts", label: { en: "World Firsts", ar: "الأوليات في العالم" } },
      { id: "records", label: { en: "World Records", ar: "الأرقام القياسية" } },
    ]
  },
  
  // LIFESTYLE
  food: { 
    label: { en: "Food & Cuisine", ar: "الطعام والمطبخ" }, 
    icon: "🍽️", 
    topics: [
      { id: "arab_food", label: { en: "Arab Cuisine", ar: "المطبخ العربي" } },
      { id: "world_food", label: { en: "World Cuisines", ar: "المطابخ العالمية" } },
      { id: "fast_food", label: { en: "Fast Food Brands", ar: "ماركات الوجبات السريعة" } },
      { id: "desserts", label: { en: "Desserts & Sweets", ar: "الحلويات" } },
      { id: "drinks", label: { en: "Drinks & Beverages", ar: "المشروبات" } },
      { id: "ingredients", label: { en: "Ingredients & Spices", ar: "المكونات والتوابل" } },
    ]
  },
  
  // BUSINESS & ECONOMY
  business: { 
    label: { en: "Business & Economy", ar: "الأعمال والاقتصاد" }, 
    icon: "💼", 
    topics: [
      { id: "brands", label: { en: "Global Brands", ar: "العلامات التجارية العالمية" } },
      { id: "companies", label: { en: "Big Companies", ar: "الشركات الكبرى" } },
      { id: "entrepreneurs", label: { en: "Entrepreneurs", ar: "رواد الأعمال" } },
      { id: "economy", label: { en: "Economy & Finance", ar: "الاقتصاد والمالية" } },
      { id: "stocks", label: { en: "Stock Market", ar: "سوق الأسهم" } },
    ]
  },
};

const T = {
  title: { en: "Sword of Knowledge", ar: "سيف المعرفة" },
  tagline: { 
    en: "The greatest multiplayer battle of intellect. Create a room, choose your topics, and conquer.",
    ar: "أعظم معركة ثقافية جماعية. أنشئ غرفتك، اختر مواضيعك، واغزُ العالم."
  },
  joinCode: { en: "🔗 Join Code", ar: "🔗 كود الانضمام" },
  joinErrors: {
    format: { en: "Enter a 6-character room code", ar: "أدخل رمز غرفة مكوناً من 6 خانات" },
    invalid: { en: "Invalid join code", ar: "رمز الغرفة غير صحيح" },
    guest: { en: "Failed to create guest account", ar: "فشل إنشاء حساب ضيف" },
    connection: { en: "Could not connect. Check your connection and try again.", ar: "تعذر الاتصال. تحقق من اتصالك ثم حاول مرة أخرى." },
    rateLimited: { en: "Too many attempts. Wait a minute and try again.", ar: "محاولات كثيرة. انتظر دقيقة ثم حاول مرة أخرى." },
  },
  warriorName: { en: "Your Battle Name", ar: "اسم المحارب الخاص بك" },
  createRoom: { en: "⚔️ Create Battle Room", ar: "⚔️ إنشاء غرفة معركة" },
  chooseMode: { en: "Choose Game Mode", ar: "اختر نمط اللعبة" },
  chooseCategory: { en: "Choose Category", ar: "اختر القسم" },
  chooseTopic: { en: "Choose Specific Topic", ar: "اختر موضوعاً محدداً" },
  difficulty: { en: "Difficulty Level", ar: "مستوى الصعوبة" },
  back: { en: "← Back", ar: "← عودة" },
};

export default function HomePage() {
  const router = useRouter();
  const {
    setAuth, setGame, addToast, userId, username,
    language, setLanguage
  } = useGameStore();

  const [view, setView] = useState<"home" | "create" | "join">("home");
  const [selectedMode, setSelectedMode] = useState<GameMode>(GameMode.Classic);
  const [selectedDiff, setSelectedDiff] = useState<Difficulty>(Difficulty.Sage);
  const [selectedCats, setSelectedCats] = useState<string[]>(["general"]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(["trivia"]);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<keyof typeof T.joinErrors | null>(null);
  const [invitedRoomId, setInvitedRoomId] = useState<string | null>(null);
  const [invitedAsSpectator, setInvitedAsSpectator] = useState(false);
  const [entryReady, setEntryReady] = useState(false);
  const joinSubmit = useRef<HTMLButtonElement>(null);
  const joinCodeInput = useRef<HTMLInputElement>(null);
  const playerNameInput = useRef<HTMLInputElement>(null);
  const joinViewButton = useRef<HTMLButtonElement>(null);
  const wizardHeading = useRef<HTMLHeadingElement>(null);
  const returnToJoinButton = useRef(false);
  const canJoin = !!invitedRoomId || isRoomCode(joinCode);
  const [loading, setLoading] = useState(false);
  const [inputUsername, setInputUsername] = useState("");
  const guestName = inputUsername.trim();
  const invalidName = !userId && !!guestName && !/^[\p{L}\p{M}\p{N}_ -]{1,20}$/u.test(guestName);
  const [customConfig, setCustomConfig] = useState<CustomGameSettings>(() => ({
    ...DEFAULT_CUSTOM_SETTINGS, enabledPowerUps: [...DEFAULT_CUSTOM_SETTINGS.enabledPowerUps],
  }));
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isCreating, setIsCreating] = useState(false);
  const [privateRoom, setPrivateRoom] = useState(false);
  const [roomPassword, setRoomPassword] = useState("");
  const playableDifficulties = getPlayableDifficulties(selectedCats);
  const effectiveCategories = selectedMode === GameMode.Custom && customConfig.categoryFilter
    ? [customConfig.categoryFilter] : selectedCats;
  const canCreateWithQuestions = getPlayableDifficulties(effectiveCategories)
    .includes(selectedMode === GameMode.Custom ? customConfig.difficulty : selectedDiff);
  useEffect(() => {
    if (playableDifficulties.length && !playableDifficulties.includes(selectedDiff)) setSelectedDiff(playableDifficulties[0]);
  }, [selectedDiff, playableDifficulties.join(",")]);


  useEffect(() => { if (view !== "create") setRoomPassword(""); }, [view]);

  useEffect(() => {
    setEntryReady(true);
    if (typeof window === "undefined" || typeof window.location?.search !== "string") return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("join");
    const room = params.get("room");
    if (code === null && room === null) return;
    const inviteLanguage = params.get("lang");
    if (inviteLanguage === "ar" || inviteLanguage === "en") setLanguage(inviteLanguage);
    const normalizedCode = normalizeRoomCode(code ?? "");
    const validRoom = code === null && isRoomId(room) ? room : null;
    setJoinCode(normalizedCode);
    setInvitedRoomId(validRoom);
    setInvitedAsSpectator(params.get("spectate") === "true");
    setJoinError(validRoom || isRoomCode(normalizedCode) ? null : "format");
    setView("join");
  }, [setLanguage]);

  useEffect(() => {
    if (view === "join") {
      // The code in an invitation is already complete. Keep the next keystroke
      // in the name field rather than moving focus back to that code.
      const hasInvite = !!invitedRoomId || isRoomCode(joinCodeInput.current?.value ?? "");
      const target = hasInvite ? (userId ? joinSubmit.current : playerNameInput.current) : joinCodeInput.current;
      target?.focus();
    }
    if (view === "home" && returnToJoinButton.current) {
      returnToJoinButton.current = false;
      joinViewButton.current?.focus();
    }
  }, [view, invitedRoomId]);

  useEffect(() => {
    if (view === "create") wizardHeading.current?.focus();
  }, [view, step]);

  const API = getApiOrigin();

  const isRTL = language === "ar";
  useDocumentLocale(language);
  const inviteReturnPath = view === "join"
    ? createRoomInvitePath({ code: joinCode, roomId: invitedRoomId ?? undefined, language, spectate: invitedAsSpectator }) : "";
  const accountHref = userId ? "/profile" : inviteReturnPath ? `/login?returnTo=${encodeURIComponent(inviteReturnPath)}` : "/login";

  async function handleCreateGame() {
    if (invalidName || loading) return;
    if (!canCreateWithQuestions) {
      addToast("error", isRTL ? "اختر صعوبة متاحة أو معلومات متنوعة." : "Choose an available difficulty or mixed trivia.");
      return;
    }
    if (selectedMode === GameMode.Custom && !customConfig.name.trim()) {
      addToast("error", isRTL ? "أدخل اسماً للمعركة." : "Enter a battle name.");
      return;
    }
    if (privateRoom && !isValidRoomPassword(roomPassword)) {
      addToast("error", isRTL ? "أدخل كلمة مرور قصيرة للغرفة." : "Enter a shorter room password.");
      return;
    }
    setLoading(true);
    setIsCreating(true);
    try {
      const store = useGameStore.getState();
      let currentId = store.userId;
      let currentToken = store.token;
      let currentName = store.username ?? guestName;

      if (!currentId) {
        const res = await fetch(`${API}/api/auth/guest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: guestName || undefined }),
        });
        if (!res.ok) {
          addToast("error", isRTL ? "فشل إنشاء حساب ضيف" : "Failed to create guest account");
          return;
        }
        const data = await res.json();
        setAuth(data);
        setInputUsername(data.username);
        connectSocket(data.userId, data.username, data.token, true);
        currentId = data.userId;
        currentToken = data.token;
        currentName = data.username;
      }

      const gameConfig: any = {
        mode: selectedMode,
        difficulty: selectedMode === GameMode.Custom ? customConfig.difficulty : selectedDiff,
        categories: selectedCats,
        subcategories: selectedTopics,
        username: currentName,
        language: language,
        isPrivate: privateRoom,
        ...(privateRoom ? { password: roomPassword } : {}),
      };
      
      // Include custom configuration if Custom mode
      if (selectedMode === GameMode.Custom && customConfig) {
        gameConfig.customSettings = customConfig;
      }
      
      const res = await fetch(`${API}/api/games`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentToken || ""}`,
        },
        body: JSON.stringify(gameConfig),
      });

      const game = await res.json();
      if (!res.ok) {
        addToast("error", game.error || (isRTL ? "فشل في إنشاء اللعبة" : "Failed to create game"));
        return;
      }
      if (!game?.gameId || !game?.joinCode) {
        addToast("error", isRTL ? "استجابة غير صالحة من الخادم" : "Invalid server response");
        return;
      }
      setGame({ 
        gameId: game.gameId, 
        joinCode: game.joinCode,
        hostId: currentId || undefined,   // host is the creator
        mode: selectedMode, 
        difficulty: game.difficulty,
        category: selectedCats.join(", "),
        language: language
      });
      setRoomPassword("");
      router.push(`/lobby/${game.gameId}`);
    } catch {
      addToast("error", isRTL ? "فشل في إنشاء اللعبة" : "Failed to create game");
    } finally {
      setLoading(false);
      setIsCreating(false);
    }
  }

  async function handleJoinGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || !canJoin || invalidName) return;
    setJoinError(null);
    setLoading(true);
    try {
      let roomId = invitedRoomId;
      if (!roomId) {
        const lookup = await fetch(`${API}/api/games/join/${joinCode}`);
        if (!lookup.ok) {
          setJoinError(lookup.status === 404 ? "invalid" : lookup.status === 429 ? "rateLimited" : "connection");
          return;
        }
        const { gameId } = await lookup.json();
        if (!isRoomId(gameId)) {
          setJoinError("connection");
          return;
        }
        roomId = gameId;
      }

      if (!useGameStore.getState().userId) {
        const res = await fetch(`${API}/api/auth/guest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: guestName || undefined }),
        });
        if (!res.ok) {
          setJoinError(res.status === 429 ? "rateLimited" : "guest");
          return;
        }
        const data = await res.json();
        setAuth(data);
        setInputUsername(data.username);
        connectSocket(data.userId, data.username, data.token, true);
      }

      router.push(`/lobby/${encodeURIComponent(roomId)}${invitedAsSpectator ? "?spectate=true" : ""}`);
    } catch {
      setJoinError("connection");
    } finally {
      setLoading(false);
    }
  }

  const modes = MODE_THEMES;
  const availableCategories = Object.entries(CATEGORIES).filter(([id]) => getPlayableDifficulties([id]).length > 0);
  const selectedModeDetails = modes.find(mode => mode.mode === selectedMode)!;
  const selectedDifficulty = DIFFICULTIES.find(item => item.value === (selectedMode === GameMode.Custom ? customConfig.difficulty : selectedDiff));
  const stepLabels = isRTL ? ["نمط اللعب", "الأقسام والمواضيع", "إعدادات الغرفة"] : ["Game mode", "Subjects & topics", "Room settings"];

  function toggleCategory(id: string) {
    const category = CATEGORIES[id];
    if (selectedCats.includes(id)) {
      if (selectedCats.length === 1) return;
      setSelectedCats(selectedCats.filter(selected => selected !== id));
      setSelectedTopics(selectedTopics.filter(topic => !category.topics.some(item => item.id === topic)));
    } else {
      setSelectedCats([...selectedCats, id]);
      if (!selectedTopics.some(topic => category.topics.some(item => item.id === topic))) {
        setSelectedTopics([...selectedTopics, category.topics[0].id]);
      }
    }
  }

  const inviteHelp = invitedAsSpectator
    ? (userId ? (isRTL ? "شاهد المعركة بهذا الاسم." : "Watch the match with this name.")
      : (isRTL ? "اختر اسمك لمشاهدة المعركة." : "Choose your name to watch the match."))
    : (userId ? (isRTL ? "انضم إلى الغرفة بهذا الاسم." : "Join the room with this name.")
      : (isRTL ? "اختر اسمك ثم انضم إلى الغرفة." : "Choose your name, then join the room."));

  const nameField = <div className={styles.nameField}>
    <label htmlFor="player-name">{userId ? (isRTL ? "اسم اللاعب" : "Player name") : (isRTL ? "ادخل اسمك" : "Enter your warrior name")}</label>
    <input ref={playerNameInput} disabled={!entryReady} id="player-name" className={styles.textInput} value={userId ? username ?? "" : inputUsername}
      readOnly={!!userId || loading} aria-invalid={invalidName} onChange={event => setInputUsername(event.target.value)}
      maxLength={20} autoComplete="nickname" placeholder={isRTL ? "ادخل اسمك" : "Enter your warrior name"} aria-describedby="player-name-help" />
    <p id="player-name-help" className={invalidName ? styles.error : undefined} aria-live="polite">{userId
      ? (isRTL ? "ستنضم بهذا الاسم." : "You’ll join with this name.")
      : invalidName
        ? (isRTL ? "استخدم حروفًا أو أرقامًا أو مسافات أو شرطات (- أو _)." : "Use letters, numbers, spaces, hyphens or underscores.")
        : (isRTL ? "اتركه فارغًا لاستخدام اسم ضيف تلقائي." : "Leave blank to use an assigned guest name.")}</p>
  </div>;

  return (
    <main className={styles.page} dir={isRTL ? "rtl" : "ltr"}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <Link href="/" className={styles.brand}><img src="/icon-192.svg" width="30" height="30" alt="" />{T.title[language]}</Link>
          <nav className={styles.navigation} aria-label={isRTL ? "القائمة الرئيسية" : "Main navigation"}>
            <Link href="/spectate" className={styles.navLink}>{isRTL ? "شاهد المعارك" : "Watch matches"}</Link>
            <button type="button" className={styles.languageButton} onClick={() => setLanguage(language === "en" ? "ar" : "en")}>
              {isRTL ? "English" : "العربية"}
            </button>
            <Link href={accountHref} className={styles.accountLink}>
              {userId ? (isRTL ? "الملف الشخصي" : "Profile") : (isRTL ? "تسجيل دخول" : "Sign In")}
            </Link>
          </nav>
        </header>

        {view === "home" && <section className={styles.hero} aria-labelledby="home-title">
          <div className={styles.heroArtwork} aria-hidden="true">
            <picture>
              <source media="(max-width: 720px)" srcSet="/battle-atlas-small.webp" />
              <img src="/battle-atlas.webp" alt="" width={1672} height={940} loading="eager" fetchPriority="high" />
            </picture>
          </div>
          <div className={styles.heroCopy}>
            <h1 id="home-title">{T.title[language]}</h1>
            <p className={styles.heroDescription}>{isRTL
              ? "تحدٍ ثقافي مباشر مع الأصدقاء. أنشئ غرفة أو انضم باستخدام الرمز."
              : "A live quiz battle with friends. Create a room or enter a code to begin."}</p>
            {nameField}
            <div className={styles.heroActions}>
              <button type="button" className={styles.primaryButton} disabled={!entryReady || invalidName} onClick={() => { setStep(1); setView("create"); }}>
                {isRTL ? "إنشاء غرفة معركة" : "Create Battle Room"}<span aria-hidden="true">{isRTL ? "←" : "→"}</span>
              </button>
              <button type="button" ref={joinViewButton} disabled={!entryReady} className={styles.secondaryButton} onClick={() => { setJoinError(null); setInvitedRoomId(null); setInvitedAsSpectator(false); setView("join"); }}>
                {isRTL ? "انضمام عبر الكود" : "Join with Code"}
              </button>
            </div>
            {!userId && <p className={styles.guestNote}>{isRTL ? "يمكنك البدء كضيف." : "You can start as a guest."}</p>}
          </div>
        </section>}

        {view === "create" && <section className={styles.flowShell} aria-labelledby="wizard-title">
          <div className={styles.flowHeader}>
            <button type="button" className={styles.backButton} onClick={() => { setView("home"); setStep(1); }}>
              {isRTL ? "العودة للرئيسية" : "Back to home"}
            </button>
            <ol className={styles.stepper} aria-label={isRTL ? "خطوات إنشاء الغرفة" : "Room creation steps"}>
              {stepLabels.map((label, index) => <li key={label}>
                <button type="button" aria-current={step === index + 1 ? "step" : undefined} onClick={() => setStep((index + 1) as 1 | 2 | 3)}>
                  {step > index + 1 && <span aria-hidden="true">✓</span>}{label}
                </button>
              </li>)}
            </ol>
          </div>
          <div className={styles.flowGrid}>
            <div className={styles.flowMain}>
              <h1 ref={wizardHeading} tabIndex={-1} id="wizard-title">{step === 1 ? T.chooseMode[language] : step === 2 ? T.chooseCategory[language] : selectedMode === GameMode.Custom ? (isRTL ? "معركتك المخصصة" : "Your custom battle") : T.difficulty[language]}</h1>

              {step === 1 && <fieldset className={styles.modeGrid}>
                <legend className={styles.srOnly}>{T.chooseMode[language]}</legend>
                {modes.map(mode => <label key={mode.mode} className={`${styles.modeCard} ${selectedMode === mode.mode ? styles.selected : ""}`}>
                  <input type="radio" name="game-mode" value={mode.mode} checked={selectedMode === mode.mode} onChange={() => setSelectedMode(mode.mode)} />
                  <span className={styles.modeName}>{mode.label[language]}</span>
                  <span className={styles.modeDescription}>{mode.desc[language]}</span>
                </label>)}
              </fieldset>}

              {step === 2 && <>
                <p className={styles.intro}>{isRTL ? "اختر قسماً واحداً أو أكثر، ثم حدّد المواضيع." : "Choose one or more subjects, then select your topics."}</p>
                <div className={styles.categoryGrid} aria-label={isRTL ? "الأقسام المتاحة" : "Available categories"}>
                  {availableCategories.map(([id, category]) => <button type="button" key={id}
                    className={`${styles.categoryChoice} ${selectedCats.includes(id) ? styles.selected : ""}`}
                    aria-pressed={selectedCats.includes(id)} disabled={selectedCats.length === 1 && selectedCats.includes(id)} onClick={() => toggleCategory(id)}>
                    <span className={styles.choiceCheck} aria-hidden="true">{selectedCats.includes(id) ? "✓" : ""}</span>{category.label[language]}
                  </button>)}
                </div>
                <div className={styles.topics}>
                  <h2>{isRTL ? "اختر المواضيع" : "Choose topics"}</h2>
                  {selectedCats.map(id => <fieldset key={id} className={styles.topicGroup}>
                    <legend>{CATEGORIES[id].label[language]}</legend>
                    <div className={styles.topicChoices}>{CATEGORIES[id].topics.map(topic => <button type="button" key={topic.id}
                      className={`${styles.topicButton} ${selectedTopics.includes(topic.id) ? styles.selected : ""}`}
                      aria-pressed={selectedTopics.includes(topic.id)} disabled={selectedTopics.length === 1 && selectedTopics.includes(topic.id)}
                      onClick={() => setSelectedTopics(selectedTopics.includes(topic.id) ? selectedTopics.filter(id => id !== topic.id) : [...selectedTopics, topic.id])}>
                      {selectedTopics.includes(topic.id) && <span aria-hidden="true">✓ </span>}{topic.label[language]}
                    </button>)}</div>
                  </fieldset>)}
                </div>
              </>}

              {step === 3 && <div className={styles.settings}>
                {selectedMode === GameMode.Custom ? <div className={styles.customSettings}>
                  <CustomModeBuilder value={customConfig} onChange={setCustomConfig} selectedCategories={selectedCats} language={language} />
                </div> : <>
                  <div className={styles.difficultyGrid}>
                    {DIFFICULTIES.filter(item => playableDifficulties.includes(item.value)).map(item => <button key={item.value} type="button"
                      className={`${styles.difficultyButton} ${selectedDiff === item.value ? styles.selected : ""}`}
                      aria-pressed={selectedDiff === item.value} onClick={() => setSelectedDiff(item.value)}>
                      {item.label[language]}{selectedDiff === item.value && <span aria-hidden="true">✓</span>}
                    </button>)}
                  </div>
                  {playableDifficulties.length < DIFFICULTIES.length && <div className={styles.availabilityNote}>
                    <p role={!playableDifficulties.length ? "alert" : undefined}>{playableDifficulties.length
                      ? (isRTL ? "هذه المستويات متاحة للأقسام المختارة." : "These levels are available for your selected subjects.")
                      : (isRTL ? "لا يوجد مستوى مشترك. غيّر الأقسام أو استخدم معلومات متنوعة." : "No shared difficulty. Change subjects or use mixed trivia.")}</p>
                    <button type="button" className={styles.textButton} onClick={() => { setSelectedCats(["general"]); setSelectedTopics(["trivia"]); }}>
                      {isRTL ? "استخدام معلومات متنوعة" : "Use mixed trivia"}
                    </button>
                  </div>}
                </>}

                <section className={styles.privacy}>
                  <label className={styles.privateToggle}>
                    <input type="checkbox" name="privateRoom" checked={privateRoom} onChange={event => { setPrivateRoom(event.target.checked); if (!event.target.checked) setRoomPassword(""); }} />
                    {isRTL ? "غرفة خاصة بكلمة مرور" : "Private room with a password"}
                  </label>
                  {privateRoom && <div className={styles.passwordField}>
                    <label htmlFor="create-room-password">{isRTL ? "كلمة مرور الغرفة" : "Room password"}</label>
                    <input id="create-room-password" className={styles.textInput} type="password" autoComplete="off" value={roomPassword}
                      aria-describedby="room-password-help" aria-invalid={roomPassword.length > 0 && !isValidRoomPassword(roomPassword)} onChange={event => setRoomPassword(event.target.value)} />
                    <p id="room-password-help">{isRTL ? "شارك كلمة المرور مع من تدعوهم للعب أو المشاهدة." : "Share the password with the people you invite to play or watch."}</p>
                    {roomPassword.length > 0 && !isValidRoomPassword(roomPassword) && <p role="alert" className={styles.error}>{isRTL ? "كلمة المرور طويلة جداً. استخدم كلمة مرور أقصر." : "Password is too long. Please use a shorter password."}</p>}
                  </div>}
                </section>
              </div>}
            </div>

            <aside className={styles.summary} aria-labelledby="room-summary-title">
              <h2 id="room-summary-title">{isRTL ? "ملخص اللعبة" : "Game Summary"}</h2>
              <ul>
                <li>{isRTL ? "النمط" : "Mode"}<strong>{selectedModeDetails.label[language]}</strong></li>
                <li>{isRTL ? "الأقسام" : "Subjects"}<strong>{effectiveCategories.map(id => CATEGORIES[id]?.label[language] ?? id).join(isRTL ? "، " : ", ")}</strong></li>
                <li>{isRTL ? "المواضيع" : "Topics"}<strong>{!selectedTopics.length || (selectedMode === GameMode.Custom && customConfig.categoryFilter) ? (isRTL ? "جميع مواضيع القسم" : "All subject topics") : selectedTopics.length}</strong></li>
                {step === 3 && <li>{isRTL ? "الصعوبة" : "Difficulty"}<strong>{selectedDifficulty?.label[language]}</strong></li>}
                <li>{isRTL ? "الغرفة" : "Room"}<strong>{privateRoom ? (isRTL ? "خاصة" : "Private") : (isRTL ? "عامة" : "Public")}</strong></li>
                {selectedMode === GameMode.Custom && step === 3 && <li>{isRTL ? "الجولات" : "Rounds"}<strong>{customConfig.rounds}</strong></li>}
              </ul>
            </aside>
          </div>
          <div className={styles.flowActions}>
            {step > 1 && <button type="button" className={styles.secondaryButton} onClick={() => setStep((step - 1) as 1 | 2)}>{isRTL ? "← السابق" : "← Back"}</button>}
            {step < 3 ? <button type="button" className={styles.primaryButton} onClick={() => setStep((step + 1) as 2 | 3)}>{isRTL ? "التالي →" : "Next →"}</button>
              : <button type="button" className={styles.primaryButton} onClick={handleCreateGame}
                disabled={loading || isCreating || !canCreateWithQuestions || (privateRoom && !isValidRoomPassword(roomPassword))}>
                {isCreating ? (isRTL ? "جارٍ الإنشاء..." : "Creating...") : (isRTL ? "إنشاء غرفة معركة" : "Create Battle Room")}
              </button>}
          </div>
        </section>}

        {view === "join" && <section className={styles.joinShell}>
          <button type="button" className={styles.backButton} disabled={loading} onClick={() => { returnToJoinButton.current = true; setInvitedRoomId(null); setInvitedAsSpectator(false); setView("home"); }}>{T.back[language]}</button>
          <form className={styles.joinCard} onSubmit={handleJoinGame} aria-busy={loading}>
            <h1 id="join-code-heading">{invitedRoomId ? (isRTL ? "الانضمام إلى الغرفة" : "Join invited room") : (isRTL ? "كود الانضمام" : "Join Code")}</h1>
            <p id="join-code-help" className={styles.intro}>{canJoin ? inviteHelp
              : (isRTL ? "أدخل رمز الغرفة المكون من 6 خانات." : "Enter the 6-character room code.")}</p>
            {!invitedRoomId && <input ref={joinCodeInput} className={styles.codeInput} aria-labelledby="join-code-heading" aria-describedby={joinError ? "join-code-help join-code-error" : "join-code-help"}
              aria-invalid={joinError === "invalid" || joinError === "format"} autoCapitalize="characters" autoComplete="off" spellCheck={false} dir="ltr" readOnly={loading}
              value={joinCode} onChange={event => { setJoinCode(normalizeRoomCode(event.target.value)); setJoinError(null); }} placeholder="ABCXYZ" maxLength={32} />}
            {nameField}
            {joinError && <p id="join-code-error" role="alert" className={styles.error}>{T.joinErrors[joinError][language]}</p>}
            <button type="submit" ref={joinSubmit} className={styles.primaryButton} disabled={loading || !canJoin || invalidName}>{loading
              ? invitedAsSpectator ? (isRTL ? "جارٍ فتح المعركة..." : "Opening match...") : (isRTL ? "جارٍ الانضمام..." : "Joining...")
              : invitedAsSpectator ? (isRTL ? "شاهد المعركة" : "Watch match") : (isRTL ? "انضم إلى الغرفة" : "Join room")}</button>
            {invitedRoomId && <button type="button" className={styles.textButton} disabled={loading} onClick={() => { setInvitedRoomId(null); setInvitedAsSpectator(false); setJoinCode(""); setJoinError(null); }}>
              {isRTL ? "استخدام رمز غرفة أخرى" : "Use another room code"}
            </button>}
          </form>
        </section>}

        <footer className={styles.footer}>
          <span>© {new Date().getFullYear()} {T.title[language]}</span>
          <Link href="/spectate" className={styles.mobileWatchLink}>{isRTL ? "شاهد المعارك" : "Watch matches"}</Link>
        </footer>
      </div>
    </main>
  );
}

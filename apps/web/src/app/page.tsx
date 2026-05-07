"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GameMode, Difficulty, GAME_MODE_CONFIG } from "@quiz-battle/shared";
import { useGameStore } from "@/store/gameStore";
import { connectSocket } from "@/lib/socket";
import { ModeVisualSelector } from "@/components/ModeVisualSelector";
import { CustomModeBuilder } from "@/components/CustomModeBuilder";

// Purchase status type
interface PurchaseStatus {
  hasPurchased: boolean;
  shortGames: number;
  longGames: number;
  price: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME MODE THEMES - Each mode has unique visual identity
// ═══════════════════════════════════════════════════════════════════════════════
interface ModeTheme {
  mode: GameMode;
  label: { en: string; ar: string };
  icon: string;
  desc: { en: string; ar: string };
  rounds: number;
  // Visual Theme Properties
  gradient: string;
  glowColor: string;
  borderColor: string;
  iconBg: string;
  particleEffect?: string;
}

const MODE_THEMES: ModeTheme[] = [
  { 
    mode: GameMode.Classic, 
    label: { en: "Classic", ar: "كلاسيك" }, 
    icon: "⚔️", 
    desc: { en: "Forge your legend alone or with friends", ar: "اصنع أسطورتك مع الأصدقاء" }, 
    rounds: 15,
    gradient: "linear-gradient(135deg, #6c63ff 0%, #a855f7 50%, #6366f1 100%)",
    glowColor: "rgba(108, 99, 255, 0.5)",
    borderColor: "rgba(108, 99, 255, 0.3)",
    iconBg: "linear-gradient(135deg, #6c63ff 0%, #a855f7 100%)",
    particleEffect: "swords"
  },
  { 
    mode: GameMode.Survival, 
    label: { en: "Survival", ar: "بقاء" }, 
    icon: "💀", 
    desc: { en: "One wrong answer = elimination", ar: "خطأ واحد = الإقصاء" }, 
    rounds: 25,
    gradient: "linear-gradient(135deg, #ff4757 0%, #ff6348 50%, #ff3838 100%)",
    glowColor: "rgba(255, 71, 87, 0.5)",
    borderColor: "rgba(255, 71, 87, 0.3)",
    iconBg: "linear-gradient(135deg, #ff4757 0%, #ff3838 100%)",
    particleEffect: "skulls"
  },
  { 
    mode: GameMode.Conquest, 
    label: { en: "Conquest", ar: "غزو" }, 
    icon: "🌍", 
    desc: { en: "Conquer the world map", ar: "اغزُ خريطة العالم" }, 
    rounds: 12,
    gradient: "linear-gradient(135deg, #2ed573 0%, #1e90ff 50%, #7bed9f 100%)",
    glowColor: "rgba(46, 213, 115, 0.5)",
    borderColor: "rgba(46, 213, 115, 0.3)",
    iconBg: "linear-gradient(135deg, #2ed573 0%, #1e90ff 100%)",
    particleEffect: "earth"
  },
  { 
    mode: GameMode.Chaos, 
    label: { en: "Chaos", ar: "فوضى" }, 
    icon: "😈", 
    desc: { en: "Expect the unexpected", ar: "توقع ما لا يُتوقع" }, 
    rounds: 15,
    gradient: "linear-gradient(135deg, #ff00ff 0%, #00ffff 50%, #ff00ff 100%)",
    glowColor: "rgba(255, 0, 255, 0.6)",
    borderColor: "rgba(255, 0, 255, 0.4)",
    iconBg: "linear-gradient(135deg, #ff00ff 0%, #00ffff 100%)",
    particleEffect: "chaos"
  },
  { 
    mode: GameMode.Custom, 
    label: { en: "Custom", ar: "مخصص" }, 
    icon: "⚙️", 
    desc: { en: "Create your own rules", ar: "ابتكر قواعدك الخاصة" }, 
    rounds: 15,
    gradient: "linear-gradient(135deg, #8b5cf6 0%, #a78bfa 50%, #7c3aed 100%)",
    glowColor: "rgba(139, 92, 246, 0.5)",
    borderColor: "rgba(139, 92, 246, 0.3)",
    iconBg: "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
    particleEffect: "gears"
  },
];

const DIFFICULTIES = [
  { value: Difficulty.Novice, label: { en: "Novice", ar: "مبتدئ" }, color: "#00e676", icon: "🌱" },
  { value: Difficulty.Scholar, label: { en: "Scholar", ar: "باحث" }, color: "#00d4ff", icon: "📚" },
  { value: Difficulty.Sage, label: { en: "Sage", ar: "حكيم" }, color: "#ffa502", icon: "🦉" },
  { value: Difficulty.Master, label: { en: "Master", ar: "خبير" }, color: "#ff6b6b", icon: "⚔️" },
  { value: Difficulty.Legend, label: { en: "Legend", ar: "أسطورة" }, color: "#ffd700", icon: "👑" },
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
    setAuth, setGame, addToast, userId, username, token,
    language, setLanguage
  } = useGameStore();

  const [view, setView] = useState<"home" | "create" | "join" | "buy">("home");
  const [selectedMode, setSelectedMode] = useState<GameMode>(GameMode.Classic);
  const [selectedDiff, setSelectedDiff] = useState<Difficulty>(Difficulty.Sage);
  const [selectedCats, setSelectedCats] = useState<string[]>(["general"]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(["trivia"]);
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [inputUsername, setInputUsername] = useState(username || `Warrior${Math.floor(Math.random() * 9999)}`);
  const [botCount, setBotCount] = useState<number>(0);
  const [customRounds, setCustomRounds] = useState<number | null>(null);
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  const [customConfig, setCustomConfig] = useState<any>(null);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isCreating, setIsCreating] = useState(false);

  // Purchase status
  const [purchaseStatus, setPurchaseStatus] = useState<PurchaseStatus | null>(null);
  const [checkingPurchase, setCheckingPurchase] = useState(true);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";

  const isRTL = language === "ar";

  // Check purchase status on mount
  useEffect(() => {
    async function checkPurchaseStatus() {
      if (!userId || !token) {
        setPurchaseStatus({
          hasPurchased: false,
          shortGames: 0,
          longGames: 0,
          price: 35,
        });
        setCheckingPurchase(false);
        return;
      }

      try {
        const res = await fetch(`${API}/api/purchase/status`, {
          headers: { Authorization: `Bearer ${token || ""}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPurchaseStatus({
            hasPurchased: Boolean(data.hasPurchased),
            shortGames: Number(data.shortGames ?? 0),
            longGames: Number(data.longGames ?? 0),
            price: Number(data.price ?? 35),
          });
        } else {
          setPurchaseStatus({
            hasPurchased: false,
            shortGames: 0,
            longGames: 0,
            price: 35,
          });
        }
      } catch (_err) {
        setPurchaseStatus({
          hasPurchased: false,
          shortGames: 0,
          longGames: 0,
          price: 35,
        });
      } finally {
        setCheckingPurchase(false);
      }
    }

    checkPurchaseStatus();
  }, [userId, token, API]);

  async function handlePurchase() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/purchase/buy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentMethod: "paypal" }),
      });

      if (!res.ok) {
        const error = await res.json();
        addToast("error", error.error || "Purchase failed");
        return;
      }

      const data = await res.json();
      setPurchaseStatus({
        hasPurchased: true,
        shortGames: data.shortGames,
        longGames: data.longGames,
        price: purchaseStatus?.price || 35,
      });
      addToast("success", "Game purchased successfully!");
      setView("home");
    } catch (err) {
      addToast("error", "Failed to purchase game");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateGame() {
    setLoading(true);
    setIsCreating(true);
    try {
      const store = useGameStore.getState();
      let currentId = store.userId;
      let currentToken = store.token;
      let currentName = inputUsername;

      if (!currentId) {
        const res = await fetch(`${API}/api/auth/guest`, { method: "POST" });
        if (!res.ok) {
          addToast("error", isRTL ? "فشل إنشاء حساب ضيف" : "Failed to create guest account");
          return;
        }
        const data = await res.json();
        setAuth({ ...data, username: currentName });
        connectSocket(data.userId, currentName, data.token, true);
        currentId = data.userId;
        currentToken = data.token;
      }

      const gameConfig: any = {
        mode: selectedMode,
        difficulty: selectedDiff,
        categories: selectedCats,
        subcategories: selectedTopics,
        username: currentName,
        language: language // LOCK LANGUAGE
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
        if (res.status === 402) {
          setView("buy");
        }
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
        difficulty: selectedDiff,
        category: selectedCats.join(", "),
        language: language
      });
      router.push(`/lobby/${game.gameId}`);
    } catch {
      addToast("error", isRTL ? "فشل في إنشاء اللعبة" : "Failed to create game");
    } finally {
      setLoading(false);
      setIsCreating(false);
    }
  }

  async function handleJoinGame() {
    if (!joinCode.trim()) return;
    setLoading(true);
    try {
      const store = useGameStore.getState();
      let currentId = store.userId;

      if (!currentId) {
        const res = await fetch(`${API}/api/auth/guest`, { method: "POST" });
        if (!res.ok) {
          addToast("error", isRTL ? "فشل إنشاء حساب ضيف" : "Failed to create guest account");
          return;
        }
        const data = await res.json();
        setAuth({ ...data, username: inputUsername });
        connectSocket(data.userId, inputUsername, data.token, true);
        currentId = data.userId;
      }

      const res = await fetch(`${API}/api/games/join/${joinCode.trim()}`);
      if (!res.ok) { addToast("error", isRTL ? "كود غير صحيح" : "Invalid join code"); return; }
      const { gameId } = await res.json();
      router.push(`/lobby/${gameId}`);
    } catch {
      addToast("error", isRTL ? "فشل في الانضمام" : "Failed to join game");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page" dir={isRTL ? "rtl" : "ltr"} style={{ background: "var(--clr-bg)" }}>
      {/* Background orbs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 0 }}>
        <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(108,99,255,0.12) 0%, transparent 70%)", top: -100, [isRTL ? "right" : "left"]: -100 }} />
        <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)", bottom: 0, [isRTL ? "left" : "right"]: -50 }} />
      </div>

      <div className="container" style={{ position: "relative", zIndex: 1, padding: "40px 20px", display: "flex", flexDirection: "column", minHeight: "100dvh" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", marginBottom: 20 }}>
          <Link href="/" className="font-black text-xl" style={{ textDecoration: "none", color: "var(--clr-text)" }}>
            ⚔️ {T.title[language]}
          </Link>
          
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button 
              className="btn btn-ghost btn-sm" 
              onClick={() => setLanguage(language === "en" ? "ar" : "en")}
              style={{ fontWeight: 800, fontSize: "0.85rem", color: "var(--clr-primary)" }}
            >
              {language === "en" ? "العربية 🇸🇦" : "English 🇺🇸"}
            </button>

            {userId ? (
              <Link href="/profile" className="btn btn-secondary btn-sm" style={{ padding: "8px 16px" }}>👤 {isRTL ? "الملف الشخصي" : "Profile"}</Link>
            ) : (
              <Link href="/login" className="btn btn-secondary btn-sm" style={{ padding: "8px 16px" }}>{isRTL ? "تسجيل دخول" : "Sign In"}</Link>
            )}
          </div>
        </div>

        {/* Hero */}
        <div className="text-center animate-fade-in" style={{ paddingTop: 40, paddingBottom: 48 }}>
          <div style={{ 
            fontSize: "5rem", 
            marginBottom: 16, 
            animation: "float 3s ease-in-out infinite",
            filter: "drop-shadow(0 8px 24px rgba(108, 99, 255, 0.5))"
          }}>⚔️</div>
          <h1 style={{ 
            fontSize: "clamp(2.5rem, 6vw, 4.5rem)", 
            fontWeight: 900, 
            letterSpacing: isRTL ? "0" : "-0.03em", 
            lineHeight: 1.1, 
            marginBottom: 20 
          }}>
            <span style={{ 
              background: "var(--grad-primary)", 
              WebkitBackgroundClip: "text", 
              WebkitTextFillColor: "transparent",
              position: "relative",
              display: "inline-block"
            }}>
              {T.title[language]}
              <div style={{
                position: "absolute",
                inset: 0,
                background: "var(--grad-primary)",
                filter: "blur(20px)",
                opacity: 0.3,
                zIndex: -1
              }} />
            </span>
          </h1>
          <p className="text-muted" style={{ 
            fontSize: "1.15rem", 
            maxWidth: 520, 
            margin: "0 auto 32px", 
            lineHeight: 1.7,
            fontWeight: 500
          }}>
            {T.tagline[language]}
          </p>
        </div>

        {/* Loading State */}
        {checkingPurchase && (
          <div className="text-center animate-fade-in" style={{ padding: 80 }}>
            <div style={{ fontSize: "4rem", marginBottom: 20, animation: "float 2s ease-in-out infinite" }}>⚔️</div>
            <div className="text-muted" style={{ fontSize: "1.1rem" }}>{isRTL ? "جاري التحميل..." : "Loading..."}</div>
            <div style={{ 
              width: 200, 
              height: 4, 
              background: "var(--clr-surface-2)", 
              borderRadius: "var(--radius-full)",
              margin: "20px auto 0",
              overflow: "hidden"
            }}>
              <div style={{
                width: "40%",
                height: "100%",
                background: "var(--grad-primary)",
                borderRadius: "var(--radius-full)",
                animation: "shimmer 1.5s ease-in-out infinite"
              }} />
            </div>
          </div>
        )}

        {/* Main View */}
        {view === "home" && (
          <div className="animate-scale-in" style={{ maxWidth: 520, margin: "0 auto", width: "100%" }}>
            {/* Game Credits Display */}
            <div className="glass-card p-5 mb-6" style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(3, 1fr)", 
              gap: 20,
              textAlign: "center",
              background: "linear-gradient(135deg, rgba(108,99,255,0.08) 0%, rgba(168,85,247,0.05) 100%)",
              border: "1px solid rgba(108,99,255,0.2)"
            }}>
              <div>
                <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>⚡</div>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, color: (purchaseStatus?.shortGames || 0) > 0 ? "#00e676" : "#ff6b6b", marginBottom: 4 }}>
                  {purchaseStatus?.shortGames ?? 0}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--clr-text-2)", fontWeight: 600 }}>{isRTL ? "ألعاب قصيرة" : "Short Games"}</div>
                <div style={{ fontSize: "0.65rem", color: "var(--clr-text-3)" }}>1-5 {isRTL ? "جولات" : "rounds"}</div>
              </div>
              <div>
                <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>🏆</div>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, color: (purchaseStatus?.longGames || 0) > 0 ? "#00d4ff" : "#ff6b6b", marginBottom: 4 }}>
                  {purchaseStatus?.longGames ?? 0}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--clr-text-2)", fontWeight: 600 }}>{isRTL ? "ألعاب طويلة" : "Long Games"}</div>
                <div style={{ fontSize: "0.65rem", color: "var(--clr-text-3)" }}>10-15 {isRTL ? "جولة" : "rounds"}</div>
              </div>
              <div>
                <div style={{ fontSize: "2.5rem", marginBottom: 8 }}>🎁</div>
                <div style={{ fontSize: "1.8rem", fontWeight: 900, color: "#ffa502", marginBottom: 4 }}>∞</div>
                <div style={{ fontSize: "0.75rem", color: "var(--clr-text-2)", fontWeight: 600 }}>{isRTL ? "مجاني" : "Free"}</div>
                <div style={{ fontSize: "0.65rem", color: "var(--clr-text-3)" }}>6-9 {isRTL ? "جولات" : "rounds"}</div>
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label className="text-muted text-sm" style={{ display: "block", marginBottom: 10, textAlign: isRTL ? "right" : "left", fontWeight: 600 }}>
                {T.warriorName[language]}
              </label>
              <input
                className="input"
                value={inputUsername}
                onChange={(e) => setInputUsername(e.target.value)}
                placeholder={isRTL ? "ادخل اسمك" : "Enter your warrior name"}
                maxLength={20}
                style={{ 
                  textAlign: isRTL ? "right" : "left",
                  height: 56,
                  fontSize: "1.05rem",
                  fontWeight: 600
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <button
                className="btn btn-primary btn-lg w-full"
                style={{
                  background: "var(--grad-primary)",
                  border: "none",
                  boxShadow: "0 12px 40px rgba(108,99,255,0.4)",
                  height: 68,
                  fontSize: "1.25rem",
                  fontWeight: 800,
                  position: "relative",
                  overflow: "hidden"
                }}
                onClick={() => setView("create")}
              >
                <span style={{ position: "relative", zIndex: 1 }}>🏰 {isRTL ? "إنشاء غرفة معركة" : "Create Battle Room"}</span>
              </button>

              <button
                className="btn btn-secondary btn-lg w-full"
                style={{ 
                  height: 64, 
                  fontSize: "1.15rem",
                  fontWeight: 700,
                  border: "2px solid var(--clr-border)"
                }}
                onClick={() => setView("join")}
              >
                🔑 {isRTL ? "انضمام عبر الكود" : "Join with Code"}
              </button>

              {!purchaseStatus?.hasPurchased && (
                <button
                  className="btn btn-ghost btn-lg w-full"
                  style={{ 
                    height: 56, 
                    fontSize: "1rem", 
                    border: "2px solid var(--clr-primary)",
                    fontWeight: 700,
                    color: "var(--clr-primary)"
                  }}
                  onClick={() => setView("buy")}
                >
                  💎 {isRTL ? "شراء الوصول للاستضافة" : "Buy Hosting Access"}
                </button>
              )}
            </div>

            <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 40, flexWrap: "wrap" }}>
              {[["👁️ Spectate", "بث مباشر", "/spectate"]].map(([en, ar, href]) => (
                <Link key={href} href={href} className="text-muted hover:text-white text-sm font-semibold transition-all">
                  {language === "en" ? en : ar}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Buy Game View */}
        {view === "buy" && (
          <div className="animate-scale-in" style={{ maxWidth: 480, margin: "0 auto", width: "100%" }}>
            <div className="glass-card p-8 text-center" style={{ border: "2px solid var(--clr-primary)" }}>
              <div style={{ fontSize: "3rem", marginBottom: 16 }}>🎮</div>
              <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: 12 }}>
                {isRTL ? "اشترِ اللعبة" : "Buy the Game"}
              </h2>
              <p className="text-muted" style={{ marginBottom: 24 }}>
                {isRTL
                  ? "اشترِ اللعبة مرة واحدة واستضف حتى 3 ألعاب قصيرة و 2 طويلة"
                  : "Buy once to host up to 3 short games (1-5 rounds) and 2 long games (10-15 rounds). Medium games (6-9 rounds) are always FREE!"}
              </p>

              <div style={{ display: "flex", justifyContent: "center", gap: 30, marginBottom: 24 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "2rem" }}>3</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--clr-muted)" }}>{isRTL ? "ألعاب قصيرة" : "Short Games"}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "2rem" }}>2</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--clr-muted)" }}>{isRTL ? "ألعاب طويلة" : "Long Games"}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "2rem" }}>∞</div>
                  <div style={{ fontSize: "0.8rem", color: "var(--clr-muted)" }}>{isRTL ? "مجاني" : "Free (6-9)"}</div>
                </div>
              </div>

              <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--clr-primary)", marginBottom: 24 }}>
                {purchaseStatus?.price || 35} QAR
              </div>

              <button
                className="btn btn-primary btn-lg w-full"
                onClick={handlePurchase}
                disabled={loading}
                style={{ height: 60, fontSize: "1.2rem" }}
              >
                {loading ? "..." : (isRTL ? "اشترِ الآن 💎" : "Buy Now 💎")}
              </button>

              {userId && (
                <button
                  className="btn btn-ghost btn-sm w-full mt-4"
                  onClick={() => setView("join")}
                >
                  {isRTL ? "انضم للعبة بدلاً من ذلك" : "Join a Game Instead"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Create Game View - Step by Step */}
        {view === "create" && (
          <div className="animate-scale-in" style={{ maxWidth: 680, margin: "0 auto", width: "100%" }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { setView("home"); setStep(1); }} style={{ marginBottom: 24 }}>
              {T.back[language]}
            </button>

            {/* Progress Steps */}
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginBottom: 32 }}>
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  style={{
                    width: step >= s ? 48 : 40,
                    height: step >= s ? 48 : 40,
                    borderRadius: "50%",
                    background: step >= s ? "var(--grad-primary)" : "var(--clr-surface-2)",
                    border: step === s ? "3px solid var(--clr-primary)" : "2px solid var(--clr-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: "1.1rem",
                    transition: "all 0.3s ease",
                    boxShadow: step === s ? "0 0 20px rgba(108,99,255,0.5)" : "none"
                  }}
                >
                  {s}
                </div>
              ))}
            </div>

            {/* Step 1: Mode Selection */}
            {step === 1 && (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-bold mb-6" style={{ textAlign: "center" }}>
                  {T.chooseMode[language]}
                </h2>
                <ModeVisualSelector
                  selectedMode={selectedMode}
                  onSelect={setSelectedMode}
                  language={language}
                />
                <button
                  className="btn btn-primary btn-lg w-full mt-8"
                  onClick={() => setStep(2)}
                  style={{ height: 60, fontSize: "1.1rem" }}
                >
                  {isRTL ? "التالي →" : "Next →"}
                </button>
              </div>
            )}

            {/* Step 2: Category & Topics */}
            {step === 2 && (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-bold mb-4" style={{ textAlign: "center" }}>
                  {T.chooseCategory[language]}
                </h2>
                <p className="text-muted text-sm mb-6" style={{ textAlign: "center" }}>
                  {isRTL ? "اختر فئة واحدة أو أكثر، ثم اختر المواضيع" : "Select one or more categories, then choose topics"}
                </p>
                
                {/* ALL Categories - Scrollable */}
                <div className="glass-card p-6 mb-6" style={{ maxHeight: "50vh", overflowY: "auto" }}>
                  <div className="text-sm font-bold mb-3" style={{ color: "var(--clr-primary)" }}>
                    {isRTL ? "الفئات المتاحة" : "Available Categories"} ({Object.keys(CATEGORIES).length})
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
                    {Object.entries(CATEGORIES).map(([id, cat]) => {
                      const isSelected = selectedCats.includes(id);
                      return (
                        <div
                          key={id}
                          className={`mode-card category-card ${isSelected ? "selected" : ""}`}
                          onClick={() => { 
                            if (isSelected) {
                              // Deselect category
                              const newCats = selectedCats.filter(c => c !== id);
                              if (newCats.length === 0) return; // Must have at least 1
                              setSelectedCats(newCats);
                              // Remove topics from this category
                              const catTopicIds = cat.topics.map(t => t.id);
                              setSelectedTopics(selectedTopics.filter(t => !catTopicIds.includes(t)));
                            } else {
                              // Select category
                              setSelectedCats([...selectedCats, id]);
                              // Auto-select first topic
                              if (!selectedTopics.some(t => cat.topics.map(tp => tp.id).includes(t))) {
                                setSelectedTopics([...selectedTopics, cat.topics[0].id]);
                              }
                            }
                          }}
                          style={{ 
                            padding: "16px 12px", 
                            textAlign: "center",
                            background: isSelected 
                              ? "linear-gradient(135deg, rgba(108, 99, 255, 0.25) 0%, rgba(168, 85, 247, 0.15) 100%)" 
                              : undefined,
                            borderColor: isSelected ? "rgba(108, 99, 255, 0.6)" : undefined,
                            boxShadow: isSelected ? "0 8px 32px rgba(108, 99, 255, 0.4)" : undefined,
                            transform: isSelected ? "scale(1.02)" : "scale(1)",
                            cursor: "pointer",
                            position: "relative"
                          }}
                        >
                          {isSelected && (
                            <div style={{ 
                              position: "absolute",
                              top: 6,
                              right: 6,
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              background: "var(--clr-success)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.7rem",
                              fontWeight: 900,
                              color: "white"
                            }}>✓</div>
                          )}
                          <div style={{ 
                            fontSize: "2.2rem", 
                            marginBottom: 6,
                            filter: isSelected ? "drop-shadow(0 4px 12px rgba(108, 99, 255, 0.6))" : "none"
                          }}>{cat.icon}</div>
                          <div style={{ 
                            fontWeight: 800, 
                            fontSize: "0.8rem",
                            color: isSelected ? "#fff" : undefined,
                            lineHeight: 1.2
                          }}>{cat.label[language]}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Topics for Selected Categories */}
                {selectedCats.length > 0 && (
                  <div className="glass-card p-6 mb-6" style={{ maxHeight: "40vh", overflowY: "auto" }}>
                    <div className="text-sm font-bold mb-3" style={{ color: "var(--clr-primary)" }}>
                      {isRTL ? "اختر المواضيع" : "Choose Topics"}
                    </div>
                    {selectedCats.map(catId => (
                      <div key={catId} style={{ marginBottom: 16 }}>
                        <div className="text-xs font-bold uppercase tracking-widest text-muted mb-2" style={{ color: "var(--clr-secondary)", opacity: 0.9 }}>
                          {CATEGORIES[catId].icon} {CATEGORIES[catId].label[language]}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {CATEGORIES[catId].topics.map((topic) => {
                            const isSelected = selectedTopics.includes(topic.id);
                            return (
                              <button
                                key={topic.id}
                                onClick={() => {
                                  if (isSelected) {
                                    const newTopics = selectedTopics.filter(t => t !== topic.id);
                                    if (newTopics.length > 0) setSelectedTopics(newTopics);
                                  } else {
                                    setSelectedTopics([...selectedTopics, topic.id]);
                                  }
                                }}
                                style={{
                                  padding: "8px 12px",
                                  borderRadius: "var(--radius-full)",
                                  border: `2px solid ${isSelected ? "var(--clr-primary)" : "var(--clr-border)"}`,
                                  background: isSelected ? "rgba(108, 99, 255, 0.2)" : "var(--clr-surface-2)",
                                  color: isSelected ? "#fff" : "var(--clr-text-2)",
                                  fontWeight: isSelected ? 700 : 500,
                                  cursor: "pointer",
                                  fontSize: "0.8rem",
                                  transition: "all 0.2s ease"
                                }}
                              >
                                {isSelected && "✓ "}{topic.label[language]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Selection Summary */}
                <div className="glass-card p-4 mb-6" style={{ background: "rgba(108,99,255,0.08)", border: "1px solid rgba(108,99,255,0.3)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span className="text-sm font-bold" style={{ color: "var(--clr-primary)" }}>
                        {isRTL ? "الفئات:" : "Categories:"}
                      </span>
                      <span className="text-sm ml-2" style={{ fontWeight: 600 }}>{selectedCats.length}</span>
                    </div>
                    <div>
                      <span className="text-sm font-bold" style={{ color: "var(--clr-secondary)" }}>
                        {isRTL ? "المواضيع:" : "Topics:"}
                      </span>
                      <span className="text-sm ml-2" style={{ fontWeight: 600 }}>{selectedTopics.length}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    className="btn btn-secondary btn-lg"
                    onClick={() => setStep(1)}
                    style={{ height: 60, fontSize: "1.1rem", flex: 1 }}
                  >
                    {isRTL ? "← السابق" : "← Back"}
                  </button>
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={() => setStep(3)}
                    style={{ height: 60, fontSize: "1.1rem", flex: 2 }}
                  >
                    {isRTL ? "التالي →" : "Next →"}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Difficulty & Create */}
            {step === 3 && (
              <div className="animate-fade-in">
                <h2 className="text-2xl font-bold mb-6" style={{ textAlign: "center" }}>
                  {T.difficulty[language]}
                </h2>
                
                <div className="glass-card p-6 mb-6">
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
                    {DIFFICULTIES.map(({ value, label, color, icon }) => (
                      <button
                        key={value}
                        onClick={() => setSelectedDiff(value)}
                        style={{
                          padding: "20px 16px",
                          borderRadius: "var(--radius-lg)",
                          border: `3px solid ${selectedDiff === value ? color : "var(--clr-border)"}`,
                          background: selectedDiff === value ? `${color}25` : "var(--clr-surface-2)",
                          color: selectedDiff === value ? color : "var(--clr-text-2)",
                          fontWeight: 800,
                          cursor: "pointer",
                          fontSize: "1rem",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 8,
                          transition: "all 0.3s ease",
                          transform: selectedDiff === value ? "scale(1.05)" : "scale(1)",
                          boxShadow: selectedDiff === value ? `0 8px 24px ${color}40` : "none"
                        }}
                      >
                        <span style={{ fontSize: "2rem" }}>{icon}</span>
                        <span>{label[language]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="glass-card p-5 mb-6" style={{ background: "rgba(108,99,255,0.08)", border: "1px solid rgba(108,99,255,0.3)" }}>
                  <div className="text-sm font-bold mb-3" style={{ color: "var(--clr-primary)" }}>
                    {isRTL ? "ملخص اللعبة" : "Game Summary"}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: "0.9rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span className="text-muted">{isRTL ? "الوضع:" : "Mode:"}</span>
                      <span className="font-bold">{MODE_THEMES.find(m => m.mode === selectedMode)?.label[language]}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span className="text-muted">{isRTL ? "الصعوبة:" : "Difficulty:"}</span>
                      <span className="font-bold">{DIFFICULTIES.find(d => d.value === selectedDiff)?.label[language]}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span className="text-muted">{isRTL ? "الفئات:" : "Categories:"}</span>
                      <span className="font-bold">{selectedCats.length}</span>
                    </div>
                  </div>
                </div>

                {/* Custom Mode Builder */}
                {selectedMode === GameMode.Custom && (
                  <div className="mb-6 animate-fade-in">
                    <CustomModeBuilder
                      isOpen={true}
                      onClose={() => {}}
                      onSave={(config) => {
                        setCustomConfig(config);
                        addToast("success", isRTL ? "تم حفظ الإعدادات المخصصة" : "Custom settings saved");
                      }}
                      language={language}
                    />
                  </div>
                )}

                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    className="btn btn-secondary btn-lg"
                    onClick={() => setStep(2)}
                    style={{ height: 60, fontSize: "1.1rem", flex: 1 }}
                  >
                    {isRTL ? "← السابق" : "← Back"}
                  </button>
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleCreateGame}
                    disabled={loading || isCreating}
                    style={{ height: 60, fontSize: "1.2rem", fontWeight: 900, flex: 2, boxShadow: "0 12px 40px rgba(108,99,255,0.5)" }}
                  >
                    {isCreating ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ width: 20, height: 20, border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                        {isRTL ? "جاري الإنشاء..." : "Creating..."}
                      </span>
                    ) : `⚔️ ${T.createRoom[language]}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Join View */}
        {view === "join" && (
          <div className="animate-scale-in" style={{ maxWidth: 400, margin: "0 auto", width: "100%" }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setView("home")} style={{ marginBottom: 24 }}>
              {T.back[language]}
            </button>

            <div className="glass-card p-8 text-center">
              <h2 className="text-2xl font-bold mb-2">{T.joinCode[language]}</h2>
              <p className="text-muted text-sm mb-8">{isRTL ? "أدخل الكود المكون من 6 أرقام" : "Enter the 6-character code"}</p>

              <input
                className="input"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="ABCXYZ"
                maxLength={6}
                style={{ 
                  textAlign: "center", 
                  fontSize: "2rem", 
                  fontWeight: 900, 
                  letterSpacing: "0.2em", 
                  fontFamily: "monospace", 
                  marginBottom: 24,
                  height: 70
                }}
              />

              <button
                className="btn btn-primary btn-lg w-full"
                onClick={handleJoinGame}
                disabled={loading || joinCode.length < 6}
                style={{ height: 60, fontSize: "1.1rem" }}
              >
                {loading ? "..." : T.joinCode[language]}
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div style={{ marginTop: "auto", paddingTop: 40, textAlign: "center" }}>
          <p className="text-muted text-xs opacity-50">
            © 2024 Sword of Knowledge • سيف المعرفة. All rights reserved.
          </p>
        </div>
      </div>
    </main>
  );
}

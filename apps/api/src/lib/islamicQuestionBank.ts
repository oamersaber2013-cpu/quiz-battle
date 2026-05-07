import { Difficulty, ClientQuestion } from "@quiz-battle/shared";

// ═══════════════════════════════════════════════════════════════════════════════
// ISLAMIC KNOWLEDGE QUESTION BANK
// Verified Islamic Content - Quran, Hadith, Seerah, Fiqh, Prophets
// Multilingual: Arabic + English
// ═══════════════════════════════════════════════════════════════════════════════

export interface MultilingualQuestion {
  id?: string;
  text: { en: string; ar: string };
  options: { en: string[]; ar: string[] };
  correctIndex: number;
  category: string;
  subcategory: string;
  difficulty: Difficulty;
  timeLimit: number;
  explanation?: { en: string; ar: string };
  reference?: string; // Quran verse, Hadith number, etc.
}

// Helper to convert multilingual to ClientQuestion format
export function toClientQuestion(q: MultilingualQuestion, lang: 'en' | 'ar' = 'en'): Omit<ClientQuestion, "id" | "activePowerUps"> & { correctIndex: number } {
  return {
    text: q.text[lang],
    options: q.options[lang],
    correctIndex: q.correctIndex,
    category: q.subcategory,
    difficulty: q.difficulty,
    timeLimit: q.timeLimit,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// QURAN QUESTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const QURAN_QUESTIONS: MultilingualQuestion[] = [
  // Surah names and meanings
  {
    text: { 
      en: "Which Surah is known as the 'Heart of the Quran'?",
      ar: "أي سورة تُعرف بـ 'قلب القرآن'؟"
    },
    options: {
      en: ["Al-Baqarah", "Yaseen", "Al-Ikhlas", "Al-Fatiha"],
      ar: ["البقرة", "يس", "الإخلاص", "الفاتحة"]
    },
    correctIndex: 1,
    category: "islamic",
    subcategory: "Quran",
    difficulty: Difficulty.Medium,
    timeLimit: 25,
    explanation: {
      en: "Surah Yaseen (Chapter 36) is called the 'Heart of the Quran' because it contains the core message of the Quran.",
      ar: "سورة يس (الفصل 36) تُسمى 'قلب القرآن' لأنها تحتوي على الرسالة الأساسية للقرآن."
    },
    reference: "Surah Yaseen (36)"
  },
  {
    text: {
      en: "Which Surah is recited in every Rak'ah of prayer?",
      ar: "أي سورة تُقرأ في كل ركعة من الصلاة؟"
    },
    options: {
      en: ["Al-Ikhlas", "Al-Fatiha", "Al-Kawthar", "An-Nas"],
      ar: ["الإخلاص", "الفاتحة", "الكوثر", "الناس"]
    },
    correctIndex: 1,
    category: "islamic",
    subcategory: "Quran",
    difficulty: Difficulty.Easy,
    timeLimit: 20,
    explanation: {
      en: "Surah Al-Fatiha (The Opening) is recited in every unit of prayer. It is also called Umm Al-Kitab (Mother of the Book).",
      ar: "سورة الفاتحة (الافتتاح) تُقرأ في كل ركعة من الصلاة. وتُسمى أيضاً أم الكتاب."
    },
    reference: "Surah Al-Fatiha (1)"
  },
  {
    text: {
      en: "How many Surahs are in the Quran?",
      ar: "كم عدد سور القرآن الكريم؟"
    },
    options: {
      en: ["113", "114", "115", "112"],
      ar: ["113", "114", "115", "112"]
    },
    correctIndex: 1,
    category: "islamic",
    subcategory: "Quran",
    difficulty: Difficulty.Easy,
    timeLimit: 20,
    explanation: {
      en: "The Quran contains 114 Surahs (chapters). The first is Al-Fatiha and the last is An-Nas.",
      ar: "يحتوي القرآن الكريم على 114 سورة. الأولى هي الفاتحة والأخيرة هي الناس."
    }
  },
  {
    text: {
      en: "Which Surah is named after a prophet who built the Ark?",
      ar: "أي سورة تحمل اسم نبي بنى الفلك؟"
    },
    options: {
      en: ["Yusuf", "Ibrahim", "Nuh", "Musa"],
      ar: ["يوسف", "إبراهيم", "نوح", "موسى"]
    },
    correctIndex: 2,
    category: "islamic",
    subcategory: "Quran",
    difficulty: Difficulty.Easy,
    timeLimit: 20,
    explanation: {
      en: "Surah Nuh (Chapter 71) is named after Prophet Noah (Nuh), who built the Ark to save the believers from the flood.",
      ar: "سورة نوح (الفصل 71) سُميت على اسم النبي نوح، الذي بنى الفلك لإنقاذ المؤمنين من الطوفان."
    },
    reference: "Surah Nuh (71)"
  },
  {
    text: {
      en: "Complete the verse: 'Indeed, with hardship comes...'",
      ar: "أكمل الآية: 'إن مع العسر...'"
    },
    options: {
      en: ["Peace", "Victory", "Ease (Yusra)", "Wealth"],
      ar: ["سلام", "نصر", "يسراً", "غنى"]
    },
    correctIndex: 2,
    category: "islamic",
    subcategory: "Quran",
    difficulty: Difficulty.Easy,
    timeLimit: 20,
    explanation: {
      en: "This famous verse from Surah Ash-Sharh (94:6) promises that with every difficulty comes ease.",
      ar: "هذه الآية المشهورة من سورة الشرح (94:6) تعد أنه مع كل عسر يأتي يسر."
    },
    reference: "Surah Ash-Sharh (94:6)"
  },
  {
    text: {
      en: "Which Surah begins with 'Say: He is Allah, the One'?",
      ar: "أي سورة تبدأ بـ 'قل هو الله أحد'؟"
    },
    options: {
      en: ["Al-Falaq", "An-Nas", "Al-Ikhlas", "Al-Kafirun"],
      ar: ["الفلق", "الناس", "الإخلاص", "الكافرون"]
    },
    correctIndex: 2,
    category: "islamic",
    subcategory: "Quran",
    difficulty: Difficulty.Easy,
    timeLimit: 20,
    explanation: {
      en: "Surah Al-Ikhlas (Chapter 112) is about the oneness of Allah. It is equal to one-third of the Quran in reward.",
      ar: "سورة الإخلاص (الفصل 112) تتحدث عن توحيد الله. ثلث القرآن في ثوابها."
    },
    reference: "Surah Al-Ikhlas (112)"
  },
  {
    text: {
      en: "In which Surah is the story of the People of the Cave mentioned?",
      ar: "في أي سورة ذُكرت قصة أصحاب الكهف؟"
    },
    options: {
      en: ["Maryam", "Al-Kahf", "Ta-Ha", "Al-Isra"],
      ar: ["مريم", "الكهف", "طه", "الإسراء"]
    },
    correctIndex: 1,
    category: "islamic",
    subcategory: "Quran",
    difficulty: Difficulty.Medium,
    timeLimit: 25,
    explanation: {
      en: "Surah Al-Kahf (Chapter 18) tells the story of the People of the Cave (Ashab Al-Kahf) who slept for 309 years.",
      ar: "سورة الكهف (الفصل 18) تروي قصة أصحاب الكهف الذين ناموا 309 سنوات."
    },
    reference: "Surah Al-Kahf (18)"
  },
  {
    text: {
      en: "Which Surah is known as 'Al-Sab' al-Mathani' (The Seven Often Repeated Verses)?",
      ar: "أي سورة تُعرف بـ 'السبع المثاني'؟"
    },
    options: {
      en: ["Al-Baqarah", "Al-Fatiha", "Al-Ikhlas", "Al-Mulk"],
      ar: ["البقرة", "الفاتحة", "الإخلاص", "الملك"]
    },
    correctIndex: 1,
    category: "islamic",
    subcategory: "Quran",
    difficulty: Difficulty.Medium,
    timeLimit: 25,
    explanation: {
      en: "Surah Al-Fatiha has 7 verses and is recited in every prayer. The Prophet (ﷺ) called it 'Al-Sab' al-Mathani'.",
      ar: "سورة الفاتحة لها 7 آيات وتُقرأ في كل صلاة. النبي (ﷺ) سماها 'السبع المثاني'."
    },
    reference: "Sahih Bukhari"
  },
  {
    text: {
      en: "Which Surah mentions the miracle of Prophet Isa (Jesus) speaking as a baby?",
      ar: "أي سورة تذكر معجزة النبي عيسى (عليه السلام) التكلم وهو طفل؟"
    },
    options: {
      en: ["Al-Imran", "Maryam", "Al-Anbiya", "Al-Mu'minun"],
      ar: ["آل عمران", "مريم", "الأنبياء", "المؤمنون"]
    },
    correctIndex: 1,
    category: "islamic",
    subcategory: "Quran",
    difficulty: Difficulty.Hard,
    timeLimit: 25,
    explanation: {
      en: "Surah Maryam (Chapter 19) describes Prophet Isa (Jesus) speaking in the cradle to defend his mother Maryam.",
      ar: "سورة مريم (الفصل 19) تصف النبي عيسى (عليه السلام) يتكلم في المهد للدفاع عن أمه مريم."
    },
    reference: "Surah Maryam (19:27-33)"
  },
  {
    text: {
      en: "The Quran was revealed over approximately how many years?",
      ar: "نُزل القرآن على مدى تقريباً كم سنة؟"
    },
    options: {
      en: ["13 years", "23 years", "33 years", "10 years"],
      ar: ["13 سنة", "23 سنة", "33 سنة", "10 سنوات"]
    },
    correctIndex: 1,
    category: "islamic",
    subcategory: "Quran",
    difficulty: Difficulty.Medium,
    timeLimit: 25,
    explanation: {
      en: "The Quran was revealed over approximately 23 years (610-632 CE), from the first revelation in Cave Hira to the Prophet's (ﷺ) death.",
      ar: "نُزل القرآن على مدى تقريباً 23 سنة (610-632 م)، من الوحي الأول في غار حتى وفاة النبي (ﷺ)."
    }
  },
  // More Quran questions...
  {
    text: {
      en: "Which Surah is entirely about the Oneness of Allah?",
      ar: "أي سورة تتحدث كلياً عن توحيد الله؟"
    },
    options: {
      en: ["Al-Falaq", "An-Nas", "Al-Ikhlas", "Al-Kafirun"],
      ar: ["الفلق", "الناس", "الإخلاص", "الكافرون"]
    },
    correctIndex: 2,
    category: "islamic",
    subcategory: "Quran",
    difficulty: Difficulty.Easy,
    timeLimit: 20,
    explanation: {
      en: "Al-Ikhlas (Sincerity) is 100% about Tawhid (Oneness of Allah). Reciting it equals reading one-third of the Quran.",
      ar: "الإخلاص 100% عن التوحيد. قراءتها تساوي ثلث القرآن في الأجر."
    },
    reference: "Surah Al-Ikhlas (112)"
  },
  {
    text: {
      en: "Which Surah is called 'The Victory'?",
      ar: "أي سورة تُسمى 'الفتح'؟"
    },
    options: {
      en: ["Al-Nasr", "Al-Fath", "Al-Anfal", "Al-Tawbah"],
      ar: ["النصر", "الفتح", "الأنفال", "التوبة"]
    },
    correctIndex: 1,
    category: "islamic",
    subcategory: "Quran",
    difficulty: Difficulty.Medium,
    timeLimit: 25,
    explanation: {
      en: "Surah Al-Fath (Chapter 48) is about the Treaty of Hudaybiyyah, which opened the way for the conquest of Makkah.",
      ar: "سورة الفتح (الفصل 48) تتحدث عن صلح الحديبية الذي فتح الطريق لفتح مكة."
    },
    reference: "Surah Al-Fath (48)"
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// HADITH QUESTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const HADITH_QUESTIONS: MultilingualQuestion[] = [
  {
    text: {
      en: "Who narrated the most Hadith from the Prophet (ﷺ)?",
      ar: "من روى أكثر الأحاديث عن النبي (ﷺ)؟"
    },
    options: {
      en: ["Umar ibn Al-Khattab", "Ali ibn Abi Talib", "Abu Hurairah", "Aisha"],
      ar: ["عمر بن الخطاب", "علي بن أبي طالب", "أبو هريرة", "عائشة"]
    },
    correctIndex: 2,
    category: "islamic",
    subcategory: "Hadith",
    difficulty: Difficulty.Medium,
    timeLimit: 25,
    explanation: {
      en: "Abu Hurairah (may Allah be pleased with him) narrated over 5,000 Hadith from the Prophet (ﷺ). He was known for his excellent memory.",
      ar: "أبو هريرة (رضي الله عنه) روى أكثر من 5000 حديث عن النبي (ﷺ). اشتهر بحفظه القوي."
    },
    reference: "Sahih Muslim"
  },
  {
    text: {
      en: "What is the first action for which a person will be judged on Judgment Day?",
      ar: "ما هو أول عمل يُحاسب عليه العبد يوم القيامة؟"
    },
    options: {
      en: ["Zakat (Charity)", "Salah (Prayer)", "Hajj (Pilgrimage)", "Fasting"],
      ar: ["الزكاة", "الصلاة", "الحج", "الصيام"]
    },
    correctIndex: 1,
    category: "islamic",
    subcategory: "Hadith",
    difficulty: Difficulty.Medium,
    timeLimit: 25,
    explanation: {
      en: "The Prophet (ﷺ) said the first thing judged is prayer. If it is accepted, all else is accepted; if rejected, all else is rejected.",
      ar: "قال النبي (ﷺ): أول ما يُحاسب به العبد الصلاة. إن صلحت صلح سائر عمله، وإن فسدت فسد سائر عمله."
    },
    reference: "Sahih Bukhari & Muslim"
  },
  {
    text: {
      en: "Which Hadith collection is called 'Sahihain' (The Two Sahihs)?",
      ar: "أي مجموعة أحاديث تُسمى 'الصحيحين'؟"
    },
    options: {
      en: ["Bukhari and Muslim", "Tirmidhi and Nasa'i", "Abu Dawud and Ibn Majah", "Malik and Ahmad"],
      ar: ["البخاري ومسلم", "الترمذي والنسائي", "أبو داود وابن ماجه", "مالك وأحمد"]
    },
    correctIndex: 0,
    category: "islamic",
    subcategory: "Hadith",
    difficulty: Difficulty.Easy,
    timeLimit: 25,
    explanation: {
      en: "Sahih Bukhari and Sahih Muslim are called 'The Two Sahihs' because they are the most authentic Hadith collections.",
      ar: "صحيح البخاري وصحيح مسلم يُسمان 'الصحيحين' لأنهما أصح كتب الأحاديث."
    }
  },
  {
    text: {
      en: "What did the Prophet (ﷺ) say is the best among you?",
      ar: "ماذا قال النبي (ﷺ) عن خياركم؟"
    },
    options: {
      en: ["The strongest", "The richest", "Those who learn Quran and teach it", "The bravest"],
      ar: ["الأقوى", "الأغنى", "من تعلم القرآن وعلمه", "الأشجع"]
    },
    correctIndex: 2,
    category: "islamic",
    subcategory: "Hadith",
    difficulty: Difficulty.Easy,
    timeLimit: 20,
    explanation: {
      en: "The Prophet (ﷺ) said: 'The best among you are those who learn the Quran and teach it.'",
      ar: "قال النبي (ﷺ): 'خيركم من تعلم القرآن وعلمه.'"
    },
    reference: "Sahih Bukhari"
  },
  {
    text: {
      en: "According to Hadith, what is half of faith?",
      ar: "وفقاً للحديث، ما هو نصف الإيمان؟"
    },
    options: {
      en: ["Prayer", "Patience", "Cleanliness (Purity)", "Charity"],
      ar: ["الصلاة", "الصبر", "الطهارة (النظافة)", "الصدقة"]
    },
    correctIndex: 2,
    category: "islamic",
    subcategory: "Hadith",
    difficulty: Difficulty.Medium,
    timeLimit: 25,
    explanation: {
      en: "The Prophet (ﷺ) said: 'Cleanliness is half of faith.' Cleanliness includes both physical purity and spiritual purity.",
      ar: "قال النبي (ﷺ): 'الطهارة شطر الإيمان.' تشمل الطهارة النظافة الجسدية والروحية."
    },
    reference: "Sahih Muslim"
  },
  {
    text: {
      en: "What is the shortest verse in the Quran?",
      ar: "ما هي أقصر آية في القرآن؟"
    },
    options: {
      en: ["Bismillah", "Kul huwa Allahu ahad", "Mudhammatan", "Yusabbihu lillahi ma fi-samawati"],
      ar: ["بسم الله", "قل هو الله أحد", "مُدْهَامَّتَانِ", "يُسَبِّحُ لِلَّهِ مَا فِي السَّمَاوَاتِ"]
    },
    correctIndex: 2,
    category: "islamic",
    subcategory: "Quran",
    difficulty: Difficulty.Hard,
    timeLimit: 25,
    explanation: {
      en: "The shortest verse is 'Mudhammatan' (مدْهَامَّتَانِ) in Surah Ar-Rahman (55:64), which means 'dark green'.",
      ar: "أقصر آية هي 'مُدْهَامَّتَانِ' في سورة الرحمن (55:64) وتعني 'الخضراء الداكنة'."
    },
    reference: "Surah Ar-Rahman (55:64)"
  },
  {
    text: {
      en: "Which angel brought revelation to Prophet Muhammad (ﷺ)?",
      ar: "أي مَلَك كان يأتي بالوحي إلى النبي محمد (ﷺ)؟"
    },
    options: {
      en: ["Israfil", "Mikail", "Jibril (Gabriel)", "Azrael"],
      ar: ["إسرافيل", "ميكائيل", "جبريل", "عزرائيل"]
    },
    correctIndex: 2,
    category: "islamic",
    subcategory: "General",
    difficulty: Difficulty.Easy,
    timeLimit: 20,
    explanation: {
      en: "Angel Jibril (Gabriel) was the messenger between Allah and the prophets. He brought the Quran to Prophet Muhammad (ﷺ).",
      ar: "الملك جبريل كان رسولاً بين الله والأنبياء. أتى بالقرآن إلى النبي محمد (ﷺ)."
    },
    reference: "Surah Al-Shu'ara (26:192-194)"
  },
  {
    text: {
      en: "What does 'Bismillah al-Rahman al-Rahim' mean?",
      ar: "ماذا تعني 'بسم الله الرحمن الرحيم'؟"
    },
    options: {
      en: ["In the name of Allah the Merciful", "In the name of Allah the Most Gracious, the Most Merciful", "Allah is the Greatest", "Praise be to Allah"],
      ar: ["باسم الله الرحيم", "باسم الله الرحمن الرحيم", "الله أكبر", "الحمد لله"]
    },
    correctIndex: 1,
    category: "islamic",
    subcategory: "Quran",
    difficulty: Difficulty.Easy,
    timeLimit: 20,
    explanation: {
      en: "It means 'In the name of Allah, the Most Gracious, the Most Merciful.' It opens every Surah except At-Tawbah.",
      ar: "معناها 'باسم الله الرحمن الرحيم.' تفتتح كل سورة إلا سورة التوبة."
    }
  },
  {
    text: {
      en: "Which Prophet was swallowed by a whale?",
      ar: "أي نبي ابتلعه الحوت؟"
    },
    options: {
      en: ["Musa (Moses)", "Isa (Jesus)", "Yunus (Jonah)", "Yusuf (Joseph)"],
      ar: ["موسى", "عيسى", "يونس", "يوسف"]
    },
    correctIndex: 2,
    category: "islamic",
    subcategory: "Prophets",
    difficulty: Difficulty.Easy,
    timeLimit: 20,
    explanation: {
      en: "Prophet Yunus (Jonah) was swallowed by a whale after leaving his people without Allah's permission. He prayed inside the whale and was saved.",
      ar: "النبي يونس ابتلعه الحوت بعد أن ترك قومه دون إذن الله. دعا داخل الحوت وأُنقذ."
    },
    reference: "Surah Al-Saffat (37:139-148)"
  },
  {
    text: {
      en: "How many rak'ahs are in the Fajr (Dawn) prayer?",
      ar: "كم عدد ركعات صلاة الفجر؟"
    },
    options: {
      en: ["2", "3", "4", "1"],
      ar: ["2", "3", "4", "1"]
    },
    correctIndex: 0,
    category: "islamic",
    subcategory: "Fiqh",
    difficulty: Difficulty.Easy,
    timeLimit: 20,
    explanation: {
      en: "Fajr prayer has 2 rak'ahs (units). It is the first prayer of the day, prayed before sunrise.",
      ar: "صلاة الفجر ركعتان. هي أول صلاة في اليوم، تُصلى قبل طلوع الشمس."
    },
    reference: "Sahih Bukhari"
  },
  {
    text: {
      en: "What is the night journey of the Prophet (ﷺ) called?",
      ar: "ما هو اسم رحلة الليل للنبي (ﷺ)؟"
    },
    options: {
      en: ["Hijrah", "Isra and Mi'raj", "Battle of Badr", "Hudaybiyyah"],
      ar: ["الهجرة", "الإسراء والمعراج", "غزوة بدر", "الحديبية"]
    },
    correctIndex: 1,
    category: "islamic",
    subcategory: "Seerah",
    difficulty: Difficulty.Medium,
    timeLimit: 25,
    explanation: {
      en: "Isra is the night journey from Makkah to Jerusalem. Mi'raj is the ascension to the heavens where the Prophet (ﷺ) met Allah.",
      ar: "الإسراء هي رحلة الليل من مكة إلى القدس. المعروج هو الصعود إلى السماوات حيث التقى النبي (ﷺ) بالله."
    },
    reference: "Surah Al-Isra (17:1)"
  },
  {
    text: {
      en: "Which month is Ramadan in the Islamic calendar?",
      ar: "أي شهر هو رمضان في التقويم الهجري؟"
    },
    options: {
      en: ["1st month", "9th month", "12th month", "6th month"],
      ar: ["الشهر الأول", "الشهر التاسع", "الشهر الثاني عشر", "الشهر السادس"]
    },
    correctIndex: 1,
    category: "islamic",
    subcategory: "Fiqh",
    difficulty: Difficulty.Easy,
    timeLimit: 20,
    explanation: {
      en: "Ramadan is the 9th month of the Islamic calendar. Muslims fast from dawn to sunset during this month.",
      ar: "رمضان هو الشهر التاسع في التقويم الهجري. يصوم المسلمون من الفجر إلى المغرب في هذا الشهر."
    },
    reference: "Surah Al-Baqarah (2:185)"
  },
  {
    text: {
      en: "What is the minimum percentage of wealth for Zakat?",
      ar: "ما هو الحد الأدنى لنسبة المال لإخراج الزكاة؟"
    },
    options: {
      en: ["5%", "2.5%", "10%", "20%"],
      ar: ["5%", "2.5%", "10%", "20%"]
    },
    correctIndex: 1,
    category: "islamic",
    subcategory: "Fiqh",
    difficulty: Difficulty.Medium,
    timeLimit: 25,
    explanation: {
      en: "Zakat is 2.5% of savings held for one lunar year that exceeds the nisab (minimum threshold).",
      ar: "الزكاة 2.5% من المدخرات التي حُفظت لمدة سنة قمرية وتتجاوز النصاب (الحد الأدنى)."
    }
  },
  {
    text: {
      en: "Who was the first Prophet in Islam?",
      ar: "من هو أول نبي في الإسلام؟"
    },
    options: {
      en: ["Muhammad (ﷺ)", "Ibrahim (Abraham)", "Nuh (Noah)", "Adam"],
      ar: ["محمد (ﷺ)", "إبراهيم", "نوح", "آدم"]
    },
    correctIndex: 3,
    category: "islamic",
    subcategory: "Prophets",
    difficulty: Difficulty.Medium,
    timeLimit: 25,
    explanation: {
      en: "Prophet Adam (peace be upon him) was the first prophet and human being. Allah created him with His own hands and taught him the names of all things.",
      ar: "النبي آدم (عليه السلام) كان أول نبي وبشر. خلقه الله بيديه وعلمه أسماء كل شيء."
    }
  },
  {
    text: {
      en: "What is the meaning of 'Alhamdulillah'?",
      ar: "ما هو معنى 'الحمد لله'؟"
    },
    options: {
      en: ["God is Great", "Praise be to Allah", "In the name of Allah", "Allah is the Most Merciful"],
      ar: ["الله أكبر", "الحمد لله", "بسم الله", "الله أرحم الراحمين"]
    },
    correctIndex: 1,
    category: "islamic",
    subcategory: "General",
    difficulty: Difficulty.Easy,
    timeLimit: 20,
    explanation: {
      en: "'Alhamdulillah' means 'All praise is due to Allah.' Muslims say it to express gratitude and thankfulness.",
      ar: "'الحمد لله' تعني 'كل الثناء لله.' يقولها المسلمون للتعبير عن الامتنان والشكر."
    }
  },
  {
    text: {
      en: "Which direction do Muslims face during prayer?",
      ar: "أي اتجاه يتوجه المسلمون أثناء الصلاة؟"
    },
    options: {
      en: ["Jerusalem", "Makkah (Kaaba)", "Medina", "East"],
      ar: ["القدس", "مكة (الكعبة)", "المدينة", "الشرق"]
    },
    correctIndex: 1,
    category: "islamic",
    subcategory: "Fiqh",
    difficulty: Difficulty.Easy,
    timeLimit: 20,
    explanation: {
      en: "Muslims face the Kaaba in Makkah during prayer. This direction is called the Qibla.",
      ar: "يتوجه المسلمون إلى الكعبة في مكة أثناء الصلاة. هذا الاتجاه يُسمى القبلة."
    },
    reference: "Surah Al-Baqarah (2:144)"
  },
  {
    text: {
      en: "What is the Arabic term for the declaration of faith?",
      ar: "ما هو المصطلح العربي لشهادة الإيمان؟"
    },
    options: {
      en: ["Salah", "Zakat", "Shahada", "Hajj"],
      ar: ["الصلاة", "الزكاة", "الشهادة", "الحج"]
    },
    correctIndex: 2,
    category: "islamic",
    subcategory: "General",
    difficulty: Difficulty.Easy,
    timeLimit: 20,
    explanation: {
      en: "The Shahada is: 'Ashhadu an la ilaha illallah, wa ashhadu anna Muhammadan rasulullah' (I bear witness there is no god but Allah and Muhammad is His messenger).",
      ar: "الشهادة هي: 'أشهد أن لا إله إلا الله، وأشهد أن محمداً رسول الله.'"
    }
  },
  {
    text: {
      en: "How many times a day do Muslims pray?",
      ar: "كم مرة يصلي المسلمون في اليوم؟"
    },
    options: {
      en: ["3 times", "5 times", "7 times", "2 times"],
      ar: ["3 مرات", "5 مرات", "7 مرات", "مرتان"]
    },
    correctIndex: 1,
    category: "islamic",
    subcategory: "Fiqh",
    difficulty: Difficulty.Easy,
    timeLimit: 20,
    explanation: {
      en: "Muslims pray 5 times daily: Fajr (dawn), Dhuhr (noon), Asr (afternoon), Maghrib (sunset), Isha (night).",
      ar: "يصلي المسلمون 5 مرات يومياً: الفجر، الظهر، العصر، المغرب، العشاء."
    },
    reference: "Sahih Bukhari"
  },
  {
    text: {
      en: "What is the name of the special night in Ramadan when the Quran was first revealed?",
      ar: "ما هو اسم الليلة المباركة في رمضان التي نزل فيها القرآن؟"
    },
    options: {
      en: ["Laylatul Qadr", "Laylatul Isra", "Laylatul Badr", "Laylatul Miraj"],
      ar: ["ليلة القدر", "ليلة الإسراء", "ليلة بدر", "ليلة المعراج"]
    },
    correctIndex: 0,
    category: "islamic",
    subcategory: "Quran",
    difficulty: Difficulty.Medium,
    timeLimit: 25,
    explanation: {
      en: "Laylatul Qadr (Night of Decree) is better than 1000 months. The Quran was sent down on this night.",
      ar: "ليلة القدر خير من ألف شهر. نزل القرآن في هذه الليلة."
    },
    reference: "Surah Al-Qadr (97)"
  },
  {
    text: {
      en: "Which Prophet built the Kaaba with his son?",
      ar: "أي نبي بنى الكعبة مع ابنه؟"
    },
    options: {
      en: ["Musa (Moses) and Harun", "Ibrahim (Abraham) and Ismail", "Nuh (Noah) and Sam", "Dawud (David) and Sulayman"],
      ar: ["موسى وهارون", "إبراهيم وإسماعيل", "نوح وسام", "داود وسليمان"]
    },
    correctIndex: 1,
    category: "islamic",
    subcategory: "Prophets",
    difficulty: Difficulty.Medium,
    timeLimit: 25,
    explanation: {
      en: "Prophet Ibrahim (Abraham) and his son Ismail (Ishmael) built the Kaaba. It is called 'Baitullah' (House of Allah).",
      ar: "النبي إبراهيم وابنه إسماعيل بنيا الكعبة. تُسمى 'بيت الله'."
    },
    reference: "Surah Al-Baqarah (2:127)"
  }
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMBINE ALL ISLAMIC QUESTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export const ISLAMIC_QUESTION_BANK: MultilingualQuestion[] = [
  ...QURAN_QUESTIONS,
  ...HADITH_QUESTIONS,
  // Add more categories here (Seerah, Fiqh, etc.)
];

// Function to get Islamic questions by difficulty
export function getIslamicQuestionsByDifficulty(difficulty: Difficulty): MultilingualQuestion[] {
  return ISLAMIC_QUESTION_BANK.filter(q => q.difficulty === difficulty);
}

// Function to get questions by subcategory
export function getQuestionsBySubcategory(subcategory: string): MultilingualQuestion[] {
  return ISLAMIC_QUESTION_BANK.filter(q => q.subcategory === subcategory);
}

// Get total count
export function getIslamicQuestionCount(): number {
  return ISLAMIC_QUESTION_BANK.length;
}

import { Difficulty, QuestionCategory, QuestionTopic, MultilingualQuestion, ContentSafetyLevel } from "@quiz-battle/shared";

// ═══════════════════════════════════════════════════════════════════════════════
// ENTERTAINMENT QUESTION BANK
// Categories: Anime, Movies, Games, Music, Comics, Streaming
// Safety Level: Full AI (Green)
// ═══════════════════════════════════════════════════════════════════════════════

export const ANIME_QUESTIONS: MultilingualQuestion[] = [
  // Naruto
  {
    category: QuestionCategory.Anime,
    topic: QuestionTopic.AnimeSeries,
    difficulty: Difficulty.Easy,
    text: {
      en: "Who is the main character of Naruto?",
      ar: "من هو الشخصية الرئيسية في ناروتو؟"
    },
    choices: {
      en: ["Sasuke", "Naruto Uzumaki", "Sakura", "Kakashi"],
      ar: ["ساسكي", "ناروتو أوزوماكي", "ساكورا", "كاكاشي"]
    },
    correctIndex: 1,
    explanation: {
      en: "Naruto Uzumaki is the protagonist, a ninja who dreams of becoming Hokage.",
      ar: "ناروتو أوزوماكي هو البطل، نينجا يحلم بأن يصبح هوكاجي."
    },
    reference: "Naruto Series",
    sourceType: "verified",
    safetyLevel: ContentSafetyLevel.FullAI
  },
  {
    category: QuestionCategory.Anime,
    topic: QuestionTopic.AnimeCharacters,
    difficulty: Difficulty.Easy,
    text: {
      en: "What is the name of Naruto's father?",
      ar: "ما هو اسم والد ناروتو؟"
    },
    choices: {
      en: ["Jiraiya", "Minato Namikaze", "Hashirama", "Tobirama"],
      ar: ["جيرايا", "ميناتو ناميكازي", "هاشيراما", "توبيراما"]
    },
    correctIndex: 1,
    explanation: {
      en: "Minato Namikaze, the Fourth Hokage, sacrificed himself to seal the Nine-Tails in Naruto.",
      ar: "ميناتو ناميكازي، الهوكاجي الرابع، ضحى بنفسه ليختم الـ Nine-Tails في ناروتو."
    },
    reference: "Naruto Series",
    sourceType: "verified",
    safetyLevel: ContentSafetyLevel.FullAI
  },
  {
    category: QuestionCategory.Anime,
    topic: QuestionTopic.AnimeBattles,
    difficulty: Difficulty.Medium,
    text: {
      en: "Who defeated Pain in Naruto Shippuden?",
      ar: "من هزم بين في ناروتو شيبودن؟"
    },
    choices: {
      en: ["Sasuke", "Naruto", "Jiraiya", "Itachi"],
      ar: ["ساسكي", "ناروتو", "جيرايا", "إيتاشي"]
    },
    correctIndex: 1,
    explanation: {
      en: "Naruto defeated Pain (Nagato) after an epic battle in Konoha, using Sage Mode.",
      ar: "هزم ناروتو بين (ناغاتو) بعد معركة ملحمية في كونوها، باستخدام Sage Mode."
    },
    reference: "Naruto Shippuden Episode 163",
    sourceType: "verified",
    safetyLevel: ContentSafetyLevel.FullAI
  },
  // Dragon Ball
  {
    category: QuestionCategory.Anime,
    topic: QuestionTopic.AnimeSeries,
    difficulty: Difficulty.Easy,
    text: {
      en: "What is Goku's Saiyan name?",
      ar: "ما هو اسم غوكو السيان؟"
    },
    choices: {
      en: ["Vegeta", "Kakarot", "Broly", "Raditz"],
      ar: ["فيجيتا", "كاكاروت", "برولي", "راديتز"]
    },
    correctIndex: 1,
    explanation: {
      en: "Goku's birth name is Kakarot. He was sent to Earth as a baby before Planet Vegeta was destroyed.",
      ar: "اسم ميلاد غوكو هو كاكاروت. أُرسل إلى الأرض كطفل قبل تدمير كوكب فيجيتا."
    },
    reference: "Dragon Ball Z",
    sourceType: "verified",
    safetyLevel: ContentSafetyLevel.FullAI
  },
  {
    category: QuestionCategory.Anime,
    topic: QuestionTopic.AnimeCharacters,
    difficulty: Difficulty.Medium,
    text: {
      en: "Who is the Prince of all Saiyans?",
      ar: "من هو أمير جميع السيان؟"
    },
    choices: {
      en: ["Goku", "Vegeta", "Trunks", "Gohan"],
      ar: ["غوكو", "فيجيتا", "ترانكس", "غوهان"]
    },
    correctIndex: 1,
    explanation: {
      en: "Vegeta is the Prince of Saiyans. His father was King Vegeta who ruled Planet Vegeta.",
      ar: "فيجيتا هو أمير السيان. والده كان الملك فيجيتا الذي حكم كوكب فيجيتا."
    },
    reference: "Dragon Ball Z",
    sourceType: "verified",
    safetyLevel: ContentSafetyLevel.FullAI
  },
  // Attack on Titan
  {
    category: QuestionCategory.Anime,
    topic: QuestionTopic.AnimeSeries,
    difficulty: Difficulty.Easy,
    text: {
      en: "What is the name of the main character in Attack on Titan?",
      ar: "ما هو اسم الشخصية الرئيسية في هجوم العمالقة؟"
    },
    choices: {
      en: ["Armin", "Mikasa", "Eren Yeager", "Levi"],
      ar: ["أرمين", "ميكاسا", "إرين ييجر", "ليفاي"]
    },
    correctIndex: 2,
    explanation: {
      en: "Eren Yeager is the protagonist who vows to destroy all Titans after they destroy his hometown.",
      ar: "إرين ييجر هو البطل الذي يتعهد بتدمير جميع العمالقة بعد أن دمروا مسقط رأسه."
    },
    reference: "Attack on Titan",
    sourceType: "verified",
    safetyLevel: ContentSafetyLevel.FullAI
  },
  {
    category: QuestionCategory.Anime,
    topic: QuestionTopic.AnimeCharacters,
    difficulty: Difficulty.Medium,
    text: {
      en: "Who is known as Humanity's Strongest Soldier in Attack on Titan?",
      ar: "من يُعرف بأقوى جندي للبشرية في هجوم العمالقة؟"
    },
    choices: {
      en: ["Erwin Smith", "Levi Ackerman", "Mikasa Ackerman", "Jean Kirstein"],
      ar: ["إيروين سميث", "ليفاي أكرمان", "ميكاسا أكرمان", "جان كيرشتاين"]
    },
    correctIndex: 1,
    explanation: {
      en: "Levi Ackerman is known as Humanity's Strongest Soldier, famous for his incredible combat skills.",
      ar: "ليفاي أكرمان يُعرف بأقوى جندي للبشرية، مشهور بمهاراته القتالية المذهلة."
    },
    reference: "Attack on Titan",
    sourceType: "verified",
    safetyLevel: ContentSafetyLevel.FullAI
  },
  // One Piece
  {
    category: QuestionCategory.Anime,
    topic: QuestionTopic.AnimeSeries,
    difficulty: Difficulty.Easy,
    text: {
      en: "What is the name of the main character in One Piece?",
      ar: "ما هو اسم الشخصية الرئيسية في ون بيس؟"
    },
    choices: {
      en: ["Zoro", "Sanji", "Monkey D. Luffy", "Nami"],
      ar: ["زورو", "سانجي", "مونكي دي لوفي", "نامي"]
    },
    correctIndex: 2,
    explanation: {
      en: "Monkey D. Luffy is the captain of the Straw Hat Pirates and dreams of becoming Pirate King.",
      ar: "مونكي دي لوفي هو قائد قراصنة القبعة القشية ويحلم بأن يصبح ملك القراصنة."
    },
    reference: "One Piece",
    sourceType: "verified",
    safetyLevel: ContentSafetyLevel.FullAI
  },
  {
    category: QuestionCategory.Anime,
    topic: QuestionTopic.AnimeCharacters,
    difficulty: Difficulty.Easy,
    text: {
      en: "What is Luffy's signature attack called?",
      ar: "ما هو اسم هجوم لوفي المميز؟"
    },
    choices: {
      en: ["Gomu Gomu no Pistol", "Gomu Gomu no Gatling", "Gomu Gomu no Bazooka", "All of the above"],
      ar: ["جومو جومو نو بيستول", "جومو جومو نو جاتلينغ", "جومو جومو نو بازوكا", "كل ما سبق"]
    },
    correctIndex: 3,
    explanation: {
      en: "Luffy uses all these attacks and many more, all based on his rubber powers (Gomu Gomu no Mi).",
      ar: "يستخدم لوفي كل هذه الهجمات والمزيد، كلها مبنية على قوى المطاط (جومو جومو نو مي)."
    },
    reference: "One Piece",
    sourceType: "verified",
    safetyLevel: ContentSafetyLevel.FullAI
  },
  // Death Note
  {
    category: QuestionCategory.Anime,
    topic: QuestionTopic.AnimeSeries,
    difficulty: Difficulty.Easy,
    text: {
      en: "What is the name of the protagonist in Death Note?",
      ar: "ما هو اسم البطل في ديث نوت؟"
    },
    choices: {
      en: ["L", "Misa", "Ryuk", "Light Yagami"],
      ar: ["إل", "ميسا", "ريوك", "لايت ياغامي"]
    },
    correctIndex: 3,
    explanation: {
      en: "Light Yagami is the protagonist who finds the Death Note and becomes Kira.",
      ar: "لايت ياغامي هو البطل الذي وجد ديث نوت وأصبح كيرا."
    },
    reference: "Death Note",
    sourceType: "verified",
    safetyLevel: ContentSafetyLevel.FullAI
  },
  {
    category: QuestionCategory.Anime,
    topic: QuestionTopic.AnimeCharacters,
    difficulty: Difficulty.Medium,
    text: {
      en: "Who is the Shinigami that gives Light the Death Note?",
      ar: "من هو الشينيغامي الذي أعطى لايت ديث نوت؟"
    },
    choices: {
      en: ["Rem", "Ryuk", "Sidoh", "Jealous"],
      ar: ["ريم", "ريوك", "سيدوه", "جيلوس"]
    },
    correctIndex: 1,
    explanation: {
      en: "Ryuk is the Shinigami who drops the Death Note into the human world out of boredom.",
      ar: "ريوك هو الشينيغامي الذي أسقط ديث نوت في عالم البشر بسبب الملل."
    },
    reference: "Death Note",
    sourceType: "verified",
    safetyLevel: ContentSafetyLevel.FullAI
  },
  // Demon Slayer
  {
    category: QuestionCategory.Anime,
    topic: QuestionTopic.AnimeSeries,
    difficulty: Difficulty.Easy,
    text: {
      en: "What is the name of the main character in Demon Slayer?",
      ar: "ما هو اسم الشخصية الرئيسية في قاتل الشياطين؟"
    },
    choices: {
      en: ["Zenitsu", "Inosuke", "Tanjiro Kamado", "Giyu"],
      ar: ["زينيتسو", "اينوسكي", "تانجيرو كامادو", "جيو"]
    },
    correctIndex: 2,
    explanation: {
      en: "Tanjiro Kamado becomes a Demon Slayer to cure his sister Nezuko who was turned into a demon.",
      ar: "تانجيرو كامادو أصبح قاتل شياطين ليشفي أخته نيزوكو التي تحولت إلى شيطانة."
    },
    reference: "Demon Slayer (Kimetsu no Yaiba)",
    sourceType: "verified",
    safetyLevel: ContentSafetyLevel.FullAI
  },
  {
    category: QuestionCategory.Anime,
    topic: QuestionTopic.AnimeBattles,
    difficulty: Difficulty.Medium,
    text: {
      en: "What breathing style does Tanjiro use?",
      ar: "ما هو نمط التنفس الذي يستخدمه تانجيرو؟"
    },
    choices: {
      en: ["Thunder Breathing", "Water Breathing", "Flame Breathing", "Mist Breathing"],
      ar: ["تنفس الرعد", "تنفس الماء", "تنفس اللهب", "تنفس الضباب"]
    },
    correctIndex: 1,
    explanation: {
      en: "Tanjiro initially uses Water Breathing, taught by Sakonji Urokodaki, before developing his own style.",
      ar: "تانجيرو يستخدم في البداية تنفس الماء، الذي علمه ساكونجي أوروكوداكي، قبل تطوير نمطه الخاص."
    },
    reference: "Demon Slayer",
    sourceType: "verified",
    safetyLevel: ContentSafetyLevel.FullAI
  },
  // My Hero Academia
  {
    category: QuestionCategory.Anime,
    topic: QuestionTopic.AnimeSeries,
    difficulty: Difficulty.Easy,
    text: {
      en: "What is the main character's name in My Hero Academia?",
      ar: "ما هو اسم الشخصية الرئيسية في أكاديميتي للأبطال؟"
    },
    choices: {
      en: ["Bakugo", "Todoroki", "Izuku Midoriya", "Uraraka"],
      ar: [" باكوغو", "تودوروكي", "إيزوكو ميدوريا", "أوراراكا"]
    },
    correctIndex: 2,
    explanation: {
      en: "Izuku Midoriya (Deku) is born without a Quirk but inherits One For All from All Might.",
      ar: "إيزوكو ميدوريا (ديكو) وُلد بدون كيرك ولكن يرث One For All من All Might."
    },
    reference: "My Hero Academia",
    sourceType: "verified",
    safetyLevel: ContentSafetyLevel.FullAI
  },
  {
    category: QuestionCategory.Anime,
    topic: QuestionTopic.AnimeCharacters,
    difficulty: Difficulty.Easy,
    text: {
      en: "Who is the Symbol of Peace in My Hero Academia?",
      ar: "من هو رمز السلام في أكاديميتي للأبطال؟"
    },
    choices: {
      en: ["Endeavor", "All Might", "Hawks", "Best Jeanist"],
      ar: ["إنديفور", "All Might", "هوكس", "بست جينيست"]
    },
    correctIndex: 1,
    explanation: {
      en: "All Might (Toshinori Yagi) is the former #1 Hero and Symbol of Peace with the Quirk One For All.",
      ar: "All Might (توشينوري ياغي) هو البطل السابق رقم 1 ورمز السلام مع الكيرك One For All."
    },
    reference: "My Hero Academia",
    sourceType: "verified",
    safetyLevel: ContentSafetyLevel.FullAI
  }
];

// Movies Question Bank
export const MOVIE_QUESTIONS: MultilingualQuestion[] = [
  {
    category: QuestionCategory.Movies,
    topic: QuestionTopic.FamousFilms,
    difficulty: Difficulty.Easy,
    text: {
      en: "Who directed the movie 'Inception'?",
      ar: "من أخرج فيلم 'إنسبشن' (البدء)؟"
    },
    choices: {
      en: ["Steven Spielberg", "Christopher Nolan", "James Cameron", "Martin Scorsese"],
      ar: ["ستيفن سبيلبرغ", "كريستوفر نولان", "جيمس كاميرون", "مارتن سكورسيزي"]
    },
    correctIndex: 1,
    explanation: {
      en: "Christopher Nolan directed Inception (2010), known for its complex narrative about dreams within dreams.",
      ar: "أخرج كريستوفر نولان إنسبشن (2010)، المعروف بسرده المعقد عن الأحلام داخل الأحلام."
    },
    reference: "Inception (2010)",
    sourceType: "verified",
    safetyLevel: ContentSafetyLevel.FullAI
  },
  {
    category: QuestionCategory.Movies,
    topic: QuestionTopic.Actors,
    difficulty: Difficulty.Easy,
    text: {
      en: "Who played Iron Man in the Marvel Cinematic Universe?",
      ar: "من لعب دور Iron Man في عالم مارvel السينمائي؟"
    },
    choices: {
      en: ["Chris Evans", "Chris Hemsworth", "Robert Downey Jr.", "Mark Ruffalo"],
      ar: ["كريس إيفانز", "كريس هيمسورث", "روبرت داوني جونيور", "مارك رافالو"]
    },
    correctIndex: 2,
    explanation: {
      en: "Robert Downey Jr. played Tony Stark / Iron Man from 2008 to 2019 in the MCU.",
      ar: "لعب روبرت داوني جونيور دور توني ستارك / Iron Man من 2008 إلى 2019 في MCU."
    },
    reference: "Marvel Cinematic Universe",
    sourceType: "verified",
    safetyLevel: ContentSafetyLevel.FullAI
  },
  {
    category: QuestionCategory.Movies,
    topic: QuestionTopic.FilmPlots,
    difficulty: Difficulty.Medium,
    text: {
      en: "In 'The Matrix', what is the name of the main character?",
      ar: "في فيلم 'The Matrix'، ما هو اسم الشخصية الرئيسية؟"
    },
    choices: {
      en: ["Morpheus", "Neo", "Trinity", "Cypher"],
      ar: ["مورفيوس", "نيو", "ترينيتي", "سيفر"]
    },
    correctIndex: 1,
    explanation: {
      en: "Neo (Thomas Anderson) is the protagonist played by Keanu Reeves, who discovers the truth about the Matrix.",
      ar: "نيو (توماس أندرسون) هو البطل الذي يلعبه كيانو ريفز، الذي يكتشف حقيقة الماتريكس."
    },
    reference: "The Matrix (1999)",
    sourceType: "verified",
    safetyLevel: ContentSafetyLevel.FullAI
  },
  {
    category: QuestionCategory.Movies,
    topic: QuestionTopic.FamousFilms,
    difficulty: Difficulty.Easy,
    text: {
      en: "Which movie features the quote 'I am your father'?",
      ar: "أي فيلم يحتوي على اقتباس 'أنا والدك'؟"
    },
    choices: {
      en: ["Star Trek", "Star Wars: The Empire Strikes Back", "The Terminator", "Back to the Future"],
      ar: ["ستار تريك", "ستار وورز: الإمبراطورية تعيد الضربة", "الم Terminator", "العودة إلى المستقبل"]
    },
    correctIndex: 1,
    explanation: {
      en: "Darth Vader reveals he is Luke's father in Star Wars: The Empire Strikes Back (1980).",
      ar: "يكشف دارث فيدر أنه والد لوك في ستار وورز: الإمبراطورية تعيد الضربة (1980)."
    },
    reference: "Star Wars: Episode V - The Empire Strikes Back",
    sourceType: "verified",
    safetyLevel: ContentSafetyLevel.FullAI
  },
  {
    category: QuestionCategory.Movies,
    topic: QuestionTopic.FilmPlots,
    difficulty: Difficulty.Medium,
    text: {
      en: "In 'Titanic', what is the name of the poor artist who falls in love with Rose?",
      ar: "في فيلم 'تايتانيك'، ما هو اسم الفنان الفقير الذي يقع في حب روز؟"
    },
    choices: {
      en: ["Jack Dawson", "Cal Hockley", "Fabrizio", "Tommy Ryan"],
      ar: ["جاك داوسون", "كال هوكلي", "فابريزيو", "تومي رايان"]
    },
    correctIndex: 0,
    explanation: {
      en: "Jack Dawson, played by Leonardo DiCaprio, wins his ticket in a poker game and falls in love with Rose.",
      ar: "جاك داوسون، الذي يلعبه ليوناردو دي كابريو، يربح تذكرته في لعبة بوكر ويقع في حب روز."
    },
    reference: "Titanic (1997)",
    sourceType: "verified",
    safetyLevel: ContentSafetyLevel.FullAI
  }
];

// Gaming Question Bank
export const GAMING_QUESTIONS: MultilingualQuestion[] = [
  {
    category: QuestionCategory.Games,
    topic: QuestionTopic.VideoGames,
    difficulty: Difficulty.Easy,
    text: {
      en: "What is the name of the main character in The Legend of Zelda?",
      ar: "ما هو اسم الشخصية الرئيسية في أسطورة زيلدا؟"
    },
    choices: {
      en: ["Zelda", "Ganondorf", "Link", "Sheik"],
      ar: ["زيلدا", "جانوندورف", "لينك", "شيك"]
    },
    correctIndex: 2,
    explanation: {
      en: "Link is the protagonist, not Zelda (who is the princess). Link is the hero of Hyrule.",
      ar: "لينك هو البطل، وليس زيلدا (التي هي الأميرة). لينك هو بطل هايرول."
    },
    reference: "The Legend of Zelda Series",
    sourceType: "verified",
    safetyLevel: ContentSafetyLevel.FullAI
  },
  {
    category: QuestionCategory.Games,
    topic: QuestionTopic.VideoGames,
    difficulty: Difficulty.Easy,
    text: {
      en: "In Minecraft, what is the name of the alternate dimension with red fog?",
      ar: "في ماينكرافت، ما هو اسم البُعد البديل بالضباب الأحمر؟"
    },
    choices: {
      en: ["The End", "The Aether", "The Nether", "The Twilight Forest"],
      ar: ["The End", "الإثير", "النذر", "غابة الشفق"]
    },
    correctIndex: 2,
    explanation: {
      en: "The Nether is Minecraft's hell-like dimension with red fog, lava, and dangerous creatures.",
      ar: "النذر هو بُعد ماينكرافت الشبيه بالجحيم بالضباب الأحمر والحمم والمخلوقات الخطرة."
    },
    reference: "Minecraft",
    sourceType: "verified",
    safetyLevel: ContentSafetyLevel.FullAI
  },
  {
    category: QuestionCategory.Games,
    topic: QuestionTopic.GameMechanics,
    difficulty: Difficulty.Medium,
    text: {
      en: "In Fortnite, what is the maximum number of players in a Battle Royale match?",
      ar: "في فورتنايت، ما هو الحد الأقصى للاعبين في مباراة Battle Royale؟"
    },
    choices: {
      en: ["50", "100", "150", "200"],
      ar: ["50", "100", "150", "200"]
    },
    correctIndex: 1,
    explanation: {
      en: "Fortnite Battle Royale features 100 players competing to be the last one standing.",
      ar: "تتميز فورتنايت Battle Royale بـ 100 لاعب يتنافسون ليكونوا الأخير واقفاً."
    },
    reference: "Fortnite",
    sourceType: "verified",
    safetyLevel: ContentSafetyLevel.FullAI
  },
  {
    category: QuestionCategory.Games,
    topic: QuestionTopic.VideoGames,
    difficulty: Difficulty.Easy,
    text: {
      en: "What company created Mario?",
      ar: "أي شركة أنشأت ماريو؟"
    },
    choices: {
      en: ["Sega", "Sony", "Nintendo", "Microsoft"],
      ar: ["سيجا", "سوني", "نينتندو", "مايكروسوفت"]
    },
    correctIndex: 2,
    explanation: {
      en: "Nintendo created Mario. The first game was Donkey Kong (1981) where Mario was called Jumpman.",
      ar: "أنشأت نينتندو ماريو. أول لعبة كانت Donkey Kong (1981) حيث كان ماريو يُسمى Jumpman."
    },
    reference: "Super Mario Series",
    sourceType: "verified",
    safetyLevel: ContentSafetyLevel.FullAI
  },
  {
    category: QuestionCategory.Games,
    topic: QuestionTopic.Esports,
    difficulty: Difficulty.Medium,
    text: {
      en: "Which country won the 2023 League of Legends World Championship?",
      ar: "أي فاز ببطولة العالم لليغ أوف ليجندز 2023؟"
    },
    choices: {
      en: ["China", "South Korea", "USA", "Europe"],
      ar: ["الصين", "كوريا الجنوبية", "الولايات المتحدة", "أوروبا"]
    },
    correctIndex: 1,
    explanation: {
      en: "South Korea's T1 won the 2023 Worlds, with Faker earning his fourth world championship title.",
      ar: "فاز فريق T1 الكوري الجنوبي بعالم 2023، حيث حصل Faker على لقبه الرابع في بطولة العالم."
    },
    reference: "League of Legends Worlds 2023",
    sourceType: "verified",
    safetyLevel: ContentSafetyLevel.FullAI
  }
];

// Combine all entertainment questions
export const ENTERTAINMENT_QUESTION_BANK: MultilingualQuestion[] = [
  ...ANIME_QUESTIONS,
  ...MOVIE_QUESTIONS,
  ...GAMING_QUESTIONS,
];

// Helper functions
export function getEntertainmentQuestionsByCategory(category: QuestionCategory): MultilingualQuestion[] {
  return ENTERTAINMENT_QUESTION_BANK.filter(q => q.category === category);
}

export function getEntertainmentQuestionsByDifficulty(difficulty: Difficulty): MultilingualQuestion[] {
  return ENTERTAINMENT_QUESTION_BANK.filter(q => q.difficulty === difficulty);
}

export function getEntertainmentQuestionCount(): number {
  return ENTERTAINMENT_QUESTION_BANK.length;
}

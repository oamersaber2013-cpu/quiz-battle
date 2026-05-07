import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const questions = [
  // ISLAMIC - PROPHETS (Deport topics)
  {
    category: "islamic",
    difficulty: "easy",
    textEn: "Which Prophet is known as 'Khalilullah' (Friend of Allah)?",
    textAr: "من هو النبي الذي لقب بـ 'خليل الله'؟",
    optionsEnJson: JSON.stringify(["Prophet Musa", "Prophet Ibrahim", "Prophet Isa", "Prophet Muhammad"]),
    optionsArJson: JSON.stringify(["النبي موسى", "النبي إبراهيم", "النبي عيسى", "النبي محمد"]),
    correctIndex: 1,
    sourceType: "verified",
  },
  {
    category: "islamic",
    difficulty: "medium",
    textEn: "How many years did the revelation of the Holy Quran last?",
    textAr: "كم سنة استمر نزول القرآن الكريم؟",
    optionsEnJson: JSON.stringify(["10 years", "13 years", "23 years", "40 years"]),
    optionsArJson: JSON.stringify(["١٠ سنوات", "١٣ سنة", "٢٣ سنة", "٤٠ سنة"]),
    correctIndex: 2,
    sourceType: "verified",
  },
  {
    category: "islamic",
    difficulty: "hard",
    textEn: "What was the first verse revealed to Prophet Muhammad (PBUH)?",
    textAr: "ما هي أول آية نزلت على النبي محمد صلى الله عليه وسلم؟",
    optionsEnJson: JSON.stringify(["Al-Hamdu Lillah", "Allahu Akbar", "Iqra' bismi Rabbika", "Qul Huwallahu Ahad"]),
    optionsArJson: JSON.stringify(["الحمد لله", "الله أكبر", "اقرأ باسم ربك", "قل هو الله أحد"]),
    correctIndex: 2,
    sourceType: "verified",
  },

  // SCIENCE - PHYSICS & MOTION
  {
    category: "science",
    difficulty: "easy",
    textEn: "What is the force that pulls objects toward the center of the Earth?",
    textAr: "ما هي القوة التي تجذب الأجسام نحو مركز الأرض؟",
    optionsEnJson: JSON.stringify(["Magnetism", "Friction", "Gravity", "Electricity"]),
    optionsArJson: JSON.stringify(["المغناطيسية", "الاحتكاك", "الجاذبية", "الكهرباء"]),
    correctIndex: 2,
    sourceType: "verified",
  },
  {
    category: "science",
    difficulty: "medium",
    textEn: "What is the speed of light in a vacuum?",
    textAr: "ما هي سرعة الضوء في الفراغ؟",
    optionsEnJson: JSON.stringify(["300,000 km/s", "150,000 km/s", "1,000,000 km/s", "50,000 km/s"]),
    optionsArJson: JSON.stringify(["٣٠٠,٠٠٠ كم/ث", "١٥٠,٠٠٠ كم/ث", "١,٠٠٠,٠٠٠ كم/ث", "٥٠,٠٠٠ كم/ث"]),
    correctIndex: 0,
    sourceType: "verified",
  },
  {
    category: "science",
    difficulty: "hard",
    textEn: "Which of Newton's laws states that for every action, there is an equal and opposite reaction?",
    textAr: "أي من قوانين نيوتن ينص على أن لكل فعل رد فعل مساوٍ له في المقدار ومعاكس له في الاتجاه؟",
    optionsEnJson: JSON.stringify(["First Law", "Second Law", "Third Law", "Fourth Law"]),
    optionsArJson: JSON.stringify(["القانون الأول", "القانون الثاني", "القانون الثالث", "القانون الرابع"]),
    correctIndex: 2,
    sourceType: "verified",
  },

  // HISTORY - WORLD WARS & REVOLUTIONS
  {
    category: "history",
    difficulty: "medium",
    textEn: "In which year did World War I begin?",
    textAr: "في أي عام بدأت الحرب العالمية الأولى؟",
    optionsEnJson: JSON.stringify(["1912", "1914", "1918", "1939"]),
    optionsArJson: JSON.stringify(["١٩١٢", "١٩١٤", "١٩١٨", "١٩٣٩"]),
    correctIndex: 1,
    sourceType: "verified",
  },
  {
    category: "history",
    difficulty: "hard",
    textEn: "Who was the leader of the Soviet Union during World War II?",
    textAr: "من كان قائد الاتحاد السوفيتي خلال الحرب العالمية الثانية؟",
    optionsEnJson: JSON.stringify(["Lenin", "Trotsky", "Stalin", "Khrushchev"]),
    optionsArJson: JSON.stringify(["لينين", "تروتسكي", "ستالين", "خروتشوف"]),
    correctIndex: 2,
    sourceType: "verified",
  },

  // ANIME - DEEP LORE
  {
    category: "anime",
    difficulty: "medium",
    textEn: "In Naruto, who was the teacher of the legendary Sannin?",
    textAr: "في ناروتو، من كان معلم السانين الأسطوريين؟",
    optionsEnJson: JSON.stringify(["Minato Namikaze", "Hiruzen Sarutobi", "Kakashi Hatake", "Jiraiya"]),
    optionsArJson: JSON.stringify(["ميناتو ناميكازي", "هيروزين ساروتوبي", "كاكاشي هاتاكي", "جيرايا"]),
    correctIndex: 1,
    sourceType: "verified",
  },
  {
    category: "anime",
    difficulty: "hard",
    textEn: "What is the true name of 'L' in the anime Death Note?",
    textAr: "ما هو الاسم الحقيقي لـ 'L' في أنمي ديث نوت؟",
    optionsEnJson: JSON.stringify(["Light Yagami", "L Lawliet", "Ryuzaki", "Near"]),
    optionsArJson: JSON.stringify(["لايت ياجامي", "إل لولايت", "ريوزاكي", "نير"]),
    correctIndex: 1,
    sourceType: "verified",
  },

  // SPORTS
  {
    category: "sports",
    difficulty: "medium",
    textEn: "Which country has won the most FIFA World Cup titles?",
    textAr: "ما هي الدولة الأكثر فوزاً بلقب كأس العالم لكرة القدم؟",
    optionsEnJson: JSON.stringify(["Germany", "Italy", "Brazil", "Argentina"]),
    optionsArJson: JSON.stringify(["ألمانيا", "إيطاليا", "البرازيل", "الأرجنتين"]),
    correctIndex: 2,
    sourceType: "verified",
  },
];

async function main() {
  console.log("Expanding Knowledge Bank...");

  for (const q of questions) {
    const hash = Buffer.from(q.textEn + q.category + q.difficulty).toString("base64").substring(0, 50);
    await prisma.question.upsert({
      where: { hash },
      update: {},
      create: {
        ...q,
        hash,
      },
    });
  }

  console.log(`Knowledge Bank expanded! Total verified questions increased.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

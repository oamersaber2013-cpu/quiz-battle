import { prisma } from "@quiz-battle/db";
import crypto from "crypto";

const questionTypes = [
  "MultipleChoice", "TrueFalse", "MultiSelect", "FillBlank", "Ordering",
  "ImageQuestion", "AudioQuestion", "VideoQuestion", "GuessCountry",
  "GuessPerson", "GuessMovie", "GuessLogo", "Riddle", "Anagram",
  "EmojiGuess", "Silhouette"
];

const categories = ["Entertainment", "Islamic", "General"];
const difficulties = ["Novice", "Scholar", "Sage", "Master", "Legend"];

function generateHash(text: string): string {
  return crypto.createHash("md5").update(text).digest("hex");
}

const sampleQuestions = {
  MultipleChoice: [
    {
      textEn: "What is the capital of France?",
      textAr: "ما هي عاصمة فرنسا؟",
      optionsEn: ["Paris", "London", "Berlin", "Madrid"],
      optionsAr: ["باريس", "لندن", "برلين", "مدريد"],
      correctAnswer: "0",
      category: "General",
      difficulty: "Novice",
    },
    {
      textEn: "Who painted the Mona Lisa?",
      textAr: "من رسم لوحة الموناليزا؟",
      optionsEn: ["Leonardo da Vinci", "Michelangelo", "Raphael", "Donatello"],
      optionsAr: ["ليوناردو دا فينشي", "مايكل أنجلو", "رافائيل", "دوناتيلو"],
      correctAnswer: "0",
      category: "Entertainment",
      difficulty: "Scholar",
    },
  ],
  TrueFalse: [
    {
      textEn: "The Earth is flat",
      textAr: "الأرض مسطحة",
      optionsEn: ["True", "False"],
      optionsAr: ["صحيح", "خطأ"],
      correctAnswer: "1",
      category: "General",
      difficulty: "Novice",
    },
  ],
  FillBlank: [
    {
      textEn: "The first man on the moon was Neil ____",
      textAr: "أول رجل على القمر كان نيل ____",
      correctAnswer: "Armstrong",
      category: "General",
      difficulty: "Scholar",
    },
  ],
  Riddle: [
    {
      textEn: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?",
      textAr: "أتكلم بلا فم وأسمع بلا أذنين. ليس لي جسد، لكنني أحيا بالريح. ما أنا؟",
      optionsEn: ["Echo", "Shadow", "Cloud", "Dream"],
      optionsAr: ["صدى", "ظل", "سحابة", "حلم"],
      correctAnswer: "0",
      category: "General",
      difficulty: "Master",
    },
  ],
};

export async function seedQuestions() {
  console.log("Seeding questions...");
  
  let count = 0;
  
  for (let i = 0; i < 250; i++) {
    for (const type of questionTypes) {
      const samples = sampleQuestions[type as keyof typeof sampleQuestions] || sampleQuestions.MultipleChoice;
      const sample = samples[i % samples.length];
      
      const category = categories[i % categories.length];
      const difficulty = difficulties[i % difficulties.length];
      
      const textEn = `${sample.textEn} (${type} #${i})`;
      const hash = generateHash(textEn);
      
      try {
        await prisma.question.create({
          data: {
            type,
            category,
            difficulty,
            textEn,
            textAr: sample.textAr,
            optionsEnJson: sample.optionsEn ? JSON.stringify(sample.optionsEn) : null,
            optionsArJson: sample.optionsAr ? JSON.stringify(sample.optionsAr) : null,
            correctAnswer: sample.correctAnswer,
            hash,
            isActive: true,
          },
        });
        count++;
      } catch (error) {
        // Skip duplicates
      }
    }
  }
  
  console.log(`Seeded ${count} questions`);
}

seedQuestions().catch(console.error);

import "dotenv/config";
import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { prisma } from "@quiz-battle/db";
import { OpenAI } from "openai";
import { QuestionCategory, CATEGORY_SAFETY_MAP, SafetyLevel } from "@quiz-battle/shared";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "sk-dummy" });

console.log("🚀 Starting BullMQ Workers...");

// 1. Achievements Worker
const achievementWorker = new Worker(
  "achievements",
  async (job: Job) => {
    // ... logic remains same ...
    const { userId, xpGained } = job.data;
    console.log(`Processing achievements for user ${userId} (XP +${xpGained})`);
  },
  { connection }
);

// 2. Bilingual AI Question Generator Worker with Safety Routing
const questionGenWorker = new Worker(
  "question-gen",
  async (job: Job) => {
    const { category, topic, subtopic, difficulty, count } = job.data as { category: QuestionCategory; topic: string; subtopic?: string; difficulty: string; count: number };
    console.log(`Pre-generating ${count} ${difficulty} questions for ${category} / ${topic} ${subtopic ? `/ ${subtopic}` : ''}...`);

    const safetyLevel = CATEGORY_SAFETY_MAP[category] || SafetyLevel.LEVEL_1_AI_SAFE;

    if (safetyLevel === SafetyLevel.LEVEL_3_VERIFIED) {
      console.warn(`🛑 BLOCKED: AI Generation is disabled for strict category: ${category}. Use verified dataset seeding instead.`);
      return;
    }

    if (!process.env.OPENAI_API_KEY) {
      console.log("Skipping AI generation: No OPENAI_API_KEY");
      return;
    }

    const modeInstructions = safetyLevel === SafetyLevel.LEVEL_2_CONTROLLED
      ? "CRITICAL: You must verify factual accuracy. Do not hallucinate historical or scientific facts."
      : "You are allowed to be creative within canon knowledge (e.g. Anime episodes, video game mechanics).";

    const prompt = `
      Generate ${count} multiple-choice questions for a global quiz platform.
      Category: ${category}
      Topic: ${topic}
      ${subtopic ? `Subtopic: ${subtopic} (Generate questions EXACTLY inside this subtopic ONLY)` : ''}
      Difficulty: ${difficulty}
      
      ${modeInstructions}
      
      You MUST provide each question in BOTH English and Arabic.
      
      Output exactly as a JSON array of objects with this schema:
      {
        "textEn": "Question in English",
        "textAr": "Question in Arabic",
        "optionsEn": ["Opt 1", "Opt 2", "Opt 3", "Opt 4"],
        "optionsAr": ["خيار 1", "خيار 2", "خيار 3", "خيار 4"],
        "correctIndex": 0, // 0 to 3
        "explanationEn": "Short explanation",
        "explanationAr": "شرح قصير"
      }
    `;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      });

      const parsed = JSON.parse(response.choices[0].message.content || "{}");
      const questions = Array.isArray(parsed) ? parsed : parsed.questions || [];

      for (const q of questions) {
        const hash = Buffer.from(q.textEn).toString('base64');
        await prisma.question.upsert({
          where: { hash },
          update: {},
          create: {
            category,
            topic,
            subtopic,
            difficulty,
            textEn: q.textEn,
            textAr: q.textAr,
            optionsEnJson: JSON.stringify(q.optionsEn),
            optionsArJson: JSON.stringify(q.optionsAr),
            correctIndex: q.correctIndex,
            explanationEn: q.explanationEn,
            explanationAr: q.explanationAr,
            sourceType: safetyLevel === SafetyLevel.LEVEL_2_CONTROLLED ? "hybrid" : "ai_generated",
            sourceDetail: "OpenAI gpt-4o-mini",
            hash,
          }
        });
      }
      console.log(`✅ Saved ${questions.length} new bilingual questions to DB`);
    } catch (err) {
      console.error("AI Generation failed", err);
    }
  },
  { connection }
);

achievementWorker.on("ready", () => console.log("✅ Achievement Worker ready"));
questionGenWorker.on("ready", () => console.log("✅ Question Gen Worker ready"));

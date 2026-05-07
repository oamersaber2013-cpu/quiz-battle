import {
  Difficulty,
  ClientQuestion,
  PowerUpType,
  ActivePowerUpEffect,
  QuestionCategory,
  ContentSafetyLevel,
  CATEGORY_SAFETY_LEVELS,
  QuestionType,
  toClientQuestion as sharedToClientQuestion,
} from "@quiz-battle/shared";
import { QUESTION_BANK, getTotalQuestionCount } from "./questionBank";
import { 
  ISLAMIC_QUESTION_BANK, 
  toClientQuestion,
  getIslamicQuestionsByDifficulty,
  getIslamicQuestionCount 
} from "./islamicQuestionBank";
import {
  ENTERTAINMENT_QUESTION_BANK,
  getEntertainmentQuestionsByCategory,
  getEntertainmentQuestionsByDifficulty,
  getEntertainmentQuestionCount,
} from "./entertainmentQuestionBank";
import { getCachedQuestions, cacheQuestions } from "./cache";

// Lazy load Prisma to avoid startup failures
let prisma: any = null;
function getPrisma() {
  if (!prisma) {
    try {
      const db = require("@quiz-battle/db");
      prisma = db.prisma;
    } catch (err) {
      console.warn("⚠️ Database not available, using fallback question banks");
      prisma = null;
    }
  }
  return prisma;
}

// Track used question IDs to prevent repeats
const usedQuestionIds = new Map<string, Set<string>>(); // gameId -> Set of question IDs

export function clearUsedQuestions(gameId: string) {
  usedQuestionIds.delete(gameId);
}

export function markQuestionUsed(gameId: string, questionId: string) {
  if (!usedQuestionIds.has(gameId)) {
    usedQuestionIds.set(gameId, new Set());
  }
  usedQuestionIds.get(gameId)!.add(questionId);
}

export function isQuestionUsed(gameId: string, questionId: string): boolean {
  return usedQuestionIds.get(gameId)?.has(questionId) ?? false;
}

// Get question type distribution based on difficulty
function getQuestionTypeDistribution(difficulty: Difficulty): QuestionType[] {
  switch (difficulty) {
    case Difficulty.Novice:
      // Easy: 70% Multiple Choice, 20% True/False, 10% others
      return [
        ...Array(7).fill(QuestionType.MultipleChoice),
        ...Array(2).fill(QuestionType.TrueFalse),
        QuestionType.GuessCountry,
      ];
    
    case Difficulty.Scholar:
      // Medium: 50% Multiple Choice, 20% True/False, 30% varied
      return [
        ...Array(5).fill(QuestionType.MultipleChoice),
        ...Array(2).fill(QuestionType.TrueFalse),
        QuestionType.GuessCountry,
        QuestionType.GuessPerson,
        QuestionType.EmojiGuess,
      ];
    
    case Difficulty.Sage:
      // Hard: 40% Multiple Choice, 60% varied types
      return [
        ...Array(4).fill(QuestionType.MultipleChoice),
        QuestionType.TrueFalse,
        QuestionType.MultiSelect,
        QuestionType.GuessCountry,
        QuestionType.GuessPerson,
        QuestionType.GuessMovie,
        QuestionType.Riddle,
      ];
    
    case Difficulty.Master:
      // Very Hard: 30% Multiple Choice, 70% advanced types
      return [
        ...Array(3).fill(QuestionType.MultipleChoice),
        QuestionType.MultiSelect,
        QuestionType.FillBlank,
        QuestionType.Ordering,
        QuestionType.GuessPerson,
        QuestionType.GuessMovie,
        QuestionType.Riddle,
        QuestionType.Anagram,
      ];
    
    case Difficulty.Legend:
      // Expert: 20% Multiple Choice, 80% complex types
      return [
        ...Array(2).fill(QuestionType.MultipleChoice),
        QuestionType.MultiSelect,
        QuestionType.FillBlank,
        QuestionType.Ordering,
        QuestionType.GuessPerson,
        QuestionType.GuessMovie,
        QuestionType.Riddle,
        QuestionType.Anagram,
        QuestionType.Silhouette,
      ];
    
    default:
      return [QuestionType.MultipleChoice];
  }
}

let questionCounter = 0;

export { getTotalQuestionCount, getIslamicQuestionCount, getEntertainmentQuestionCount };

export function generateQuestionId(): string {
  return `q_${Date.now()}_${++questionCounter}`;
}

// Language preference (can be set per game or globally)
let defaultLanguage: 'en' | 'ar' = 'en';
export function setDefaultLanguage(lang: 'en' | 'ar') {
  defaultLanguage = lang;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HYBRID QUESTION SYSTEM
// Priority: 1) Database (Verified) → 2) AI Generated → 3) Fallback Bank
// ═══════════════════════════════════════════════════════════════════════════════

export async function fetchQuestions(
  difficulty: Difficulty,
  count: number,
  categories?: string | string[],
  subcategories?: string | string[],
  language: 'en' | 'ar' = defaultLanguage,
  gameId?: string
): Promise<Array<ClientQuestion & { correctIndex: number }>> {
  const catArray = Array.isArray(categories) ? categories : (categories ? [categories] : ["General"]);
  const subcatArray = Array.isArray(subcategories) ? subcategories : (subcategories ? [subcategories] : []);
  
  // Get question type distribution for this difficulty
  const typeDistribution = getQuestionTypeDistribution(difficulty);
  
  const results: any[] = [];
  const countPerCat = Math.ceil(count / catArray.length);

  for (const targetCategory of catArray) {
    const currentRemaining = count - results.length;
    if (currentRemaining <= 0) break;
    
    const targetCount = Math.min(countPerCat, currentRemaining);
    const subcatForThis = subcatArray.length > 0 ? subcatArray : undefined;

    // Distribute question types for this batch
    const typesForBatch: QuestionType[] = [];
    for (let i = 0; i < targetCount; i++) {
      const randomType = typeDistribution[Math.floor(Math.random() * typeDistribution.length)];
      typesForBatch.push(randomType);
    }

    const catResults = await fetchSingleCategoryQuestions(
      difficulty,
      targetCount,
      targetCategory,
      subcatForThis,
      language,
      typesForBatch,
      gameId
    );
    results.push(...catResults);
  }

  return results.slice(0, count);
}

// Internal helper for single category fetching
async function fetchSingleCategoryQuestions(
  difficulty: Difficulty,
  count: number,
  category: string,
  subcategories?: string[],
  language: 'en' | 'ar' = 'en',
  questionTypes?: QuestionType[],
  gameId?: string
): Promise<Array<ClientQuestion & { correctIndex: number }>> {
  const results: any[] = [];
  const targetCategory = (category as QuestionCategory) || QuestionCategory.General;
  const safetyLevel = CATEGORY_SAFETY_LEVELS[targetCategory] || ContentSafetyLevel.ControlledAI;
  const typesToGenerate = questionTypes || Array(count).fill(QuestionType.MultipleChoice);

  // PRIORITY 0: CHECK CACHE FIRST
  const cacheKey = `${targetCategory}:${difficulty}`;
  const cached = await getCachedQuestions(cacheKey, difficulty);
  if (cached && cached.length >= count) {
    const availableCached = gameId
      ? cached.filter(q => !isQuestionUsed(gameId, q.id))
      : cached;
    
    if (availableCached.length >= count) {
      const selected = availableCached.slice(0, count);
      selected.forEach(q => {
        if (gameId) markQuestionUsed(gameId, q.id);
      });
      return selected;
    }
  }

  // PRIORITY 1: REAL DATABASE
  try {
    const db = getPrisma();
    if (db) {
      const dbQuestions = await db.question.findMany({
        where: {
          category: targetCategory.toLowerCase(),
          difficulty: difficulty.toLowerCase(),
        },
      });

      if (dbQuestions.length > 0) {
        // Filter out already used questions
        const availableQuestions = gameId 
          ? dbQuestions.filter(q => !isQuestionUsed(gameId, q.id))
          : dbQuestions;
        
        const shuffled = [...availableQuestions].sort(() => Math.random() - 0.5);
        const selected = shuffled.slice(0, Math.min(count, shuffled.length));

        const converted = selected.map(q => {
          const questionId = generateQuestionId();
          if (gameId) markQuestionUsed(gameId, q.id);
          
          return {
            id: questionId,
            text: language === 'ar' ? q.textAr : q.textEn,
            options: language === 'ar' ? JSON.parse(q.optionsArJson) : JSON.parse(q.optionsEnJson),
            correctIndex: q.correctIndex,
            category: targetCategory,
            difficulty: difficulty,
            timeLimit: getTimeLimitForDifficulty(difficulty),
            type: q.type as QuestionType || QuestionType.MultipleChoice,
          };
        });

        results.push(...converted);
        
        // Cache the results
        if (converted.length > 0) {
          await cacheQuestions(cacheKey, difficulty, converted);
        }
        
        if (results.length >= count) return results.slice(0, count);
      }
    }
  } catch (err) {
    console.warn("⚠️ DB fetch error:", err);
  }

  let remaining = count - results.length;

  // PRIORITY 1: STRICT VERIFIED CATEGORIES (Islamic)
  if (targetCategory === QuestionCategory.Islamic || safetyLevel === ContentSafetyLevel.StrictVerified) {
    const verifiedPool = targetCategory === QuestionCategory.Islamic
      ? (subcategories 
          ? ISLAMIC_QUESTION_BANK.filter(q => subcategories.includes(q.subcategory) && q.difficulty === difficulty)
          : getIslamicQuestionsByDifficulty(difficulty))
      : [];
    
    if (verifiedPool.length > 0) {
      // Filter out used questions
      const availablePool = gameId
        ? verifiedPool.filter(q => !isQuestionUsed(gameId, q.id))
        : verifiedPool;
      
      const shuffled = [...availablePool].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(remaining, shuffled.length));
      
      results.push(...selected.map(q => {
        const questionId = generateQuestionId();
        if (gameId) markQuestionUsed(gameId, q.id);
        
        return {
          ...toClientQuestion(q, language),
          id: questionId,
        };
      }));
      if (results.length >= count) return results.slice(0, count);
    }
  }

  remaining = count - results.length;

  // PRIORITY 2: ENTERTAINMENT
  if ([QuestionCategory.Anime, QuestionCategory.Movies, QuestionCategory.Games].includes(targetCategory)) {
    const pool = getEntertainmentQuestionsByCategory(targetCategory).filter(q => q.difficulty === difficulty);
    if (pool.length > 0) {
      const availablePool = gameId
        ? pool.filter(q => !isQuestionUsed(gameId, q.id))
        : pool;
      
      const shuffled = [...availablePool].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, remaining);
      
      results.push(...selected.map(q => {
        const questionId = generateQuestionId();
        if (gameId) markQuestionUsed(gameId, q.id);
        
        return {
          ...sharedToClientQuestion(q, language),
          id: questionId,
        };
      }));
      if (results.length >= count) return results.slice(0, count);
    }
  }

  remaining = count - results.length;

  // PRIORITY 3: AI with varied question types
  for (let i = 0; i < remaining; i++) {
    const questionType = typesToGenerate[i] || QuestionType.MultipleChoice;
    const aiQuestions = await tryFreeAI(difficulty, 1, category, language, questionType);
    if (aiQuestions && aiQuestions.length > 0) {
      const q = aiQuestions[0];
      if (gameId) markQuestionUsed(gameId, q.id);
      results.push(q);
    }
  }

  if (results.length >= count) return results.slice(0, count);
  remaining = count - results.length;

  // PRIORITY 4: OpenAI
  if (remaining > 0 && process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== "sk-your-key-here") {
    try {
      const gpt = await fetchFromOpenAI(difficulty, remaining, category, language);
      results.push(...gpt.map(q => {
        if (gameId) markQuestionUsed(gameId, q.id);
        return q;
      }));
      if (results.length >= count) return results.slice(0, count);
    } catch {}
  }

  remaining = count - results.length;

  // PRIORITY 5: Final Bank Fallback
  if (remaining > 0) {
    const pool = QUESTION_BANK[difficulty] || QUESTION_BANK[Difficulty.Novice];
    const availablePool = gameId
      ? pool.filter(q => !isQuestionUsed(gameId, q.id))
      : pool;
    
    const shuffled = [...availablePool].sort(() => Math.random() - 0.5);
    results.push(...shuffled.slice(0, remaining).map(q => {
      const questionId = generateQuestionId();
      if (gameId) markQuestionUsed(gameId, questionId);
      
      return {
        ...q,
        id: questionId,
        text: language === 'ar' ? (q.textAr || q.text) : q.text,
        options: language === 'ar' && q.optionsAr ? q.optionsAr : q.options,
      };
    }));
  }

  return results.slice(0, count);
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI QUESTION GENERATION — With robust validation and error handling
// ═══════════════════════════════════════════════════════════════════════════════

// Validate a single AI-generated question before accepting it
function isValidQuestion(q: any): boolean {
  if (!q || typeof q !== 'object') return false;
  if (typeof q.text !== 'string' || q.text.trim().length < 5) return false;
  if (!Array.isArray(q.options) || q.options.length !== 4) return false;
  if (q.options.some((o: any) => typeof o !== 'string' || o.trim().length === 0)) return false;
  if (typeof q.correctIndex !== 'number' || q.correctIndex < 0 || q.correctIndex > 3) return false;
  return true;
}

// Try to extract a JSON array from messy AI text output
function extractJSONArray(text: string): any[] | null {
  // Try 1: Direct parse
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions;
  } catch {}

  // Try 2: Find array in text
  const arrayMatch = text.match(/\[\s*\{[\s\S]*?\}\s*\]/);
  if (arrayMatch) {
    try { return JSON.parse(arrayMatch[0]); } catch {}
  }

  // Try 3: Find object with "questions" key
  const objMatch = text.match(/\{[\s\S]*"questions"\s*:\s*\[[\s\S]*\][\s\S]*?\}/);
  if (objMatch) {
    try {
      const obj = JSON.parse(objMatch[0]);
      if (Array.isArray(obj.questions)) return obj.questions;
    } catch {}
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FREE AI INTEGRATION (Hugging Face Inference API)
// ═══════════════════════════════════════════════════════════════════════════════

async function tryFreeAI(
  difficulty: Difficulty,
  count: number,
  category?: string,
  language: 'en' | 'ar' = 'en',
  questionType: QuestionType = QuestionType.MultipleChoice
): Promise<Array<ClientQuestion & { correctIndex: number }> | null> {
  
  const hfToken = process.env.HUGGINGFACE_API_TOKEN;
  if (!hfToken) return null;
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(
      "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${hfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: generateAIPrompt(difficulty, count, category, language),
          parameters: {
            max_new_tokens: 2000,
            temperature: 0.7,
            return_full_text: false,
          },
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);
    
    if (!response.ok) {
      console.log("⚠️ Hugging Face API error:", response.status);
      return null;
    }
    
    const result = await response.json() as Array<{ generated_text?: string }>;
    const generatedText = result[0]?.generated_text || "";
    
    const questions = extractJSONArray(generatedText);
    if (!questions) {
      console.log("⚠️ Could not parse AI response as JSON");
      return null;
    }

    // Validate each question, filter out bad ones
    const valid = questions
      .filter(isValidQuestion)
      .map((q: any) => ({
        id: generateQuestionId(),
        text: q.text.trim(),
        options: q.options.map((o: string) => o.trim()),
        correctIndex: q.correctIndex,
        category: q.category || category || "General",
        difficulty,
        timeLimit: getTimeLimitForDifficulty(difficulty),
      }));

    console.log(`✅ AI generated ${valid.length}/${questions.length} valid questions`);
    return valid.length > 0 ? valid : null;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      console.log("⚠️ AI request timed out");
    } else {
      console.log("⚠️ Free AI service unavailable:", err?.message || err);
    }
    return null;
  }
}

function generateAIPrompt(
  difficulty: Difficulty, 
  count: number, 
  category?: string, 
  language: 'en' | 'ar' = 'en',
  questionType: QuestionType = QuestionType.MultipleChoice
): string {
  
  const typeInstructions = getQuestionTypeInstructions(questionType, language);
  
  if (language === 'ar') {
    return `<s>[INST] أنت منشئ أسئلة مسابقات محترف. قم بتوليد ${count} ${typeInstructions.descriptionAr}.

القواعد والمستويات:
- نوع السؤال: ${typeInstructions.typeNameAr}
- مستوى الصعوبة المطلوب: ${difficulty}
- تعريف المستويات (التزم بها بدقة):
  * Novice: أسئلة سهلة جداً للمبتدئين، معلومات عامة بديهية.
  * Scholar: مستوى تعليمي متوسط، يحتاج لبعض التفكير.
  * Sage: مستوى المتخصصين، حقائق غامضة وتفاصيل دقيقة.
  * Master: خبرة عميقة، يتطلب ربط معلومات معقدة.
  * Legend: مستوى النخبة، معلومات نادرة جداً وتحدي شبه مستحيل.

${typeInstructions.rulesAr}

- اللغة: يجب أن تكون جميع النصوص باللغة العربية الفصحى فقط
- التنسيق: مصفوفة JSON صالحة فقط، بدون أي نص إضافي

${category ? `القسم: ${category}` : "الأقسام: معلومات عامة، علوم، تاريخ، جغرافيا، تكنولوجيا، رياضيات"}

${typeInstructions.exampleAr}

قم بتوليد ${count} سؤال الآن. [/INST]`;
  }

  return `<s>[INST] You are a professional quiz question generator. Generate exactly ${count} ${typeInstructions.description}.

Question Type: ${typeInstructions.typeName}
Difficulty: ${difficulty}
- Novice: Common sense, basic facts. Easy.
- Scholar: Academic knowledge. Requires thinking.
- Sage: Specialist/niche facts. Obscure details.
- Master: Deep expertise. Complex reasoning.
- Legend: Elite mastery. Extremely rare facts.

${typeInstructions.rules}

- Language: ALL text MUST be in English only
- Format: Return ONLY a valid JSON array, no extra text

${category ? `Category: ${category}` : "Mix: Science, History, Geography, Math, Literature, Technology"}

${typeInstructions.example}

Generate ${count} ${difficulty}-difficulty ${typeInstructions.typeName} questions now. [/INST]`;
}

// Helper function to get type-specific instructions
function getQuestionTypeInstructions(type: QuestionType, lang: 'en' | 'ar') {
  const isAr = lang === 'ar';
  
  const instructions: Record<QuestionType, {
    typeName: string;
    typeNameAr: string;
    description: string;
    descriptionAr: string;
    rules: string;
    rulesAr: string;
    example: string;
    exampleAr: string;
  }> = {
    [QuestionType.MultipleChoice]: {
      typeName: "Multiple Choice",
      typeNameAr: "اختيار من متعدد",
      description: "multiple-choice questions with 4 options",
      descriptionAr: "أسئلة اختيار من متعدد مع 4 خيارات",
      rules: `- Each question MUST have exactly 4 options (A, B, C, D)
- Only ONE correct answer (correctIndex: 0-3)
- Distractors should be plausible but clearly wrong`,
      rulesAr: `- يجب أن يحتوي كل سؤال على 4 خيارات بالضبط
- إجابة صحيحة واحدة فقط (correctIndex: 0-3)
- الخيارات الخاطئة يجب أن تكون قابلة للتصديق لكن واضحة أنها خاطئة`,
      example: `[
  {
    "text": "What is the capital of France?",
    "options": ["London", "Paris", "Rome", "Berlin"],
    "correctIndex": 1,
    "category": "Geography",
    "type": "multiple_choice"
  }
]`,
      exampleAr: `[
  {
    "text": "ما هي عاصمة فرنسا؟",
    "options": ["لندن", "باريس", "روما", "برلين"],
    "correctIndex": 1,
    "category": "الجغرافيا",
    "type": "multiple_choice"
  }
]`
    },
    
    [QuestionType.TrueFalse]: {
      typeName: "True/False",
      typeNameAr: "صح/خطأ",
      description: "true/false questions",
      descriptionAr: "أسئلة صح وخطأ",
      rules: `- Each question must have exactly 2 options: ["True", "False"] or ["صح", "خطأ"]
- Statement must be clearly true or false
- correctIndex: 0 for True, 1 for False`,
      rulesAr: `- يجب أن يحتوي كل سؤال على خيارين فقط: ["صح", "خطأ"]
- العبارة يجب أن تكون صحيحة أو خاطئة بشكل واضح
- correctIndex: 0 للصح، 1 للخطأ`,
      example: `[
  {
    "text": "The Earth is flat.",
    "options": ["True", "False"],
    "correctIndex": 1,
    "category": "Science",
    "type": "true_false"
  }
]`,
      exampleAr: `[
  {
    "text": "الأرض مسطحة.",
    "options": ["صح", "خطأ"],
    "correctIndex": 1,
    "category": "العلوم",
    "type": "true_false"
  }
]`
    },
    
    [QuestionType.MultiSelect]: {
      typeName: "Multi-Select",
      typeNameAr: "اختيار متعدد",
      description: "multi-select questions with multiple correct answers",
      descriptionAr: "أسئلة اختيار متعدد مع عدة إجابات صحيحة",
      rules: `- Each question has 4-6 options
- Multiple answers can be correct (correctIndices array)
- At least 2 correct answers, at least 1 wrong answer
- Use correctIndices: [0, 2] format`,
      rulesAr: `- كل سؤال له 4-6 خيارات
- عدة إجابات يمكن أن تكون صحيحة (مصفوفة correctIndices)
- على الأقل إجابتان صحيحتان، وإجابة واحدة خاطئة على الأقل
- استخدم التنسيق: correctIndices: [0, 2]`,
      example: `[
  {
    "text": "Which of these are prime numbers?",
    "options": ["2", "4", "7", "9", "11"],
    "correctIndices": [0, 2, 4],
    "category": "Math",
    "type": "multi_select"
  }
]`,
      exampleAr: `[
  {
    "text": "أي من هذه الأعداد أولية؟",
    "options": ["2", "4", "7", "9", "11"],
    "correctIndices": [0, 2, 4],
    "category": "الرياضيات",
    "type": "multi_select"
  }
]`
    },
    
    [QuestionType.FillBlank]: {
      typeName: "Fill in the Blank",
      typeNameAr: "املأ الفراغ",
      description: "fill-in-the-blank questions",
      descriptionAr: "أسئلة املأ الفراغ",
      rules: `- Use [BLANK] in the question text where the answer should go
- Provide the correct answer string
- Include acceptedAnswers array with alternative spellings
- Answer should be 1-3 words maximum`,
      rulesAr: `- استخدم [BLANK] في نص السؤال حيث يجب أن تكون الإجابة
- قدم إجابة صحيحة كنص
- أضف مصفوفة acceptedAnswers مع تهجئات بديلة
- الإجابة يجب أن تكون كلمة أو كلمتين أو ثلاث كلمات كحد أقصى`,
      example: `[
  {
    "text": "The capital of France is [BLANK].",
    "correctAnswer": "Paris",
    "acceptedAnswers": ["paris", "Paris"],
    "category": "Geography",
    "type": "fill_blank"
  }
]`,
      exampleAr: `[
  {
    "text": "عاصمة فرنسا هي [BLANK].",
    "correctAnswer": "باريس",
    "acceptedAnswers": ["باريس"],
    "category": "الجغرافيا",
    "type": "fill_blank"
  }
]`
    },
    
    [QuestionType.Ordering]: {
      typeName: "Ordering",
      typeNameAr: "ترتيب",
      description: "ordering/sequencing questions",
      descriptionAr: "أسئلة ترتيب وتسلسل",
      rules: `- Provide 4-5 items that need to be ordered
- correctOrder shows the correct sequence [0, 1, 2, 3]
- Items should be events, steps, or chronological items`,
      rulesAr: `- قدم 4-5 عناصر تحتاج للترتيب
- correctOrder تظهر التسلسل الصحيح [0, 1, 2, 3]
- العناصر يجب أن تكون أحداث أو خطوات أو عناصر زمنية`,
      example: `[
  {
    "text": "Put these planets in order from closest to farthest from the Sun:",
    "options": ["Venus", "Mars", "Mercury", "Earth"],
    "correctOrder": [2, 0, 3, 1],
    "category": "Science",
    "type": "ordering"
  }
]`,
      exampleAr: `[
  {
    "text": "رتب هذه الكواكب من الأقرب إلى الأبعد من الشمس:",
    "options": ["الزهرة", "المريخ", "عطارد", "الأرض"],
    "correctOrder": [2, 0, 3, 1],
    "category": "العلوم",
    "type": "ordering"
  }
]`
    },
    
    // MEDIA-BASED QUESTIONS - Real audio, images, video
    [QuestionType.AudioQuestion]: {
      typeName: "Audio Question",
      typeNameAr: "سؤال صوتي",
      description: "identify the sound being played",
      descriptionAr: "التعرف على الصوت المشغل",
      rules: `- A sound file will be played (animal, instrument, vehicle, action, etc.)
- Question asks what sound is being played
- Example: opening soda can, car engine, musical instrument, animal call
- audioUrl field will contain the sound file URL`,
      rulesAr: `- سيتم تشغيل ملف صوتي (حيوان، آلة موسيقية، مركبة، فعل، إلخ)
- السؤال يسأل ما هو الصوت المشغل
- مثال: فتح علبة صودا، محرك سيارة، آلة موسيقية، صوت حيوان
- حقل audioUrl سيحتوي على رابط ملف الصوت`,
      example: `[
  {
    "text": "🔊 What sound is this? (Listen carefully)",
    "options": ["Opening a can of soda", "Opening a beer can", "Crushing an empty can", "Pouring soda into glass"],
    "correctIndex": 0,
    "category": "Daily Sounds",
    "type": "audio_question",
    "audioUrl": "https://cdn.example.com/sounds/soda-open.mp3"
  }
]`,
      exampleAr: `[
  {
    "text": "🔊 ما هذا الصوت؟ (استمع جيداً)",
    "options": ["فتح علبة صودا", "فتح علبة بيرة", "عصر علبة فارغة", "صب الصودا في كوب"],
    "correctIndex": 0,
    "category": "أصوات يومية",
    "type": "audio_question",
    "audioUrl": "https://cdn.example.com/sounds/soda-open-ar.mp3"
  }
]`
    },
    
    [QuestionType.ImageQuestion]: {
      typeName: "Image Question",
      typeNameAr: "سؤال صورة",
      description: "identify what is shown in the image",
      descriptionAr: "التعرف على ما يظهر في الصورة",
      rules: `- An image will be shown (landmark, flag, object, person, art, nature)
- Question asks what is depicted in the image
- Can show: famous places, animals, historical figures, logos, maps
- imageUrl field will contain the image file URL`,
      rulesAr: `- ستُعرض صورة (معلم، علم، شيء، شخص، فن، طبيعة)
- السؤال يسأل ما هو موضح في الصورة
- يمكن عرض: أماكن مشهورة، حيوانات، شخصيات تاريخية، شعارات، خرائط
- حقل imageUrl سيحتوي على رابط ملف الصورة`,
      example: `[
  {
    "text": "📷 What landmark is shown in this image?",
    "options": ["Big Ben", "Eiffel Tower", "Statue of Liberty", "Sydney Opera House"],
    "correctIndex": 1,
    "category": "Geography",
    "type": "image_question",
    "imageUrl": "https://cdn.example.com/images/eiffel-tower.jpg"
  }
]`,
      exampleAr: `[
  {
    "text": "📷 ما هو المعلم الظاهر في هذه الصورة؟",
    "options": ["بيغ بن", "برج إيفل", "تمثال الحرية", "دار أوبرا سيدني"],
    "correctIndex": 1,
    "category": "الجغرافيا",
    "type": "image_question",
    "imageUrl": "https://cdn.example.com/images/eiffel-tower.jpg"
  }
]`
    },
    
    [QuestionType.VideoQuestion]: {
      typeName: "Video Question",
      typeNameAr: "سؤال فيديو",
      description: "answer based on a short video clip",
      descriptionAr: "أجب بناءً على مقطع فيديو قصير",
      rules: `- A short video clip will be played (5-15 seconds)
- Question asks about something in the video
- Can show: sports moments, movie scenes, nature events, historical footage
- videoUrl field will contain the video file URL`,
      rulesAr: `- سيتم تشغيل مقطع فيديو قصير (5-15 ثانية)
- السؤال يسأل عن شيء في الفيديو
- يمكن عرض: لحظات رياضية، مشاهد أفلام، أحداث طبيعية، لقطات تاريخية
- حقل videoUrl سيحتوي على رابط ملف الفيديو`,
      example: `[
  {
    "text": "🎬 Which sport is being played in this video?",
    "options": ["Tennis", "Badminton", "Squash", "Table Tennis"],
    "correctIndex": 1,
    "category": "Sports",
    "type": "video_question",
    "videoUrl": "https://cdn.example.com/videos/badminton-clip.mp4"
  }
]`,
      exampleAr: `[
  {
    "text": "🎬 أي رياضة تُلعب في هذا الفيديو؟",
    "options": ["تنس", "ريشة طائرة", "إسكواش", "تنس طاولة"],
    "correctIndex": 1,
    "category": "رياضة",
    "type": "video_question",
    "videoUrl": "https://cdn.example.com/videos/badminton-clip.mp4"
  }
]`
    },
    
    // ADVANCED GUESS TYPES
    [QuestionType.GuessSound]: {
      typeName: "Guess the Sound",
      typeNameAr: "خمن الصوت",
      description: "sound identification questions",
      descriptionAr: "أسئلة التعرف على الأصوات",
      rules: `- Question describes a sound (animal, instrument, vehicle, nature)
- Player must identify what makes that sound
- Use descriptive clues about the sound quality`,
      rulesAr: `- السؤال يصف صوتاً (حيوان، آلة موسيقية، مركبة، طبيعة)
- اللاعب يجب أن يعرف ما ينتج هذا الصوت
- استخدم وصفاً دقيقاً لنوعية الصوت`,
      example: `[
  {
    "text": "What animal makes this sound? 🎵 'ROOOAARRR' 🎵",
    "options": ["Elephant", "Lion", "Tiger", "Bear"],
    "correctIndex": 1,
    "category": "Science",
    "type": "guess_sound",
    "audioUrl": ""
  }
]`,
      exampleAr: `[
  {
    "text": "أي حيوان يصدر هذا الصوت؟ 🎵 'فففففف' 🎵",
    "options": ["ثعبان", "أسد", "ثعلب", "ذئب"],
    "correctIndex": 3,
    "category": "العلوم",
    "type": "guess_sound",
    "audioUrl": ""
  }
]`
    },
    
    [QuestionType.GuessCountry]: {
      typeName: "Guess the Country",
      typeNameAr: "خمن الدولة",
      description: "country identification from clues",
      descriptionAr: "التعرف على الدولة من الأدلة",
      rules: `- Provide clues: famous landmarks, cuisine, geography, culture
- DON'T mention the country name in the clues
- Make clues distinctive enough to identify`,
      rulesAr: `- قدم أدلة: معالم مشهورة، مطبخ، جغرافيا، ثقافة
- لا تذكر اسم الدولة في الأدلة
- اجعل الأدلة مميزة بما يكفي للتعرف`,
      example: `[
  {
    "text": "Guess the country: 🗼 Famous for a tall iron tower, 🥐 croissants, and the Louvre museum",
    "options": ["Italy", "Spain", "France", "Germany"],
    "correctIndex": 2,
    "category": "Geography",
    "type": "guess_country"
  }
]`,
      exampleAr: `[
  {
    "text": "خمن الدولة: 🗼 مشهورة ببرج حديدي عالٍ، 🥐 الكرواسان، ومتحف اللوفر",
    "options": ["إيطاليا", "إسبانيا", "فرنسا", "ألمانيا"],
    "correctIndex": 2,
    "category": "الجغرافيا",
    "type": "guess_country"
  }
]`
    },
    
    [QuestionType.GuessPerson]: {
      typeName: "Guess the Person",
      typeNameAr: "خمن الشخصية",
      description: "famous person identification from clues",
      descriptionAr: "التعرف على الشخصية المشهورة من الأدلة",
      rules: `- Provide 3-4 distinctive clues about the person
- DON'T mention their name in the clues
- Clues should include: profession, achievements, era, nationality`,
      rulesAr: `- قدم 3-4 أدلة مميزة عن الشخص
- لا تذكر اسمه في الأدلة
- الأدلة يجب أن تشمل: المهنة، الإنجازات، العصر، الجنسية`,
      example: `[
  {
    "text": "Guess who: 🧪 Developed the theory of relativity, 🇩🇪 German physicist, 🏆 Nobel Prize winner, E=mc²",
    "options": ["Isaac Newton", "Stephen Hawking", "Albert Einstein", "Niels Bohr"],
    "correctIndex": 2,
    "category": "Science",
    "type": "guess_person"
  }
]`,
      exampleAr: `[
  {
    "text": "خمن من هو: 🧪 وضع نظرية النسبية، 🇩🇪 فيزيائي ألماني، 🏆 حائز على نوبل، E=mc²",
    "options": ["إسحاق نيوتن", "ستيفن هوكنج", "ألبرت أينشتاين", "نيلز بور"],
    "correctIndex": 2,
    "category": "العلوم",
    "type": "guess_person"
  }
]`
    },
    
    [QuestionType.GuessMovie]: {
      typeName: "Guess the Movie",
      typeNameAr: "خمن الفيلم",
      description: "movie identification from clues",
      descriptionAr: "التعرف على الفيلم من الأدلة",
      rules: `- Provide clues: famous quote, plot element, character, director
- DON'T mention the movie title in the clues
- Mix classic and modern films`,
      rulesAr: `- قدم أدلة: اقتباس مشهور، عنصر حبكة، شخصية، مخرج
- لا تذكر عنوان الفيلم في الأدلة
- امزج بين الأفلام الكلاسيكية والحديثة`,
      example: `[
  {
    "text": "Guess the movie: 🦇 'Why do we fall, Bruce?' - Dark knight, clown prince of crime, DC Comics",
    "options": ["Spider-Man", "The Dark Knight", "Iron Man", "Superman"],
    "correctIndex": 1,
    "category": "Movies",
    "type": "guess_movie"
  }
]`,
      exampleAr: `[
  {
    "text": "خمن الفيلم: 🦇 'لماذا نسقط، بروس؟' - فارس الظلام، أمير الجريمة المهرج، دي سي كومكس",
    "options": ["سبايدرمان", "الفارس المظلم", "آيرون مان", "سوبرمان"],
    "correctIndex": 1,
    "category": "أفلام",
    "type": "guess_movie"
  }
]`
    },
    
    [QuestionType.GuessLogo]: {
      typeName: "Guess the Logo",
      typeNameAr: "خمن الشعار",
      description: "brand identification from partial logo description",
      descriptionAr: "التعرف على العلامة التجارية من وصف جزئي للشعار",
      rules: `- Describe distinctive visual elements of the logo
- Colors, shapes, symbols - but not the full logo
- Famous global brands only`,
      rulesAr: `- صف العناصر المرئية المميزة للشعار
- الألوان، الأشكال، الرموز - لكن ليس الشعار الكامل
- علامات تجارية عالمية مشهورة فقط`,
      example: `[
  {
    "text": "Guess the brand: 🍎 A bitten fruit, sleek silver design, tech giant from Cupertino",
    "options": ["Samsung", "Microsoft", "Apple", "Google"],
    "correctIndex": 2,
    "category": "Technology",
    "type": "guess_logo"
  }
]`,
      exampleAr: `[
  {
    "text": "خمن العلامة: 🍎 فاكهة مقضومة، تصميم فضي أنيق، عملاق تقني من كوبرتينو",
    "options": ["سامسونج", "مايكروسوفت", "آبل", "جوجل"],
    "correctIndex": 2,
    "category": "تكنولوجيا",
    "type": "guess_logo"
  }
]`
    },
    
    [QuestionType.Riddle]: {
      typeName: "Riddle",
      typeNameAr: "لغز",
      description: "riddle puzzle questions",
      descriptionAr: "أسئلة ألغاز",
      rules: `- Classic riddle format: question that requires lateral thinking
- Answer should be clever but logical
- Good wordplay or metaphor`,
      rulesAr: `- تنسيق لغز كلاسيكي: سؤال يحتاج تفكيراً جانبياً
- الإجابة يجب أن تكون ذكية لكن منطقية
- لعبة كلمات أو استعارة جيدة`,
      example: `[
  {
    "text": "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I? 🗺️",
    "options": ["A Globe", "A Desert", "A Map", "An Island"],
    "correctIndex": 2,
    "category": "General",
    "type": "riddle"
  }
]`,
      exampleAr: `[
  {
    "text": "عندي مدن بلا بيوت، وجبال بلا أشجار، وماء بلا أسماك. ما أنا؟ 🗺️",
    "options": ["كرة أرضية", "صحراء", "خريطة", "جزيرة"],
    "correctIndex": 2,
    "category": "عام",
    "type": "riddle"
  }
]`
    },
    
    [QuestionType.Anagram]: {
      typeName: "Anagram",
      typeNameAr: "مقلوب الحروف",
      description: "unscramble the letters",
      descriptionAr: "أعد ترتيب الحروف",
      rules: `- Provide scrambled letters that form a word
- Word should be related to the category
- Include a hint`,
      rulesAr: `- قدم حروفاً مبعثرة تشكل كلمة
- الكلمة يجب أن تكون متعلقة بالقسم
- أضف تلميحاً`,
      example: `[
  {
    "text": "Unscramble: P L A N E T 🌍",
    "hint": "A celestial body orbiting a star",
    "options": ["PLANTE", "PLANET", "PLATEN", "PLENTA"],
    "correctIndex": 1,
    "category": "Science",
    "type": "anagram"
  }
]`,
      exampleAr: "[\n  {\n    \"text\": \"رتب الحروف: ك و ت ب ر م ح 🌍\",\n    \"hint\": \"جسم سماوي يدور حول نجم\",\n    \"options\": [\"كوكبتمرح\", \"كوكبمرح\", \"كوكبأمرح\", \"كوكبمرت\"],\n    \"correctIndex\": 1,\n    \"category\": \"العلوم\",\n    \"type\": \"anagram\"\n  }\n]"
    },
    
    [QuestionType.EmojiGuess]: {
      typeName: "Emoji Guess",
      typeNameAr: "تخمين الإيموجي",
      description: "guess from emoji combination",
      descriptionAr: "التخمين من مجموعة إيموجي",
      rules: `- Combine 2-4 emojis that represent a word/phrase
- Can represent movies, places, famous people, phrases
- Include spaces between emojis`,
      rulesAr: `- اجمع 2-4 إيموجي تمثل كلمة أو عبارة
- يمكن تمثيل أفلام، أماكن، أشخاص مشهورين، عبارات
- اترك مسافات بين الإيموجي`,
      example: `[
  {
    "text": "Guess from emojis: 🦁 👑",
    "options": ["The Tiger King", "The Lion King", "Jungle Book", "Madagascar"],
    "correctIndex": 1,
    "category": "Movies",
    "type": "emoji_guess"
  }
]`,
      exampleAr: `[
  {
    "text": "خمن من الإيموجي: 👦 🕷️",
    "options": ["سوبرمان", "باتمان", "سبايدرمان", "أيرون مان"],
    "correctIndex": 2,
    "category": "أفلام",
    "type": "emoji_guess"
  }
]`
    },
    
    [QuestionType.Silhouette]: {
      typeName: "Silhouette",
      typeNameAr: "ظلال",
      description: "identify from shape/outline description",
      descriptionAr: "التعرف من وصف الشكل أو المخطط",
      rules: `- Describe the silhouette/shape of famous object, animal, or person
- Mention distinctive outline features
- Can describe profile view or iconic shape`,
      rulesAr: `- صف الظل/الشكل لشيء مشهور، حيوان، أو شخص
- اذكر مميزات المخطط التفصيلية
- يمكن وصف منظر جانبي أو شكل أيقوني`,
      example: `[
  {
    "text": "What is this? 👤 A pointed ear silhouette, distinctive profile, fictional alien from a famous 1977 space opera",
    "options": ["Spock", "Yoda", "E.T.", "Jar Jar Binks"],
    "correctIndex": 1,
    "category": "Movies",
    "type": "silhouette"
  }
]`,
      exampleAr: `[
  {
    "text": "ما هذا؟ 👤 مخطط جانبي بأذن مدببة، شكل مميز، كائن فضائي خيالي من أوبرا فضائية مشهورة 1977",
    "options": [\"سبوك\", \"يودا\", \"إي.تي\", \"جارجار بينكس\"],\n    \"correctIndex\": 1,\n    \"category\": \"أفلام\",\n    \"type\": \"silhouette\"\n  }\n]`
    }
  };
  
  return instructions[type];
}

function getTimeLimitForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case Difficulty.Novice: return 30;
    case Difficulty.Scholar: return 25;
    case Difficulty.Sage: return 20;
    case Difficulty.Master: return 15;
    case Difficulty.Legend: return 12;
    default: return 25;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAID OPENAI (Premium Quality - Fallback)
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchFromOpenAI(
  difficulty: Difficulty,
  count: number,
  category?: string,
  language: 'en' | 'ar' = 'en'
): Promise<Array<ClientQuestion & { correctIndex: number }>> {
  const { OpenAI } = await import("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const langName = language === 'ar' ? 'Arabic' : 'English';

  const prompt = `Generate ${count} unique multiple-choice quiz questions in ${langName}.
Difficulty: ${difficulty} (Novice/Scholar/Sage/Master/Legend)
Language: ALL text MUST be in ${langName}.
${category ? `Category: ${category}` : "Mix: Science, History, Geography, Math, Literature, Technology"}

Return a JSON object with a "questions" array:
{
  "questions": [
    {
      "text": "question text in ${langName}",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "category": "Category in ${langName}"
    }
  ]
}

Rules:
- correctIndex is 0-based (0,1,2,3)
- Exactly 4 plausible options per question
- Match ${difficulty} difficulty genuinely
- No repeated questions`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.8,
  });

  const content = response.choices[0].message.content || "{}";
  const parsed = JSON.parse(content);
  const questions = Array.isArray(parsed) ? parsed : parsed.questions || [];

  // Validate each question
  return questions
    .filter(isValidQuestion)
    .map((q: Record<string, unknown>) => ({
      id: generateQuestionId(),
      text: (q.text as string).trim(),
      options: (q.options as string[]).map(o => o.trim()),
      correctIndex: q.correctIndex as number,
      category: (q.category as string) || category || "General",
      difficulty,
      timeLimit: getTimeLimitForDifficulty(difficulty),
    }));
}

// ─── Power-Up Effects ────────────────────────────────────────

export function applyFiftyFifty(
  options: string[],
  correctIndex: number
): { eliminatedIndices: number[] } {
  const wrongIndices = options
    .map((_, i) => i)
    .filter((i) => i !== correctIndex);

  // Randomly pick 2 wrong answers to eliminate
  const toEliminate = wrongIndices.sort(() => Math.random() - 0.5).slice(0, 2);
  return { eliminatedIndices: toEliminate };
}

export function computePowerUpEffect(
  type: PowerUpType,
  sourceUserId: string,
  targetUserId?: string,
  expiresAt?: number
): ActivePowerUpEffect {
  const effect: ActivePowerUpEffect = {
    type,
    sourceUserId,
    targetUserId,
  };

  if (expiresAt) {
    effect.expiresAt = expiresAt;
  }

  return effect;
}

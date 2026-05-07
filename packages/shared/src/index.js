"use strict";
// ============================================================
// Core Enums
// ============================================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GAME_MODE_CONFIG = exports.TIME_BONUS_FACTOR = exports.BASE_SCORE = exports.DIFFICULTY_MULTIPLIER = exports.CATEGORY_SAFETY_LEVELS = exports.CATEGORY_SAFETY_MAP = void 0;
exports.toClientQuestion = toClientQuestion;
__exportStar(require("./enums"), exports);
const enums_1 = require("./enums");
function toClientQuestion(question, lang = "en") {
    return {
        id: question.id ?? `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        category: question.category,
        topic: question.topic,
        difficulty: question.difficulty,
        timeLimit: getTimeLimitForDifficulty(question.difficulty),
        text: question.text[lang],
        options: question.choices[lang],
        textEn: question.text.en,
        textAr: question.text.ar,
        optionsEn: question.choices.en,
        optionsAr: question.choices.ar,
        explanationEn: question.explanation?.en,
        explanationAr: question.explanation?.ar,
        correctIndex: question.correctIndex,
    };
}
function getTimeLimitForDifficulty(difficulty) {
    switch (difficulty) {
        case enums_1.Difficulty.Novice:
            return 30;
        case enums_1.Difficulty.Scholar:
            return 25;
        case enums_1.Difficulty.Sage:
            return 20;
        case enums_1.Difficulty.Master:
            return 15;
        case enums_1.Difficulty.Legend:
            return 12;
        default:
            return 25;
    }
}
// ============================================================
// Config & Scoring
// ============================================================
exports.CATEGORY_SAFETY_MAP = {
    [enums_1.QuestionCategory.Anime]: enums_1.SafetyLevel.LEVEL_1_AI_SAFE,
    [enums_1.QuestionCategory.Movies]: enums_1.SafetyLevel.LEVEL_1_AI_SAFE,
    [enums_1.QuestionCategory.TVSeries]: enums_1.SafetyLevel.LEVEL_1_AI_SAFE,
    [enums_1.QuestionCategory.Games]: enums_1.SafetyLevel.LEVEL_1_AI_SAFE,
    [enums_1.QuestionCategory.Music]: enums_1.SafetyLevel.LEVEL_1_AI_SAFE,
    [enums_1.QuestionCategory.InternetCulture]: enums_1.SafetyLevel.LEVEL_1_AI_SAFE,
    [enums_1.QuestionCategory.Technology]: enums_1.SafetyLevel.LEVEL_1_AI_SAFE,
    [enums_1.QuestionCategory.Mathematics]: enums_1.SafetyLevel.LEVEL_1_AI_SAFE,
    [enums_1.QuestionCategory.Logic]: enums_1.SafetyLevel.LEVEL_1_AI_SAFE,
    [enums_1.QuestionCategory.History]: enums_1.SafetyLevel.LEVEL_2_CONTROLLED,
    [enums_1.QuestionCategory.Sports]: enums_1.SafetyLevel.LEVEL_2_CONTROLLED,
    [enums_1.QuestionCategory.General]: enums_1.SafetyLevel.LEVEL_2_CONTROLLED,
    [enums_1.QuestionCategory.Science]: enums_1.SafetyLevel.LEVEL_2_CONTROLLED,
    [enums_1.QuestionCategory.Language]: enums_1.SafetyLevel.LEVEL_2_CONTROLLED,
    [enums_1.QuestionCategory.Islamic]: enums_1.SafetyLevel.LEVEL_3_VERIFIED,
    [enums_1.QuestionCategory.Comics]: enums_1.SafetyLevel.LEVEL_1_AI_SAFE,
    [enums_1.QuestionCategory.Streaming]: enums_1.SafetyLevel.LEVEL_1_AI_SAFE,
    [enums_1.QuestionCategory.CurrentAffairs]: enums_1.SafetyLevel.LEVEL_2_CONTROLLED,
};
exports.CATEGORY_SAFETY_LEVELS = {
    [enums_1.QuestionCategory.Anime]: enums_1.ContentSafetyLevel.FullAI,
    [enums_1.QuestionCategory.Movies]: enums_1.ContentSafetyLevel.FullAI,
    [enums_1.QuestionCategory.TVSeries]: enums_1.ContentSafetyLevel.ControlledAI,
    [enums_1.QuestionCategory.Games]: enums_1.ContentSafetyLevel.FullAI,
    [enums_1.QuestionCategory.Music]: enums_1.ContentSafetyLevel.FullAI,
    [enums_1.QuestionCategory.InternetCulture]: enums_1.ContentSafetyLevel.FullAI,
    [enums_1.QuestionCategory.Technology]: enums_1.ContentSafetyLevel.FullAI,
    [enums_1.QuestionCategory.Mathematics]: enums_1.ContentSafetyLevel.FullAI,
    [enums_1.QuestionCategory.Logic]: enums_1.ContentSafetyLevel.FullAI,
    [enums_1.QuestionCategory.History]: enums_1.ContentSafetyLevel.ControlledAI,
    [enums_1.QuestionCategory.Sports]: enums_1.ContentSafetyLevel.ControlledAI,
    [enums_1.QuestionCategory.General]: enums_1.ContentSafetyLevel.ControlledAI,
    [enums_1.QuestionCategory.Science]: enums_1.ContentSafetyLevel.ControlledAI,
    [enums_1.QuestionCategory.Language]: enums_1.ContentSafetyLevel.ControlledAI,
    [enums_1.QuestionCategory.Islamic]: enums_1.ContentSafetyLevel.StrictVerified,
    [enums_1.QuestionCategory.Comics]: enums_1.ContentSafetyLevel.FullAI,
    [enums_1.QuestionCategory.Streaming]: enums_1.ContentSafetyLevel.FullAI,
    [enums_1.QuestionCategory.CurrentAffairs]: enums_1.ContentSafetyLevel.ControlledAI,
};
exports.DIFFICULTY_MULTIPLIER = {
    [enums_1.Difficulty.Novice]: 1,
    [enums_1.Difficulty.Scholar]: 1.5,
    [enums_1.Difficulty.Sage]: 2,
    [enums_1.Difficulty.Master]: 3,
    [enums_1.Difficulty.Legend]: 5,
};
exports.BASE_SCORE = 1000;
exports.TIME_BONUS_FACTOR = 0.5;
exports.GAME_MODE_CONFIG = {
    // Solo: Each player alone (e.g., 5 players in room, each competing individually)
    [enums_1.GameMode.Solo]: { maxPlayers: 8, rounds: 15, hasPowerUps: true, description: "Every warrior for themselves" },
    // Teams: Team vs Team (e.g., 3 vs 2)
    [enums_1.GameMode.Teams]: { maxPlayers: 20, rounds: 15, hasPowerUps: true, description: "Red team vs Blue team" },
    // Mixed: Teams + Solo players combined (e.g., 2 teams vs solo vs solo)
    [enums_1.GameMode.Mixed]: { maxPlayers: 12, rounds: 20, hasPowerUps: true, description: "Teams and solo warriors battle together" },
    // Survival: Last player standing
    [enums_1.GameMode.Survival]: { maxPlayers: 10, rounds: 25, hasPowerUps: true, description: "Elimination until one remains" },
    // Blitz: Fast mode (solo or teams) - NO powerups for speed
    [enums_1.GameMode.Blitz]: { maxPlayers: 8, rounds: 10, hasPowerUps: false, description: "Fast-paced battle, no powerups" },
    // Conquest: Territory control mode
    [enums_1.GameMode.Conquest]: { maxPlayers: 8, rounds: 12, hasPowerUps: true, description: "Conquer the map" },
    // Custom: Host configures everything (teams, players, rounds, powerups)
    [enums_1.GameMode.Custom]: { maxPlayers: 20, rounds: 15, hasPowerUps: true, description: "Host chooses all settings" },
};
__exportStar(require("./quotes"), exports);

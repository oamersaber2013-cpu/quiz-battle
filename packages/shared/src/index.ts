// ============================================================
// Core Enums
// ============================================================

export * from "./enums";

import {
  Difficulty,
  GameMode,
  GameStatus,
  PowerUpType,
  QuestionCategory,
  QuestionTopic,
  ContentSafetyLevel,
  SafetyLevel,
  QuestionType,
} from "./enums";

// ============================================================
// Question Types
// ============================================================

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  category: string;
  difficulty: Difficulty;
  timeLimit: number;
}

export interface MultilingualText {
  en: string;
  ar: string;
}

export interface MultilingualChoices {
  en: string[];
  ar: string[];
}

export interface MultilingualQuestion {
  id?: string;
  category: QuestionCategory;
  topic: QuestionTopic;
  difficulty: Difficulty;
  text: MultilingualText;
  choices: MultilingualChoices;
  correctIndex: number;
  explanation?: MultilingualText;
  reference?: string;
  sourceType: "verified" | "ai_generated" | "hybrid";
  safetyLevel: ContentSafetyLevel;
  metadata?: {
    verifiedBy?: string;
    aiModel?: string;
    generationDate?: string;
    validationScore?: number;
  };
}

export interface ClientQuestion {
  id: string;
  category: string;
  topic?: string;
  subtopic?: string;
  difficulty: Difficulty;
  timeLimit: number;
  
  // Question type - defines the format
  type?: QuestionType;  // Defaults to MultipleChoice if not specified

  // Primary runtime fields used across web/api
  text: string;                          // Question text (with [BLANK] for fill_blank)
  options: string[];                     // Available options
  
  // Type-specific fields
  correctIndex?: number;                 // For MultipleChoice, TrueFalse, media questions
  correctIndices?: number[];             // For MultiSelect (multiple correct answers)
  correctOrder?: number[];              // For Ordering (correct sequence)
  correctAnswer?: string;                // For FillBlank (text answer)
  acceptedAnswers?: string[];            // For FillBlank (alternative spellings)
  
  // Media attachments - REAL audio, images, video
  imageUrl?: string;                     // For ImageQuestion - actual photo/illustration
  audioUrl?: string;                     // For AudioQuestion - actual sound file
  videoUrl?: string;                     // For VideoQuestion - actual video clip
  optionImages?: string[];               // Images for options
  
  // Hints and explanations
  hint?: string;                         // Optional hint for player
  explanation?: string;                  // Explanation shown after answering
  
  // Optional bilingual payload fields (legacy/new consumers)
  textEn?: string;
  textAr?: string;
  optionsEn?: string[];
  optionsAr?: string[];
  explanationEn?: string;
  explanationAr?: string;
  hintEn?: string;
  hintAr?: string;

  // Power-up effects active on this question
  activePowerUps?: ActivePowerUpEffect[];
}

export function toClientQuestion(
  question: MultilingualQuestion,
  lang: "en" | "ar" = "en"
): ClientQuestion & { correctIndex: number } {
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

function getTimeLimitForDifficulty(difficulty: Difficulty): number {
  switch (difficulty) {
    case Difficulty.Novice:
      return 30;
    case Difficulty.Scholar:
      return 25;
    case Difficulty.Sage:
      return 20;
    case Difficulty.Master:
      return 15;
    case Difficulty.Legend:
      return 12;
    default:
      return 25;
  }
}

// ============================================================
// Game State Types
// ============================================================

export interface ActivePowerUpEffect {
  type: PowerUpType;
  sourceUserId: string;
  targetUserId?: string;
  expiresAt?: number;
}

export interface PlayerState {
  userId: string;
  username: string;
  avatar?: string;
  score: number;
  rank: number | string;
  streak: number;
  isEliminated: boolean;
  isConnected: boolean;
  powerUpInventory: PowerUpType[];
  team?: string;
  isBot?: boolean;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface GameRoom {
  gameId: string;
  joinCode: string;
  hostId: string;
  mode: GameMode;
  difficulty: Difficulty;
  status: GameStatus;
  players: Record<string, PlayerState>;
  currentRound: number;
  totalRounds: number;
  maxPlayers: number;
  category?: string;
  subcategory?: string;
  language?: "en" | "ar";
  createdAt?: number;
  password?: string; // For private rooms
  isPrivate?: boolean;
  chat?: ChatMessage[]; // Room chat messages
  readyPlayers?: string[]; // Players who are ready
}

export interface TeamScoreState {
  red: { players: string[]; score: number };
  blue: { players: string[]; score: number };
}

export interface SyncedGameRoom extends Omit<GameRoom, "players"> {
  players: PlayerState[];
  activeEffects?: ActivePowerUpEffect[];
  teams?: TeamScoreState;
  territories?: Record<string, string | null>;
  playerTerritories?: Record<string, string[]>;
}

export interface PowerUpAppliedPayload extends ActivePowerUpEffect {
  eliminatedIndices?: number[];
}

// Conquest mode types
export interface ConquestTerritoryData {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
  adjacentIds: string[];
}

export interface ConquestDuelQuestion {
  id: string;
  text: string;
  options: string[];
  timeLimit: number;
}

export interface ConquestClientState {
  territories: Record<string, string | null>;      // territoryId -> ownerId
  fortHealth: Record<string, number>;              // playerId -> 1-3
  fortTerritoryId: Record<string, string>;         // playerId -> their fort's territory id
  turnOrder: string[];
  currentTurnIndex: number;
  phase: 'draft' | 'draft_selection' | 'select_target' | 'battle' | 'rebuild' | 'ended';
  eliminatedPlayers: string[];
  draftPhase?: {
    currentRound: number;
    question: ConquestDuelQuestion | null;
    answered: number;
    totalPlayers: number;
    pickOrder: string[];
    currentPickerIndex: number;
    availableTerritories: string[];
    picksRemaining: Record<string, number>;
  } | null;
  currentBattle: {
    attackerId: string;
    defenderId: string;
    targetTerritoryId: string;
    isAttackingFort: boolean;
    question: ConquestDuelQuestion;
    attackerAnswered: boolean;
    defenderAnswered: boolean;
    consecutiveCorrect: number;
  } | null;
  rebuildSession: {
    playerId: string;
    question: ConquestDuelQuestion;
    answered: boolean;
  } | null;
}

// Invasion Mode State (Phase 2 of conquest)
export interface InvasionClientState {
  territories: { id: string | number; ownerId: string | null; troopCount: number; }[];
  currentRound: number;
  totalRounds: number;
  phase: 'question' | 'ranking' | 'selection' | 'ended';
  currentQuestion: { id: string; text: string; options: string[]; timeLimit: number; } | null;
  lastRanking: { playerId: string; playerName: string; rank: number; picks: number; responseTimeMs: number; }[];
  selectionPhase: {
    isActive: boolean;
    pickingPlayerId: string | null;
    picksRemaining: number;
    turnIndex: number;
  };
}

// ============================================================
// Socket Event Contracts
// ============================================================

export interface ServerToClientEvents {
  "game:state": (state: unknown) => void;
  "game:error": (data: { message: string }) => void;
  "game:countdown": (data: { seconds: number }) => void;
  "game:question": (data: {
    question: Omit<ClientQuestion, "correctIndex">;
    round: number;
    totalRounds: number;
  }) => void;
  "game:answerResult": (data: {
    userId: string;
    correct: boolean;
    scoreDelta: number;
    newScore: number;
    correctIndex: number;
  }) => void;
  "game:scoreboard": (data: { players: PlayerState[] }) => void;
  "game:playerEliminated": (data: { userId: string; reason: string }) => void;
  "game:powerUpApplied": (
    data: PowerUpAppliedPayload
  ) => void;
  "game:end": (data: {
    results: Array<{
      userId: string;
      username: string;
      score: number;
      rank: number;
      correctAnswers: number;
      totalAnswers: number;
      avgAnswerTime: number;
      xpEarned: number;
    }>;
    xpAwarded: number;
  }) => void;
  "game:emote": (data: { userId: string; emote: string }) => void;
  "game:message": (data: {
    userId: string;
    username: string;
    message: string;
    timestamp: number;
  }) => void;
  "game:stateSync": (data: {
    room: SyncedGameRoom;
  }) => void;
  "game:playerJoined": (data: { player: PlayerState }) => void;
  "game:playerLeft": (data: { userId: string }) => void;
  // PowerUp selection phase
  "game:powerUpSelectStart": (data: {
    availablePowerUps: PowerUpType[];
    maxSelections: number;
    timeLimit: number;
  }) => void;
  "game:powerUpSelected": (data: {
    userId: string;
    powerUp: PowerUpType;
    remainingSlots: number;
  }) => void;
  "game:powerUpSelectEnd": (data: {
    selections: Record<string, PowerUpType[]>;
  }) => void;
  "game:teamScores": (data: {
    red: TeamScoreState["red"];
    blue: TeamScoreState["blue"];
  }) => void;
  "game:territoryCaptured": (data: {
    territoryId: string;
    capturedBy: string;
    playerName: string;
  }) => void;
  "game:territoryState": (data: {
    territories: Record<string, string | null>;
    playerTerritories: Record<string, string[]>;
  }) => void;
  // Chat
  "game:chat": (data: ChatMessage) => void;
  // Ready check
  "game:playerReady": (data: { userId: string; isReady: boolean }) => void;
  "game:allPlayersReady": () => void;
  // Spectator
  "game:spectatorJoined": (data: { spectatorId: string; spectatorCount: number }) => void;
  "game:spectatorLeft": (data: { spectatorId: string; spectatorCount: number }) => void;
  // Reconnect
  "game:reconnected": (data: { gameId: string; state: SyncedGameRoom }) => void;
  // Question review
  "game:questionReview": (data: {
    question: ClientQuestion;
    correctIndex: number;
    explanation?: { en?: string; ar?: string };
    playerAnswers: Record<string, number>;
  }) => void;
  // Conquest events
  "conquest:state": (data: ConquestClientState) => void;
  "conquest:turnStart": (data: { playerId: string; playerName: string }) => void;
  "conquest:duelResult": (data: {
    attackerWon: boolean;
    attackerCorrect: boolean;
    defenderCorrect: boolean;
    correctIndex: number;
    capturedTerritoryId?: string;
    fortDamage?: number;
    eliminatedPlayerId?: string;
    tieBreaker?: boolean;
  }) => void;
  "conquest:rebuildResult": (data: {
    playerId: string;
    success: boolean;
    correctIndex: number;
    newHealth: number;
  }) => void;
  // Conquest Draft Phase events (Splitting the world)
  "conquest:draftQuestion": (data: {
    round: number;
    question: { id: string; text: string; options: string[]; timeLimit: number };
  }) => void;
  "conquest:draftRanking": (data: {
    round: number;
    ranking: { playerId: string; playerName: string; rank: number; picks: number; correct: boolean; responseTimeMs: number | null }[];
    pickOrder: { playerId: string; playerName: string; picksRemaining: number }[];
  }) => void;
  "conquest:draftPickTurn": (data: {
    playerId: string;
    playerName: string;
    picksRemaining: number;
    availableTerritories: string[];
  }) => void;
  "conquest:territoryClaimed": (data: {
    territoryId: string;
    playerId: string;
    playerName: string;
    isFort: boolean;
  }) => void;
  "conquest:draftComplete": (data: {
    territories: Record<string, string | null>;
    playerTerritories: Record<string, string[]>;
  }) => void;
  // Invasion events (Phase 2 of conquest)
  "invasion:init": (data: { gameId: string; playerIds: string[]; totalRounds?: number }) => void;
  "invasion:state": (data: InvasionClientState) => void;
  "invasion:roundStart": (data: {
    round: number;
    totalRounds: number;
    question: { id: string; text: string; options: string[]; timeLimit: number; };
  }) => void;
  "invasion:ranking": (data: {
    ranking: { playerId: string; playerName: string; rank: number; picks: number; responseTimeMs: number; }[];
    correctAnswer?: number;
  }) => void;
  "invasion:turn": (data: {
    playerId: string;
    playerName: string;
    picksRemaining: number;
    selectableTerritories?: number[];
    timeLimit?: number;
  }) => void;
  "invasion:territoryUpdate": (
    data:
      | { territories: { id: string | number; ownerId: string | null; troopCount: number; }[] }
      | { territoryId: string | number; ownerId: string | null; troopCount: number; conquered?: boolean }
  ) => void;
  "invasion:gameEnd": (data: {
    winnerId?: string;
    winnerName?: string;
    finalTerritories?: Record<string, number>;
    scores?: Record<string, number>;
    winner?: { playerId: string; playerName?: string };
  }) => void;
  // CHAOS mode events
  "chaos:init": (data: {
    chaosLevel: number;
    chaosState: string;
    personality: string;
    message: string;
  }) => void;
  "chaos:drama": (data: {
    id: string;
    type: string;
    playerId: string;
    username: string;
  }) => void;
  "chaos:votingStart": (data: {
    dramaEventId: string;
    targetPlayerId: string;
    targetUsername: string;
    duration: number;
    options: string[];
  }) => void;
  "chaos:votingUpdate": (data: {
    totalVotes: number;
    voteCounts: Record<string, number>;
    timeRemaining: number;
  }) => void;
  "chaos:votingComplete": (data: {
    result: string;
    targetPlayerId: string;
    targetUsername: string;
    voteCounts: Record<string, number>;
  }) => void;
  "chaos:voteConfirmed": (data: { vote: string }) => void;
  "chaos:trapActivated": (data: {
    targetPlayerId: string;
    targetUsername: string;
    trapLevel: number;
    message: string;
  }) => void;
  "chaos:evaluating": (data: {
    message: string;
    correctRatio: number;
    playerCount: number;
  }) => void;
  "chaos:result": (data: {
    outcome: string;
    title: string;
    emoji: string;
    color: string;
    correctRatio: number;
    targetUsername: string;
    heroUsername?: string;
    playerResults: any[];
    summary: string;
  }) => void;
  "chaos:state": (data: {
    chaosLevel: number;
    chaosState: string;
    personality: string;
    factors: any;
    momentum: any;
  }) => void;
  "chaos:advantages": (data: {
    timeBonus: number;
    eliminatedOptions: number;
  }) => void;
}

export interface ClientToServerEvents {
  "game:join": (
    data: { joinCode?: string; gameId?: string; userId?: string; username?: string },
    cb?: (response: JoinResponse) => void
  ) => void;
  "game:start": (
    data: { gameId: string },
    cb?: (response: AckResponse) => void
  ) => void;
  "game:answer": (data: {
    gameId: string;
    questionId: string;
    answerIndex: number;
    clientTimestamp: number;
  }) => void;
  "player:answer": (data: {
    gameId: string;
    questionId: string;
    answerIndex: number;
    timestamp: number;
  }) => void;
  "game:emote": (data: { gameId: string; emote: string }) => void;
  "game:message": (data: { gameId: string; message: string }) => void;
  "game:usePowerUp": (
    data: { gameId: string; type: PowerUpType; targetUserId?: string },
    cb?: (response: AckResponse) => void
  ) => void;
  "player:powerup": (
    data: { gameId: string; type: PowerUpType; targetUserId?: string },
    cb?: (response: AckResponse) => void
  ) => void;
  "game:leave": (data: { gameId: string }) => void;
  "game:spectate": (data: { gameId: string }) => void;
  // PowerUp selection
  "game:selectPowerUp": (
    data: { gameId: string; powerUp: PowerUpType },
    cb?: (response: AckResponse & { remainingSlots?: number }) => void
  ) => void;
  "game:confirmPowerUpSelection": (
    data: { gameId: string },
    cb?: (response: AckResponse) => void
  ) => void;
  // Conquest events
  "conquest:attack": (
    data: { gameId: string; targetTerritoryId: string; categoryId?: string },
    cb?: (res: AckResponse) => void
  ) => void;
  "conquest:duelAnswer": (data: { gameId: string; answerIndex: number }) => void;
  "conquest:rebuild": (
    data: { gameId: string },
    cb?: (res: AckResponse) => void
  ) => void;
  "conquest:rebuildAnswer": (data: { gameId: string; answerIndex: number }) => void;
  "conquest:draftAnswer": (data: { gameId: string; answerIndex: number; responseTimeMs: number }) => void;
  "conquest:selectDraftTerritory": (
    data: { gameId: string; territoryId: string },
    cb?: (res: AckResponse) => void
  ) => void;
  "conquest:answer": (data: { gameId: string; answerIndex: number; responseTimeMs: number }) => void;
  "conquest:selectTarget": (data: { gameId: string; territoryId: string }) => void;
  "conquest:selectRebuild": (data: { gameId: string }) => void;
  // Invasion events (Phase 2 of conquest)
  "invasion:init": (
    data: { gameId: string; playerIds: string[]; totalRounds?: number },
    cb?: (res: AckResponse) => void
  ) => void;
  "invasion:startRound": (data: { gameId: string }) => void;
  "invasion:answer": (data: { gameId: string; answer: number; responseTimeMs: number }) => void;
  "invasion:selectTerritory": (
    data: { gameId: string; territoryId: string | number },
    cb?: (res: AckResponse) => void
  ) => void;
  "invasion:getState": (
    data: { gameId: string },
    cb?: (res: { success: boolean; state?: InvasionClientState }) => void
  ) => void;
  // CHAOS mode events
  "chaos:init": (data: { gameId: string; personality: string }) => void;
  "chaos:drama": (data: { gameId: string; type: string }) => void;
  "chaos:startVoting": (data: { gameId: string; dramaEventId: string; targetPlayerId: string; targetUsername: string }) => void;
  "chaos:vote": (data: { gameId: string; vote: string }) => void;
  "chaos:activateTrap": (data: { gameId: string; targetPlayerId: string }) => void;
  "chaos:answer": (data: { gameId: string; questionId: string; answerIndex: number; mode: string }) => void;
  "chaos:evaluateTrap": (data: { gameId: string }) => void;
  "chaos:getState": (data: { gameId: string }) => void;
  "chaos:getAdvantages": (data: { gameId: string }) => void;
}

// ============================================================
// API Response Types
// ============================================================

export interface JoinResponse {
  success: boolean;
  room?: Pick<
    GameRoom,
    "gameId" | "joinCode" | "hostId" | "mode" | "difficulty" | "status" | "maxPlayers" | "totalRounds" | "category" | "language"
  >;
  players?: PlayerState[];
  error?: string;
}

export interface AckResponse {
  success: boolean;
  error?: string;
}

export interface FinalResult {
  userId: string;
  username: string;
  avatar?: string;
  score: number;
  rank: number;
  correctAnswers: number;
  totalAnswers: number;
  avgAnswerTime: number;
  xpEarned: number;
}

// ============================================================
// Config & Scoring
// ============================================================

export const CATEGORY_SAFETY_MAP: Record<QuestionCategory, SafetyLevel> = {
  [QuestionCategory.Anime]: SafetyLevel.LEVEL_1_AI_SAFE,
  [QuestionCategory.Movies]: SafetyLevel.LEVEL_1_AI_SAFE,
  [QuestionCategory.TVSeries]: SafetyLevel.LEVEL_1_AI_SAFE,
  [QuestionCategory.Games]: SafetyLevel.LEVEL_1_AI_SAFE,
  [QuestionCategory.Music]: SafetyLevel.LEVEL_1_AI_SAFE,
  [QuestionCategory.InternetCulture]: SafetyLevel.LEVEL_1_AI_SAFE,
  [QuestionCategory.Technology]: SafetyLevel.LEVEL_1_AI_SAFE,
  [QuestionCategory.Mathematics]: SafetyLevel.LEVEL_1_AI_SAFE,
  [QuestionCategory.Logic]: SafetyLevel.LEVEL_1_AI_SAFE,
  [QuestionCategory.History]: SafetyLevel.LEVEL_2_CONTROLLED,
  [QuestionCategory.Sports]: SafetyLevel.LEVEL_2_CONTROLLED,
  [QuestionCategory.General]: SafetyLevel.LEVEL_2_CONTROLLED,
  [QuestionCategory.Science]: SafetyLevel.LEVEL_2_CONTROLLED,
  [QuestionCategory.Language]: SafetyLevel.LEVEL_2_CONTROLLED,
  [QuestionCategory.Islamic]: SafetyLevel.LEVEL_3_VERIFIED,
  [QuestionCategory.Comics]: SafetyLevel.LEVEL_1_AI_SAFE,
  [QuestionCategory.Streaming]: SafetyLevel.LEVEL_1_AI_SAFE,
  [QuestionCategory.CurrentAffairs]: SafetyLevel.LEVEL_2_CONTROLLED,
};

export const CATEGORY_SAFETY_LEVELS: Record<QuestionCategory, ContentSafetyLevel> = {
  [QuestionCategory.Anime]: ContentSafetyLevel.FullAI,
  [QuestionCategory.Movies]: ContentSafetyLevel.FullAI,
  [QuestionCategory.TVSeries]: ContentSafetyLevel.ControlledAI,
  [QuestionCategory.Games]: ContentSafetyLevel.FullAI,
  [QuestionCategory.Music]: ContentSafetyLevel.FullAI,
  [QuestionCategory.InternetCulture]: ContentSafetyLevel.FullAI,
  [QuestionCategory.Technology]: ContentSafetyLevel.FullAI,
  [QuestionCategory.Mathematics]: ContentSafetyLevel.FullAI,
  [QuestionCategory.Logic]: ContentSafetyLevel.FullAI,
  [QuestionCategory.History]: ContentSafetyLevel.ControlledAI,
  [QuestionCategory.Sports]: ContentSafetyLevel.ControlledAI,
  [QuestionCategory.General]: ContentSafetyLevel.ControlledAI,
  [QuestionCategory.Science]: ContentSafetyLevel.ControlledAI,
  [QuestionCategory.Language]: ContentSafetyLevel.ControlledAI,
  [QuestionCategory.Islamic]: ContentSafetyLevel.StrictVerified,
  [QuestionCategory.Comics]: ContentSafetyLevel.FullAI,
  [QuestionCategory.Streaming]: ContentSafetyLevel.FullAI,
  [QuestionCategory.CurrentAffairs]: ContentSafetyLevel.ControlledAI,
};

export const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  [Difficulty.Novice]: 1,
  [Difficulty.Scholar]: 1.5,
  [Difficulty.Sage]: 2,
  [Difficulty.Master]: 3,
  [Difficulty.Legend]: 5,
};

export const BASE_SCORE = 1000;
export const TIME_BONUS_FACTOR = 0.5;

export const GAME_MODE_CONFIG: Record<
  GameMode,
  { maxPlayers: number; rounds: number; hasPowerUps: boolean; description: string }
> = {
  // Classic: Solo or multi-player, standard quiz battle
  [GameMode.Classic]: { maxPlayers: 8, rounds: 15, hasPowerUps: true, description: "Every warrior for themselves" },

  // Survival: Last player standing — elimination on wrong answer
  [GameMode.Survival]: { maxPlayers: 10, rounds: 25, hasPowerUps: true, description: "Elimination until one remains" },

  // Conquest: Territory control mode
  [GameMode.Conquest]: { maxPlayers: 8, rounds: 12, hasPowerUps: true, description: "Conquer the map" },

  // Chaos: Unpredictable social drama mode with voting & traps
  [GameMode.Chaos]: { maxPlayers: 8, rounds: 15, hasPowerUps: true, description: "Expect the unexpected" },

  // Custom: Host configures everything (teams, players, rounds, powerups)
  [GameMode.Custom]: { maxPlayers: 20, rounds: 15, hasPowerUps: true, description: "Host chooses all settings" },
};

export * from "./quotes";
export * from "./characters";

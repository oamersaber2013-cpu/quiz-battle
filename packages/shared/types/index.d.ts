export declare enum GameMode {
    Solo = "solo",
    Teams = "teams",
    Mixed = "mixed",
    Survival = "survival",
    Blitz = "blitz",
    Conquest = "conquest",
    Chaos = "chaos",
    Rush = "rush",
    Custom = "custom"
}
export declare enum Difficulty {
    Novice = "novice",
    Scholar = "scholar",
    Sage = "sage",
    Master = "master",
    Legend = "legend",
    Easy = "novice",
    Medium = "scholar",
    Hard = "sage",
    Genius = "master",
    Extreme = "legend"
}
export declare enum GameStatus {
    Lobby = "lobby",
    Countdown = "countdown",
    Question = "question",
    AnswerReveal = "answer_reveal",
    Results = "results",
    Ended = "ended"
}
export declare enum PowerUpType {
    Shield = "shield",
    FiftyFifty = "fifty_fifty",
    Freeze = "freeze",
    DoubleDown = "double_down",
    Steal = "steal",
    DoublePick = "double_pick",
    Whole = "whole",
    Sandstorm = "sandstorm",
    TimeWarp = "time_warp"
}
export declare enum UserRole {
    Guest = "guest",
    Free = "free",
    Subscriber = "subscriber",
    Admin = "admin"
}
export declare enum QuestionCategory {
    Anime = "anime",
    Movies = "movies",
    TVSeries = "tv_series",
    Games = "games",
    Music = "music",
    InternetCulture = "internet_culture",
    Technology = "technology",
    Mathematics = "math",
    Logic = "logic",
    History = "history",
    Sports = "sports",
    General = "general",
    Science = "science",
    Language = "language",
    Islamic = "islamic",
    Comics = "comics",
    Streaming = "streaming",
    CurrentAffairs = "current_affairs",
    ANIME = "anime",
    MOVIES = "movies",
    TV_SERIES = "tv_series",
    GAMING = "games",
    MUSIC = "music",
    INTERNET_CULTURE = "internet_culture",
    TECHNOLOGY = "technology",
    MATH = "math",
    LOGIC = "logic",
    HISTORY = "history",
    SPORTS = "sports",
    GENERAL = "general",
    SCIENCE = "science",
    LANGUAGE = "language",
    ISLAMIC = "islamic",
    Math = "math"
}
export declare enum QuestionTopic {
    Geography = "geography",
    Capitals = "capitals",
    Flags = "flags",
    Landmarks = "landmarks",
    Inventions = "inventions",
    Physics = "physics",
    Chemistry = "chemistry",
    Biology = "biology",
    Astronomy = "astronomy",
    WorldHistory = "world_history",
    AncientCivilizations = "ancient_civilizations",
    ModernHistory = "modern_history",
    Wars = "wars",
    Arithmetic = "arithmetic",
    Algebra = "algebra",
    Geometry = "geometry",
    LogicPuzzles = "logic_puzzles",
    EnglishGrammar = "english_grammar",
    ArabicGrammar = "arabic_grammar",
    Vocabulary = "vocabulary",
    Proverbs = "proverbs",
    Literature = "literature",
    Quran = "quran",
    Hadith = "hadith",
    Seerah = "seerah",
    Fiqh = "fiqh",
    Football = "football",
    Basketball = "basketball",
    Tennis = "tennis",
    Olympics = "olympics",
    AnimeSeries = "anime_series",
    Manga = "manga",
    AnimeCharacters = "anime_characters",
    AnimeBattles = "anime_battles",
    FilmPlots = "film_plots",
    FamousFilms = "famous_films",
    Actors = "actors",
    Scenes = "scenes",
    VideoGames = "video_games",
    GameMechanics = "game_mechanics",
    Esports = "esports",
    Programming = "programming",
    AI = "ai",
    Cybersecurity = "cybersecurity",
    InternetHistory = "internet_history"
}
export declare enum ContentSafetyLevel {
    FullAI = "full_ai",
    ControlledAI = "controlled_ai",
    StrictVerified = "strict_verified"
}
export declare enum SafetyLevel {
    LEVEL_1_AI_SAFE = "level_1_ai_safe",
    LEVEL_2_CONTROLLED = "level_2_controlled",
    LEVEL_3_VERIFIED = "level_3_verified"
}
export declare enum RankTier {
    Bronze = "bronze",
    Silver = "silver",
    Gold = "gold",
    Platinum = "platinum",
    Diamond = "diamond",
    Grandmaster = "grandmaster"
}
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
    text: string;
    options: string[];
    textEn?: string;
    textAr?: string;
    optionsEn?: string[];
    optionsAr?: string[];
    explanationEn?: string;
    explanationAr?: string;
    correctIndex?: number;
    activePowerUps?: ActivePowerUpEffect[];
}
export declare function toClientQuestion(question: MultilingualQuestion, lang?: "en" | "ar"): ClientQuestion & {
    correctIndex: number;
};
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
}
export interface TeamScoreState {
    red: {
        players: string[];
        score: number;
    };
    blue: {
        players: string[];
        score: number;
    };
}
export interface SyncedGameRoom extends Omit<GameRoom, "players"> {
    players: PlayerState[];
    activeEffects?: ActivePowerUpEffect[];
    teams?: TeamScoreState;
    territories?: Record<number, string | null>;
    playerTerritories?: Record<string, number[]>;
}
export interface PowerUpAppliedPayload extends ActivePowerUpEffect {
    eliminatedIndices?: number[];
}
export interface ServerToClientEvents {
    "game:state": (state: unknown) => void;
    "game:error": (data: {
        message: string;
    }) => void;
    "game:countdown": (data: {
        seconds: number;
    }) => void;
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
    "game:scoreboard": (data: {
        players: PlayerState[];
    }) => void;
    "game:playerEliminated": (data: {
        userId: string;
        reason: string;
    }) => void;
    "game:powerUpApplied": (data: PowerUpAppliedPayload) => void;
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
    "game:emote": (data: {
        userId: string;
        emote: string;
    }) => void;
    "game:message": (data: {
        userId: string;
        username: string;
        message: string;
        timestamp: number;
    }) => void;
    "game:stateSync": (data: {
        room: SyncedGameRoom;
    }) => void;
    "game:playerJoined": (data: {
        player: PlayerState;
    }) => void;
    "game:playerLeft": (data: {
        userId: string;
    }) => void;
    "game:teamScores": (data: {
        red: TeamScoreState["red"];
        blue: TeamScoreState["blue"];
    }) => void;
    "game:territoryCaptured": (data: {
        territoryIndex: number;
        capturedBy: string;
        playerName: string;
    }) => void;
    "game:territoryState": (data: {
        territories: Record<number, string | null>;
        playerTerritories: Record<string, number[]>;
    }) => void;
    "matchmaking:status": (data: {
        status: "searching" | "found";
        estimatedWait?: number;
        playersFound?: number;
    }) => void;
    "matchmaking:matchFound": (data: {
        gameId: string;
        joinCode: string;
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
    "game:join": (data: {
        joinCode?: string;
        gameId?: string;
        userId?: string;
        username?: string;
    }, cb?: (response: JoinResponse) => void) => void;
    "game:start": (data: {
        gameId: string;
    }, cb?: (response: AckResponse) => void) => void;
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
    "game:emote": (data: {
        gameId: string;
        emote: string;
    }) => void;
    "game:message": (data: {
        gameId: string;
        message: string;
    }) => void;
    "game:usePowerUp": (data: {
        gameId: string;
        type: PowerUpType;
        targetUserId?: string;
    }, cb?: (response: AckResponse) => void) => void;
    "player:powerup": (data: {
        gameId: string;
        type: PowerUpType;
        targetUserId?: string;
    }, cb?: (response: AckResponse) => void) => void;
    "game:leave": (data: {
        gameId: string;
    }) => void;
    "game:spectate": (data: {
        gameId: string;
    }) => void;
    "matchmaking:join": (data: {
        userId: string;
        username: string;
        rank: string;
    }) => void;
    "matchmaking:leave": (data: {
        userId: string;
    }) => void;
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
export interface JoinResponse {
    success: boolean;
    room?: Pick<GameRoom, "gameId" | "joinCode" | "mode" | "difficulty" | "status" | "maxPlayers">;
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
export declare const CATEGORY_SAFETY_MAP: Record<QuestionCategory, SafetyLevel>;
export declare const CATEGORY_SAFETY_LEVELS: Record<QuestionCategory, ContentSafetyLevel>;
export declare const DIFFICULTY_MULTIPLIER: Record<Difficulty, number>;
export declare const BASE_SCORE = 1000;
export declare const TIME_BONUS_FACTOR = 0.5;
export declare const GAME_MODE_CONFIG: Record<GameMode, {
    maxPlayers: number;
    rounds: number;
    hasPowerUps: boolean;
}>;
export declare const RANK_XP_THRESHOLDS: Record<RankTier, number>;

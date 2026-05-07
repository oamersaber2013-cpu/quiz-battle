export enum GameMode {
  Classic = "classic",     // Standard mode: Solo/Teams/Blitz/Rush variants with player choice
  Conquest = "conquest",   // Territory control with Invasion as Phase 2
  Survival = "survival",   // Last player standing
  Chaos = "chaos",         // Unpredictable social drama with voting & traps
  Custom = "custom",       // Host configures everything
}

export enum Difficulty {
  Novice = "novice",
  Scholar = "scholar",
  Sage = "sage",
  Master = "master",
  Legend = "legend",
  Easy = "novice",
  Medium = "scholar",
  Hard = "sage",
  Genius = "master",
  Extreme = "legend",
}

export enum QuestionType {
  MultipleChoice = "multiple_choice",    // Standard 4-option single answer
  TrueFalse = "true_false",              // True/False questions
  MultiSelect = "multi_select",          // Multiple correct answers (select all)
  FillBlank = "fill_blank",              // Fill in the blank
  Ordering = "ordering",                 // Put items in correct order
  
  // MEDIA-BASED QUESTIONS - Real photos, audio, video
  ImageQuestion = "image_question",      // Show image, ask question about it
  AudioQuestion = "audio_question",      // Play sound, identify source
  VideoQuestion = "video_question",      // Short video clip
  
  // ADVANCED GUESS TYPES - Challenging trivia formats
  GuessSound = "guess_sound",            // Identify sound (animal, instrument, vehicle, etc)
  GuessCountry = "guess_country",        // Identify from silhouette, flag fragment, landmark
  GuessPerson = "guess_person",          // Identify famous person from clues/description
  GuessMovie = "guess_movie",            // Identify movie from quote, scene, or theme
  GuessLogo = "guess_logo",              // Identify brand from partial logo
  Riddle = "riddle",                     // Solve a riddle puzzle
  Anagram = "anagram",                   // Unscramble letters
  EmojiGuess = "emoji_guess",            // Guess from emoji combination
  Silhouette = "silhouette",             // Identify from silhouette/outline
}

export enum GameStatus {
  Lobby = "lobby",
  PowerUpSelect = "powerup_select",
  Countdown = "countdown",
  Question = "question",
  AnswerReveal = "answer_reveal",
  Results = "results",
  Ended = "ended",
}

export enum PowerUpType {
  Shield = "shield",
  FiftyFifty = "fifty_fifty",
  Freeze = "freeze",
  DoubleDown = "double_down",
  Steal = "steal",
  DoublePick = "double_pick",
  Whole = "whole",
  Sandstorm = "sandstorm",
  TimeWarp = "time_warp",
}

export enum UserRole {
  Guest = "guest",
  Free = "free",
  Subscriber = "subscriber",
  Admin = "admin",
}

export enum QuestionCategory {
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
  Math = "math",
}

export enum QuestionTopic {
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
  InternetHistory = "internet_history",
}

export enum ContentSafetyLevel {
  FullAI = "full_ai",
  ControlledAI = "controlled_ai",
  StrictVerified = "strict_verified",
}

export enum SafetyLevel {
  LEVEL_1_AI_SAFE = "level_1_ai_safe",
  LEVEL_2_CONTROLLED = "level_2_controlled",
  LEVEL_3_VERIFIED = "level_3_verified",
}

export enum RankTier {
  Bronze = "bronze",
  Silver = "silver",
  Gold = "gold",
  Platinum = "platinum",
  Diamond = "diamond",
  Grandmaster = "grandmaster",
}

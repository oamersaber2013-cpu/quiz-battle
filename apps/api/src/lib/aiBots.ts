/**
 * AI/Bot Player System
 * Automatically plays when human players are not available
 */

import { Server } from "socket.io";
import { getConquestState, recordDraftAnswer, selectDraftTerritory, handleAttack } from "./conquestOrchestrator";
import { fetchQuestions } from "./questions";

// TypedServer from socket/index.ts
type TypedServer = Server;

// Bot difficulty levels
export type BotDifficulty = "easy" | "medium" | "hard";

interface BotConfig {
  id: string;
  name: string;
  nameAr: string;
  difficulty: BotDifficulty;
  color: string;
  avatar: string;
}

// Pre-configured bots with different personalities
const BOT_TEMPLATES: BotConfig[] = [
  { id: "bot_1", name: "Alexander", nameAr: "الإسكندر", difficulty: "hard", color: "#DC2626", avatar: "👑" },
  { id: "bot_2", name: "Genghis", nameAr: "جنكيز", difficulty: "hard", color: "#7C3AED", avatar: "⚔️" },
  { id: "bot_3", name: "Napoleon", nameAr: "نابليون", difficulty: "medium", color: "#2563EB", avatar: "🎖️" },
  { id: "bot_4", name: "Caesar", nameAr: "قيصر", difficulty: "hard", color: "#EA580C", avatar: "🏛️" },
  { id: "bot_5", name: "Saladin", nameAr: "صلاح الدين", difficulty: "medium", color: "#059669", avatar: "🛡️" },
  { id: "bot_6", name: "Hannibal", nameAr: "حنبعل", difficulty: "hard", color: "#7C2D12", avatar: "🐘" },
];

// Active bot instances per game
const activeBots = new Map<string, Map<string, BotInstance>>();

interface BotInstance {
  config: BotConfig;
  gameId: string;
  io: TypedServer;
  timerHandle?: NodeJS.Timeout;
}

/**
 * Generate a bot response time based on difficulty
 * Hard: 1-4 seconds (fast)
 * Medium: 3-7 seconds
 * Easy: 5-10 seconds (slow)
 */
function getBotResponseTime(difficulty: BotDifficulty): number {
  const ranges = {
    easy: { min: 5000, max: 10000 },
    medium: { min: 3000, max: 7000 },
    hard: { min: 1000, max: 4000 }
  };
  const range = ranges[difficulty];
  return Math.floor(Math.random() * (range.max - range.min) + range.min);
}

/**
 * Get bot answer accuracy based on difficulty
 * Hard: 70-95% correct
 * Medium: 50-75% correct  
 * Easy: 30-55% correct
 */
function shouldAnswerCorrectly(difficulty: BotDifficulty): boolean {
  const accuracy = {
    easy: 0.42,
    medium: 0.62,
    hard: 0.82
  };
  return Math.random() < accuracy[difficulty];
}

/**
 * Add bots to fill a game to minimum player count
 */
export async function fillWithBots(
  io: TypedServer,
  gameId: string,
  currentPlayerCount: number,
  targetPlayerCount: number = 3,
  difficulty: BotDifficulty = "medium"
): Promise<string[]> {
  const botsNeeded = targetPlayerCount - currentPlayerCount;
  if (botsNeeded <= 0) return [];
  
  const addedBotIds: string[] = [];
  const gameBots = new Map<string, BotInstance>();
  
  for (let i = 0; i < botsNeeded; i++) {
    const template = BOT_TEMPLATES[i % BOT_TEMPLATES.length];
    const botId = `${template.id}_${Date.now()}_${i}`;
    
    const bot: BotInstance = {
      config: { ...template, id: botId, difficulty },
      gameId,
      io
    };
    
    gameBots.set(botId, bot);
    addedBotIds.push(botId);
    
    // Join the game room
    io.to(gameId).emit("playerJoined", {
      playerId: botId,
      playerName: template.name,
      playerNameAr: template.nameAr,
      isBot: true,
      color: template.color,
      avatar: template.avatar
    });
  }
  
  activeBots.set(gameId, gameBots);
  console.log(`[Bots] Added ${botsNeeded} bots to game ${gameId}`);
  return addedBotIds;
}

/**
 * Handle Conquest Draft Phase for bots
 */
export function handleBotDraftAnswer(
  gameId: string,
  question: { correctIndex: number; options: string[] },
  botId: string
): void {
  const gameBots = activeBots.get(gameId);
  if (!gameBots) return;
  
  const bot = gameBots.get(botId);
  if (!bot) return;
  
  const responseTime = getBotResponseTime(bot.config.difficulty);
  
  bot.timerHandle = setTimeout(() => {
    const isCorrect = shouldAnswerCorrectly(bot.config.difficulty);
    const answerIndex = isCorrect 
      ? question.correctIndex 
      : Math.floor(Math.random() * question.options.length);
    
    recordDraftAnswer(gameId, botId, answerIndex, responseTime);
    
    console.log(`[Bot ${bot.config.name}] answered in ${responseTime}ms, correct: ${isCorrect}`);
  }, responseTime);
}

/**
 * Handle Conquest Territory Selection for bots
 */
export function handleBotDraftSelection(
  io: TypedServer,
  gameId: string,
  availableTerritories: string[],
  botId: string
): void {
  const gameBots = activeBots.get(gameId);
  if (!gameBots) return;
  
  const bot = gameBots.get(botId);
  if (!bot) return;
  
  const delay = getBotResponseTime(bot.config.difficulty);
  
  bot.timerHandle = setTimeout(() => {
    // Pick a random available territory
    const pickIndex = Math.floor(Math.random() * availableTerritories.length);
    const territoryId = availableTerritories[pickIndex];
    
    const result = selectDraftTerritory(io, gameId, botId, territoryId);
    
    if (result.success) {
      console.log(`[Bot ${bot.config.name}] selected territory ${territoryId}`);
    }
  }, delay);
}

/**
 * Handle Conquest Attack for bots
 */
export function handleBotAttack(
  io: TypedServer,
  gameId: string,
  botId: string,
  botTerritories: string[],
  targetTerritories: string[]
): void {
  const gameBots = activeBots.get(gameId);
  if (!gameBots) return;
  
  const bot = gameBots.get(botId);
  if (!bot || targetTerritories.length === 0 || botTerritories.length === 0) return;
  
  const delay = getBotResponseTime(bot.config.difficulty);
  
  bot.timerHandle = setTimeout(async () => {
    // Pick best attack - prioritize attacking enemy forts or high-value targets
    const targetId = chooseBestAttack(botTerritories, targetTerritories);
    
    await handleAttack(io, gameId, botId, targetId);
    console.log(`[Bot ${bot.config.name}] attacked territory ${targetId}`);
  }, delay);
}

// Smart attack selection - pick attack that connects to the most targets
function chooseBestAttack(botTerritories: string[], targetTerritories: string[]): string {
  // Simple random for now - could be enhanced with adjacency logic
  return targetTerritories[Math.floor(Math.random() * targetTerritories.length)];
}

/**
 * Handle Invasion Mode for bots
 */
// Invasion mode bot functions removed - Conquest mode only

/**
 * Remove bots from a game
 */
export function removeBots(gameId: string): void {
  const gameBots = activeBots.get(gameId);
  if (!gameBots) return;
  
  gameBots.forEach(bot => {
    if (bot.timerHandle) {
      clearTimeout(bot.timerHandle);
    }
  });
  
  activeBots.delete(gameId);
  console.log(`[Bots] Removed all bots from game ${gameId}`);
}

/**
 * Get bot info for display
 */
export function getBotInfo(botId: string): BotConfig | null {
  for (const gameBots of activeBots.values()) {
    const bot = gameBots.get(botId);
    if (bot) return bot.config;
  }
  return null;
}

export { BOT_TEMPLATES };

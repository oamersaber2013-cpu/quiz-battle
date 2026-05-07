// ═══════════════════════════════════════════════════════════════════════════════
// CHAOS ENGINE V2.0 - Adaptive Reactive Chaos System
// Features: Multi-source chaos, chaos states, event pools, momentum, personalities
// ═══════════════════════════════════════════════════════════════════════════════

import { Server } from "socket.io";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export type ChaosState = "CALM" | "UNSTABLE" | "CHAOTIC" | "INSANITY" | "ANARCHY";
export type ChaosPersonality = "TRICKSTER" | "AGGRESSIVE" | "RANDOM" | "REVENGE";
export type DramaType = "TAB_LEFT" | "INACTIVITY" | "SWITCHED_APP" | "SUSPICIOUS_BEHAVIOR";
export type VoteOption = "FORGIVE" | "REDUCE_SCORE" | "BLOCK_QUESTION";
export type ChaosEvent = 
  | "NONE"
  | "SMALL_TIMER_CHANGE"
  | "SHUFFLE_ANSWERS"
  | "MINOR_PENALTY"
  | "VOTE_FLIP"
  | "TRAP_BOOST"
  | "SCORE_SWAP"
  | "DOUBLE_PENALTY"
  | "FULL_INVERSION"
  | "EVERYONE_LOSES"
  | "TIMER_HALVED"
  | "POINTS_TO_ZERO"
  | "LEADER_PUNISHED"
  | "RANDOM_TARGET"
  | "CHAOS_SURGE";

interface ChaosFactors {
  dramaEvents: number;        // tab switching, voting, accusations
  wrongAnswersStreak: number; // everyone struggling
  voteIntensity: number;      // how aggressive players are (0-10)
  closeScoreFactor: number;   // tight competition (0-10)
  timePressureFactor: number; // low timer (0-10)
}

interface PlayerChaosProfile {
  playerId: string;
  chaosImpactScore: number;    // How much chaos they've caused/suffered
  timesTargeted: number;       // How many times voted against
  lastDramaTime: number;
  trustScore: number;          // 0-100
}

interface ChaosMomentum {
  recentEvents: number[];      // Timestamps of recent events
  burstActive: boolean;
  burstMultiplier: number;
}

interface ChaosStateV2 {
  gameId: string;
  
  // Core chaos metrics
  chaosLevel: number;          // 0-100
  chaosState: ChaosState;
  personality: ChaosPersonality;
  
  // Multi-source factors
  factors: ChaosFactors;
  
  // Player profiles (anti-frustration)
  playerProfiles: Map<string, PlayerChaosProfile>;
  
  // Momentum system
  momentum: ChaosMomentum;
  
  // Cooldowns & timing
  lastChaosEvent: number;
  lastDecay: number;
  eventCooldowns: Map<ChaosEvent, number>;
  
  // Event history
  eventHistory: Array<{ event: ChaosEvent; timestamp: number; chaosLevel: number }>;
  
  // Voting state
  activeVoting: VotingSession | null;
  
  // Game state tracking
  consecutiveWrongAnswers: number;
  leaderPlayerId: string | null;
  scoreSpread: number;
}

interface VotingSession {
  dramaEventId: string;
  targetPlayerId: string;
  targetUsername: string;
  votes: Map<string, VoteOption>;
  startTime: number;
  duration: number;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  result?: VoteOption;
  intensity: number; // 0-10, how aggressive the votes are
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS & CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const CHAOS_STATE_THRESHOLDS: Record<ChaosState, { min: number; max: number }> = {
  CALM: { min: 0, max: 20 },
  UNSTABLE: { min: 20, max: 40 },
  CHAOTIC: { min: 40, max: 60 },
  INSANITY: { min: 60, max: 80 },
  ANARCHY: { min: 80, max: 100 },
};

const CHAOS_FACTORS_WEIGHTS = {
  dramaEvents: 5,         // Each drama event adds 5 chaos
  wrongAnswersStreak: 2,  // Each wrong answer streak adds 2 chaos
  voteIntensity: 3,       // Each intensity point adds 3 chaos
  closeScoreFactor: 4,    // Each competition point adds 4 chaos
  timePressureFactor: 2,  // Each pressure point adds 2 chaos
};

const CHAOS_DECAY_RATE = 2;      // Chaos decreases by 2 per round
const CHAOS_DECAY_INTERVAL = 30000; // 30 seconds
const MOMENTUM_BURST_THRESHOLD = 3; // 3 events in short time = burst
const MOMENTUM_BURST_BONUS = 20;   // +20 chaos on burst
const MOMENTUM_TIME_WINDOW = 10000; // 10 seconds window

const EVENT_COOLDOWNS: Record<ChaosEvent, number> = {
  NONE: 0,
  SMALL_TIMER_CHANGE: 5000,
  SHUFFLE_ANSWERS: 8000,
  MINOR_PENALTY: 10000,
  VOTE_FLIP: 15000,
  TRAP_BOOST: 12000,
  SCORE_SWAP: 20000,
  DOUBLE_PENALTY: 15000,
  FULL_INVERSION: 25000,
  EVERYONE_LOSES: 30000,
  TIMER_HALVED: 10000,
  POINTS_TO_ZERO: 35000,
  LEADER_PUNISHED: 20000,
  RANDOM_TARGET: 15000,
  CHAOS_SURGE: 10000,
};

// Event pools by chaos state
const EVENT_POOLS: Record<ChaosState, ChaosEvent[]> = {
  CALM: ["NONE", "SMALL_TIMER_CHANGE"],
  UNSTABLE: ["SMALL_TIMER_CHANGE", "SHUFFLE_ANSWERS", "MINOR_PENALTY"],
  CHAOTIC: ["SHUFFLE_ANSWERS", "VOTE_FLIP", "TRAP_BOOST", "MINOR_PENALTY"],
  INSANITY: ["VOTE_FLIP", "SCORE_SWAP", "DOUBLE_PENALTY", "TIMER_HALVED", "TRAP_BOOST"],
  ANARCHY: ["FULL_INVERSION", "EVERYONE_LOSES", "POINTS_TO_ZERO", "LEADER_PUNISHED", "CHAOS_SURGE"],
};

// Personality-based event modifiers
const PERSONALITY_WEIGHTS: Record<ChaosPersonality, Partial<Record<ChaosEvent, number>>> = {
  TRICKSTER: {
    VOTE_FLIP: 2.0,
    SHUFFLE_ANSWERS: 1.5,
    SCORE_SWAP: 1.3,
  },
  AGGRESSIVE: {
    DOUBLE_PENALTY: 2.0,
    EVERYONE_LOSES: 1.5,
    LEADER_PUNISHED: 1.5,
    POINTS_TO_ZERO: 1.3,
  },
  RANDOM: {
    // All events equal chance
  },
  REVENGE: {
    LEADER_PUNISHED: 2.5,
    TRAP_BOOST: 1.5,
    VOTE_FLIP: 1.3,
  },
};

// Store chaos states
const chaosStates = new Map<string, ChaosStateV2>();

// ═══════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

export function initializeChaosV2(
  gameId: string,
  personality: ChaosPersonality = "RANDOM"
): ChaosStateV2 {
  const state: ChaosStateV2 = {
    gameId,
    chaosLevel: 0,
    chaosState: "CALM",
    personality,
    factors: {
      dramaEvents: 0,
      wrongAnswersStreak: 0,
      voteIntensity: 0,
      closeScoreFactor: 0,
      timePressureFactor: 0,
    },
    playerProfiles: new Map(),
    momentum: {
      recentEvents: [],
      burstActive: false,
      burstMultiplier: 1,
    },
    lastChaosEvent: 0,
    lastDecay: Date.now(),
    eventCooldowns: new Map(),
    eventHistory: [],
    activeVoting: null,
    consecutiveWrongAnswers: 0,
    leaderPlayerId: null,
    scoreSpread: 0,
  };
  
  chaosStates.set(gameId, state);
  
  // Start decay loop
  startDecayLoop(gameId);
  
  return state;
}

export function getChaosV2(gameId: string): ChaosStateV2 | undefined {
  return chaosStates.get(gameId);
}

export function cleanupChaosV2(gameId: string): void {
  chaosStates.delete(gameId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAOS STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

export function calculateChaosState(chaosLevel: number): ChaosState {
  if (chaosLevel >= 80) return "ANARCHY";
  if (chaosLevel >= 60) return "INSANITY";
  if (chaosLevel >= 40) return "CHAOTIC";
  if (chaosLevel >= 20) return "UNSTABLE";
  return "CALM";
}

export function updateChaosLevel(gameId: string, newLevel: number): ChaosState {
  const state = getChaosV2(gameId);
  if (!state) return "CALM";
  
  // Clamp to 0-100
  state.chaosLevel = Math.max(0, Math.min(100, newLevel));
  
  // Update state
  const oldState = state.chaosState;
  state.chaosState = calculateChaosState(state.chaosLevel);
  
  // Log state transitions
  if (oldState !== state.chaosState) {
    console.log(`[CHAOS] State transition: ${oldState} → ${state.chaosState} (${state.chaosLevel}%)`);
  }
  
  return state.chaosState;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-SOURCE CHAOS CALCULATION
// ═══════════════════════════════════════════════════════════════════════════════

export function calculateMultiSourceChaos(gameId: string): number {
  const state = getChaosV2(gameId);
  if (!state) return 0;
  
  const chaos =
    state.factors.dramaEvents * CHAOS_FACTORS_WEIGHTS.dramaEvents +
    state.factors.wrongAnswersStreak * CHAOS_FACTORS_WEIGHTS.wrongAnswersStreak +
    state.factors.voteIntensity * CHAOS_FACTORS_WEIGHTS.voteIntensity +
    state.factors.closeScoreFactor * CHAOS_FACTORS_WEIGHTS.closeScoreFactor +
    state.factors.timePressureFactor * CHAOS_FACTORS_WEIGHTS.timePressureFactor;
  
  // Add momentum bonus
  if (state.momentum.burstActive) {
    return chaos + MOMENTUM_BURST_BONUS;
  }
  
  return Math.min(100, chaos);
}

export function recalculateChaos(gameId: string): void {
  const state = getChaosV2(gameId);
  if (!state) return;
  
  const newLevel = calculateMultiSourceChaos(gameId);
  updateChaosLevel(gameId, newLevel);
}

// Update individual factors
export function updateFactor(
  gameId: string,
  factor: keyof ChaosFactors,
  value: number
): void {
  const state = getChaosV2(gameId);
  if (!state) return;
  
  state.factors[factor] = Math.max(0, value);
  recalculateChaos(gameId);
}

export function incrementFactor(
  gameId: string,
  factor: keyof ChaosFactors,
  amount: number = 1
): void {
  const state = getChaosV2(gameId);
  if (!state) return;
  
  state.factors[factor] += amount;
  recalculateChaos(gameId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAOS MOMENTUM (Burst Detection)
// ═══════════════════════════════════════════════════════════════════════════════

// Trigger a specific chaos event manually (used for momentum burst)
function triggerEvent(gameId: string, event: ChaosEvent): void {
  const state = getChaosV2(gameId);
  if (!state) return;
  
  const now = Date.now();
  
  // Set cooldown
  const cooldown = EVENT_COOLDOWNS[event];
  state.eventCooldowns.set(event, now + cooldown);
  state.lastChaosEvent = now;
  
  // Record in history
  state.eventHistory.push({
    event,
    timestamp: now,
    chaosLevel: state.chaosLevel,
  });
  
  console.log(`[CHAOS] Event triggered: ${event} (manual/burst)`);
}

function updateMomentum(gameId: string): void {
  const state = getChaosV2(gameId);
  if (!state) return;
  
  const now = Date.now();
  const window = MOMENTUM_TIME_WINDOW;
  
  // Remove old events outside window
  state.momentum.recentEvents = state.momentum.recentEvents.filter(
    t => now - t < window
  );
  
  // Check for burst
  const eventCount = state.momentum.recentEvents.length;
  
  if (eventCount >= MOMENTUM_BURST_THRESHOLD && !state.momentum.burstActive) {
    // Chaos burst!
    state.momentum.burstActive = true;
    state.momentum.burstMultiplier = 1.5;
    console.log(`[CHAOS] 🔥 MOMENTUM BURST! ${eventCount} events in ${window/1000}s`);
    
    // Auto-trigger surge event
    triggerEvent(gameId, "CHAOS_SURGE");
  } else if (eventCount < MOMENTUM_BURST_THRESHOLD && state.momentum.burstActive) {
    // Burst ended
    state.momentum.burstActive = false;
    state.momentum.burstMultiplier = 1;
  }
}

export function recordEvent(gameId: string): void {
  const state = getChaosV2(gameId);
  if (!state) return;
  
  state.momentum.recentEvents.push(Date.now());
  updateMomentum(gameId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAOS DECAY SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

function startDecayLoop(gameId: string): void {
  const interval = setInterval(() => {
    const state = getChaosV2(gameId);
    if (!state) {
      clearInterval(interval);
      return;
    }
    
    const now = Date.now();
    
    // Only decay if enough time passed
    if (now - state.lastDecay >= CHAOS_DECAY_INTERVAL) {
      // Check if any chaos events happened recently
      const recentEvents = state.eventHistory.filter(
        e => now - e.timestamp < CHAOS_DECAY_INTERVAL
      );
      
      // Only decay if no recent chaos
      if (recentEvents.length === 0) {
        // Decay all factors
        state.factors.dramaEvents = Math.max(0, state.factors.dramaEvents - 1);
        state.factors.wrongAnswersStreak = Math.max(0, state.factors.wrongAnswersStreak - 1);
        state.factors.voteIntensity = Math.max(0, state.factors.voteIntensity - 0.5);
        state.factors.closeScoreFactor = Math.max(0, state.factors.closeScoreFactor - 0.5);
        state.factors.timePressureFactor = Math.max(0, state.factors.timePressureFactor - 1);
        
        recalculateChaos(gameId);
      }
      
      state.lastDecay = now;
    }
  }, 5000); // Check every 5 seconds
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANTI-FRUSTRATION BALANCER
// ═══════════════════════════════════════════════════════════════════════════════

export function getPlayerProfile(gameId: string, playerId: string): PlayerChaosProfile {
  const state = getChaosV2(gameId);
  if (!state) {
    return {
      playerId,
      chaosImpactScore: 0,
      timesTargeted: 0,
      lastDramaTime: 0,
      trustScore: 50,
    };
  }
  
  let profile = state.playerProfiles.get(playerId);
  if (!profile) {
    profile = {
      playerId,
      chaosImpactScore: 0,
      timesTargeted: 0,
      lastDramaTime: 0,
      trustScore: 50,
    };
    state.playerProfiles.set(playerId, profile);
  }
  
  return profile;
}

export function increasePlayerImpact(gameId: string, playerId: string, amount: number): void {
  const profile = getPlayerProfile(gameId, playerId);
  profile.chaosImpactScore += amount;
  
  // Reduce trust if impact too high
  if (profile.chaosImpactScore > 30) {
    profile.trustScore = Math.max(0, profile.trustScore - 5);
  }
}

export function recordPlayerTargeted(gameId: string, playerId: string): void {
  const profile = getPlayerProfile(gameId, playerId);
  profile.timesTargeted++;
}

export function getTargetingChance(gameId: string, playerId: string): number {
  const profile = getPlayerProfile(gameId, playerId);
  
  // Base chance
  let chance = 1.0;
  
  // Reduce chance if player has high impact (anti-frustration)
  if (profile.chaosImpactScore > 50) {
    chance *= 0.5;
  }
  
  // Reduce chance if targeted too many times
  if (profile.timesTargeted > 3) {
    chance *= 0.7;
  }
  
  // Reduce chance if low trust (protected)
  if (profile.trustScore < 20) {
    chance *= 0.6;
  }
  
  return chance;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT POOL SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

function isEventOnCooldown(gameId: string, event: ChaosEvent): boolean {
  const state = getChaosV2(gameId);
  if (!state) return true;
  
  const cooldownEnd = state.eventCooldowns.get(event);
  if (!cooldownEnd) return false;
  
  return Date.now() < cooldownEnd;
}

function setEventCooldown(gameId: string, event: ChaosEvent): void {
  const state = getChaosV2(gameId);
  if (!state) return;
  
  const cooldown = EVENT_COOLDOWNS[event];
  state.eventCooldowns.set(event, Date.now() + cooldown);
}

function getWeightedEvents(
  gameId: string,
  pool: ChaosEvent[]
): Array<{ event: ChaosEvent; weight: number }> {
  const state = getChaosV2(gameId);
  if (!state) return [];
  
  const personalityWeights = PERSONALITY_WEIGHTS[state.personality];
  
  return pool
    .filter(event => !isEventOnCooldown(gameId, event))
    .map(event => ({
      event,
      weight: personalityWeights?.[event] ?? 1.0,
    }));
}

export function rollChaosEvent(gameId: string): { event: ChaosEvent; message: string } {
  const state = getChaosV2(gameId);
  if (!state) return { event: "NONE", message: "" };
  
  // Check global cooldown (5 seconds between events)
  const now = Date.now();
  if (now - state.lastChaosEvent < 5000) {
    return { event: "NONE", message: "" };
  }
  
  // Get current state and pool
  const currentState = state.chaosState;
  const pool = EVENT_POOLS[currentState];
  
  // Get weighted available events
  const weightedEvents = getWeightedEvents(gameId, pool);
  
  if (weightedEvents.length === 0) {
    return { event: "NONE", message: "" };
  }
  
  // Calculate total weight
  const totalWeight = weightedEvents.reduce((sum, e) => sum + e.weight, 0);
  
  // Roll
  const roll = Math.random() * totalWeight;
  let cumulative = 0;
  
  for (const { event, weight } of weightedEvents) {
    cumulative += weight;
    if (roll <= cumulative) {
      // Set cooldown and record
      setEventCooldown(gameId, event);
      state.lastChaosEvent = now;
      recordEvent(gameId);
      
      // Add to history
      state.eventHistory.push({
        event,
        timestamp: now,
        chaosLevel: state.chaosLevel,
      });
      
      const message = getEventMessage(event);
      console.log(`[CHAOS] Event triggered: ${event} (${currentState})`);
      
      return { event, message };
    }
  }
  
  return { event: "NONE", message: "" };
}

function getEventMessage(event: ChaosEvent): string {
  const messages: Record<ChaosEvent, string> = {
    NONE: "",
    SMALL_TIMER_CHANGE: "⏱️ Timer shifted slightly...",
    SHUFFLE_ANSWERS: "🔀 Answers shuffled!",
    MINOR_PENALTY: "⚡ Minor penalty applied!",
    VOTE_FLIP: "🔄 Vote outcome FLIPPED!",
    TRAP_BOOST: "💣 Trap power increased!",
    SCORE_SWAP: "🔄 Scores swapped between players!",
    DOUBLE_PENALTY: "💀 Double punishment active!",
    FULL_INVERSION: "🙃 Everything inverted!",
    EVERYONE_LOSES: "💥 EVERYONE loses points!",
    TIMER_HALVED: "⏱️ Timer CUT IN HALF!",
    POINTS_TO_ZERO: "💀 Points reset to ZERO!",
    LEADER_PUNISHED: "👑 Leader punished!",
    RANDOM_TARGET: "🎯 Random target selected!",
    CHAOS_SURGE: "🔥 CHAOS SURGE! Momentum burst!",
  };
  
  return messages[event];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SMART PROBABILITY SCALING
// ═══════════════════════════════════════════════════════════════════════════════

export function calculateScaledProbability(
  baseChance: number,
  chaosLevel: number,
  multiplier: number = 0.003
): number {
  // chance = baseChance + (chaosLevel * multiplier)
  // At chaos 80 with base 0.1 and mult 0.003 → 0.1 + 0.24 = 0.34 (34%)
  return Math.min(1.0, baseChance + (chaosLevel * multiplier));
}

// Example: Vote flip probability
export function getVoteFlipChance(gameId: string): number {
  const state = getChaosV2(gameId);
  if (!state) return 0.1;
  
  return calculateScaledProbability(0.1, state.chaosLevel, 0.003);
}

// Example: Chaos event probability
export function getEventChance(gameId: string): number {
  const state = getChaosV2(gameId);
  if (!state) return 0.2;
  
  return calculateScaledProbability(0.2, state.chaosLevel, 0.005);
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISUAL FEEDBACK HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function getChaosVisuals(chaosState: ChaosState): {
  color: string;
  intensity: string;
  effects: string[];
  shake: boolean;
} {
  const visuals: Record<ChaosState, ReturnType<typeof getChaosVisuals>> = {
    CALM: { color: "#00e676", intensity: "low", effects: [], shake: false },
    UNSTABLE: { color: "#ffd700", intensity: "medium", effects: ["glow"], shake: false },
    CHAOTIC: { color: "#ffa502", intensity: "high", effects: ["glow", "pulse"], shake: false },
    INSANITY: { color: "#ff4757", intensity: "extreme", effects: ["glow", "pulse", "distort"], shake: true },
    ANARCHY: { color: "#ff00ff", intensity: "maximum", effects: ["glow", "pulse", "distort", "flash"], shake: true },
  };
  
  return visuals[chaosState];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOCKET EVENT EMITTERS
// ═══════════════════════════════════════════════════════════════════════════════

export function emitChaosStateUpdate(io: any, gameId: string): void {
  const state = getChaosV2(gameId);
  if (!state) return;
  
  const visuals = getChaosVisuals(state.chaosState);
  
  io.to(gameId).emit("chaos:stateUpdate", {
    chaosLevel: state.chaosLevel,
    chaosState: state.chaosState,
    personality: state.personality,
    factors: state.factors,
    momentum: {
      burstActive: state.momentum.burstActive,
      recentEventCount: state.momentum.recentEvents.length,
    },
    visuals,
  });
}

export function emitChaosEvent(io: any, gameId: string, event: ChaosEvent, message: string): void {
  const state = getChaosV2(gameId);
  if (!state) return;
  
  io.to(gameId).emit("chaos:event", {
    event,
    message,
    chaosLevel: state.chaosLevel,
    chaosState: state.chaosState,
    personality: state.personality,
  });
}

export function emitChaosBurst(io: any, gameId: string): void {
  const state = getChaosV2(gameId);
  if (!state || !state.momentum.burstActive) return;
  
  io.to(gameId).emit("chaos:burst", {
    message: "🔥 CHAOS MOMENTUM BURST! Events spiraling out of control!",
    chaosLevel: state.chaosLevel,
    eventCount: state.momentum.recentEvents.length,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// GETTERS & STATS
// ═══════════════════════════════════════════════════════════════════════════════

export function getChaosStatsV2(gameId: string): {
  chaosLevel: number;
  chaosState: ChaosState;
  personality: ChaosPersonality;
  factors: ChaosFactors;
  burstActive: boolean;
  canTarget: (playerId: string) => boolean;
} | null {
  const state = getChaosV2(gameId);
  if (!state) return null;
  
  return {
    chaosLevel: state.chaosLevel,
    chaosState: state.chaosState,
    personality: state.personality,
    factors: state.factors,
    burstActive: state.momentum.burstActive,
    canTarget: (playerId: string) => getTargetingChance(gameId, playerId) > 0.5,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DRAMA EVENT HANDLING
// ═══════════════════════════════════════════════════════════════════════════════

export function recordDramaV2(
  gameId: string,
  type: DramaType,
  playerId: string,
  username: string
): { dramaId: string; chaosIncreased: boolean } | null {
  const state = getChaosV2(gameId);
  if (!state) return null;
  
  // Update profile
  const profile = getPlayerProfile(gameId, playerId);
  const now = Date.now();
  
  // Anti-spam cooldown
  if (now - profile.lastDramaTime < 10000) {
    return null;
  }
  
  profile.lastDramaTime = now;
  profile.chaosImpactScore += 10;
  
  // Increment drama factor
  incrementFactor(gameId, "dramaEvents");
  
  // Record the event
  recordEvent(gameId);
  
  const dramaId = `drama_${now}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[CHAOS] Drama recorded: ${type} by ${username}`);
  
  return { dramaId, chaosIncreased: true };
}

// Export everything
export type { ChaosFactors, ChaosStateV2, PlayerChaosProfile, ChaosMomentum, VotingSession };

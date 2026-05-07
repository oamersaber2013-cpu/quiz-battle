"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  GameMode,
  GameStatus,
  Difficulty,
  PlayerState,
  ClientQuestion,
  FinalResult,
  ActivePowerUpEffect,
  SyncedGameRoom,
  PowerUpType,
} from "@quiz-battle/shared";
import { soundManager } from "@/lib/sounds";

export interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
}

export interface GameStore {
  // Auth
  userId: string | null;
  username: string;
  token: string | null;
  isGuest: boolean;
  role: string;
  credits: number;
  balanceQar: number;
  totalEarningsQar: number;
  isSubscribed: boolean;
  language: "en" | "ar";

  // Game
  gameId: string | null;
  joinCode: string | null;
  hostId: string | null;
  mode: GameMode | null;
  difficulty: Difficulty | null;
  category: string | null;
  status: GameStatus;
  players: PlayerState[];
  currentPlayer: PlayerState | null;

  // Question
  currentQuestion: ClientQuestion | null;
  currentRound: number;
  totalRounds: number;
  selectedAnswer: number | null;
  answeredAt: number | null;
  lastAnswerResult: { correct: boolean; correctIndex: number } | null;
  eliminatedOptions: number[];
  timeLeft: number;
  questionStartedAt: number | null;
  timeWarpBonusSeconds: number;

  // Results
  finalResults: FinalResult[];
  
  // Player state
  scores: Record<string, number>;
  powerUpInventory: PowerUpType[];

  // Conquest
  conquestState: import("@quiz-battle/shared").ConquestClientState | null;
  
  // Invasion mode state
  invasionState: {
    territories: Array<{
      id: number;
      name: string;
      nameAr: string;
      path: string;
      center: { x: number; y: number };
      ownerId: string | null;
      troopCount: number;
    }>;
    currentRound: number;
    totalRounds: number;
    phase: "question" | "ranking" | "selection" | "ended";
    lastRanking: Array<{
      playerId: string;
      rank: number;
      picks: number;
      responseTimeMs: number;
    }>;
    currentTurn: string | null;
    picksRemaining: number;
    selectableTerritories: number[];
  } | null;

  // CHAOS mode state
  chaosState: {
    level: number;
    state: "CALM" | "UNSTABLE" | "CHAOTIC" | "INSANITY" | "ANARCHY";
    personality: "TRICKSTER" | "AGGRESSIVE" | "RANDOM" | "REVENGE";
    isVoting: boolean;
    activeDrama: {
      id: string;
      type: string;
      playerId: string;
      username: string;
    } | null;
    votingSession: {
      dramaEventId: string;
      targetPlayerId: string;
      targetUsername: string;
      timeRemaining: number;
      totalVotes: number;
      hasVoted: boolean;
    } | null;
    activeTrap: {
      targetPlayerId: string;
      targetUsername: string;
      level: number;
      isTarget: boolean;
      advantages?: {
        timeBonus: number;
        eliminatedOptions: number;
      };
    } | null;
    evaluatingTrap: boolean;
    lastTrapResult: {
      outcome: string;
      title: string;
      emoji: string;
      color: string;
      message: string;
      heroUsername?: string;
    } | null;
    chaosLog: Array<{
      timestamp: number;
      event: string;
      message: string;
    }>;
  } | null;

  activeEffects: ActivePowerUpEffect[];

  allPowerUpSelections: Record<string, any[]>;
  chatMessages: any[];
  readyPlayers: string[];

  powerUpSelection: {
    isSelecting: boolean;
    availablePowerUps: import("@quiz-battle/shared").PowerUpType[];
    selectedPowerUps: import("@quiz-battle/shared").PowerUpType[];
    maxSelections: number;
    timeLeft: number;
    allSelections: Record<string, import("@quiz-battle/shared").PowerUpType[]>;
  };

  // UI
  toasts: Toast[];
  isConnected: boolean;
  soundEnabled: boolean;

  // Actions
  setAuth: (data: any) => void;
  setCredits: (credits: number) => void;
  setRole: (role: string, isSubscribed?: boolean) => void;
  setLanguage: (lang: "en" | "ar") => void;
  setGame: (data: any) => void;
  setStatus: (status: GameStatus) => void;
  setPlayers: (players: PlayerState[]) => void;
  addPlayer: (player: PlayerState) => void;
  removePlayer: (userId: string) => void;
  updatePlayer: (userId: string, updates: Partial<PlayerState>) => void;
  setQuestion: (question: ClientQuestion, round: number, totalRounds: number) => void;
  selectAnswer: (index: number) => void;
  setTimeLeft: (t: number) => void;
  applyTimeWarpBonus: (seconds: number) => void;
  setFinalResults: (results: FinalResult[]) => void;
  setConquestState: (state: any) => void;
  setInvasionState: (state: any) => void;
  setInvasionQuestion: (question: any) => void;
  toggleSound: () => void;
  selectPowerUp: (powerUp: any) => void;
  confirmPowerUpSelection: () => void;
  syncRoom: (room: SyncedGameRoom) => void;
  addToast: (type: Toast["type"], message: string) => void;
  removeToast: (id: string) => void;
  setConnected: (connected: boolean) => void;
  resetGame: () => void;
  logout: () => Promise<void>;
  setGameId: (gameId: string | null) => void;
  setPowerUpSelection: (data: any) => void;
  setAllPowerUpSelections: (selections: Record<string, any[]>) => void;
  setLastAnswerResult: (result: any) => void;
  addEffect: (effect: any) => void;
  removeEffect: (effectId: string) => void;
  setEliminatedOptions: (options: number[]) => void;
  addChatMessage: (msg: any) => void;
  setReadyPlayers: (players: string[]) => void;

  // CHAOS actions
  setChaosState: (state: any) => void;
  setChaosVoting: (voting: any) => void;
  updateChaosVoting: (update: any) => void;
  completeChaosVoting: (result: any) => void;
  setActiveDrama: (drama: any) => void;
  castChaosVote: (vote: string) => void;
  setActiveTrap: (trap: any) => void;
  setTrapEvaluating: (evaluating: any) => void;
  setTrapResult: (result: any) => void;
  setChaosAdvantages: (advantages: any) => void;
  addChaosLog: (event: string, message: string) => void;
  clearChaosState: () => void;
}

const initialGameState = {
  gameId: null,
  joinCode: null,
  hostId: null,
  invasionState: null,
  chaosState: null,
  mode: null,
  difficulty: null,
  category: null,
  status: GameStatus.Lobby,
  players: [],
  currentPlayer: null,
  currentQuestion: null,
  currentRound: 0,
  totalRounds: 0,
  selectedAnswer: null,
  answeredAt: null,
  lastAnswerResult: null,
  eliminatedOptions: [],
  timeLeft: 30,
  questionStartedAt: null,
  timeWarpBonusSeconds: 0,
  finalResults: [],
  scores: {},
  powerUpInventory: [],
  conquestState: null,
  activeEffects: [],
  allPowerUpSelections: {},
  chatMessages: [],
  readyPlayers: [],
  powerUpSelection: {
    isSelecting: false,
    availablePowerUps: [],
    selectedPowerUps: [],
    maxSelections: 3,
    timeLeft: 30,
    allSelections: {},
  },
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // Auth
      userId: null,
      username: "Warrior",
      token: null,
      isGuest: false,
      role: "GUEST",
      credits: 0,
      balanceQar: 0,
      totalEarningsQar: 0,
      isSubscribed: false,
      language: "en",

      ...initialGameState,

      // UI
      toasts: [],
      isConnected: false,
      soundEnabled: true,

      setAuth: (data) =>
        set({
          userId: data.userId,
          username: data.username,
          token: data.token,
          isGuest: data.isGuest,
          role: data.role || "GUEST",
          credits: data.credits || 0,
          balanceQar: data.balanceQar || 0,
          totalEarningsQar: data.totalEarningsQar || 0,
          isSubscribed: data.isSubscribed || data.role === "SUBSCRIBER",
        }),

      setCredits: (credits) => set({ credits }),

      setRole: (role, isSubscribed) =>
        set({ role, isSubscribed: isSubscribed ?? role === "SUBSCRIBER" }),

      setLanguage: (language) => set({ language }),

      setGame: (data) =>
        set((state) => ({
          ...state,
          gameId: data.gameId,
          joinCode: data.joinCode,
          hostId: data.hostId ?? null,
          mode: data.mode,
          difficulty: data.difficulty,
          category: data.category ?? null,
          language: data.language ?? state.language,
        })),

      setStatus: (status) => set({ status }),

      setPlayers: (players) =>
        set((state) => ({
          players,
          currentPlayer:
            players.find((p) => p.userId === state.userId) || null,
        })),

      addPlayer: (player) =>
        set((state) => {
          const exists = state.players.find((p) => p.userId === player.userId);
          if (exists) {
            return {
              players: state.players.map((p) =>
                p.userId === player.userId ? player : p
              ),
            };
          }
          return { players: [...state.players, player] };
        }),

      removePlayer: (userId) =>
        set((state) => ({
          players: state.players.filter((p) => p.userId !== userId),
        })),

      updatePlayer: (userId, updates) =>
        set((state) => ({
          players: state.players.map((p) =>
            p.userId === userId ? { ...p, ...updates } : p
          ),
        })),

      setQuestion: (question, round, totalRounds) => {
        set({
          currentQuestion: question,
          currentRound: round,
          totalRounds,
          selectedAnswer: null,
          answeredAt: null,
          lastAnswerResult: null,
          eliminatedOptions: [],
          timeLeft: question.timeLimit,
          questionStartedAt: Date.now(),
          status: GameStatus.Question,
          activeEffects: [],
        });

        if (get().soundEnabled) {
          soundManager.play("TICK");
        }
      },

      selectAnswer: (index) =>
        set((state) => {
          if (state.selectedAnswer !== null) return state;

          if (state.soundEnabled) {
            soundManager.play("CORRECT");
          }

          return {
            selectedAnswer: index,
            answeredAt: Date.now(),
          };
        }),

      setTimeLeft: (t) => set({ timeLeft: t }),

      applyTimeWarpBonus: (seconds) =>
        set((state) => ({
          timeLeft: Math.min(state.timeLeft + seconds, 60),
        })),

      setFinalResults: (results) =>
        set({ finalResults: results, status: GameStatus.Ended }),

  // Conquest / Invasion actions

      setConquestState: (state) => set({ conquestState: state }),
      setInvasionState: (state) => set({ invasionState: state }),
      setInvasionQuestion: (question) => set((state) => ({ 
        invasionState: state.invasionState ? {
          ...state.invasionState,
          currentQuestion: question
        } : null 
      })),

      toggleSound: () =>
        set((state) => ({ soundEnabled: !state.soundEnabled })),

      selectPowerUp: (powerUp) =>
        set((state) => {
          const current = state.powerUpSelection.selectedPowerUps;

          if (current.includes(powerUp)) {
            return {
              powerUpSelection: {
                ...state.powerUpSelection,
                selectedPowerUps: current.filter((p) => p !== powerUp),
              },
            };
          }

          if (current.length >= state.powerUpSelection.maxSelections) {
            get().addToast("info", "Max power-ups reached");
            return state;
          }

          return {
            powerUpSelection: {
              ...state.powerUpSelection,
              selectedPowerUps: [...new Set([...current, powerUp])],
            },
          };
        }),

      syncRoom: (room) =>
        set((state) => {
          const userId = state.userId;

          return {
            ...state,
            gameId: room.gameId,
            joinCode: room.joinCode,
            hostId: room.hostId || null,
            mode: room.mode,
            difficulty: room.difficulty,
            category: room.category || null,
            status: room.status,
            players: room.players,
            currentPlayer:
              room.players.find((p) => p.userId === userId) || null,
            activeEffects: (room.activeEffects || []).filter(
              (e) => !e.expiresAt || e.expiresAt > Date.now()
            ),
            language: room.language || state.language,
          };
        }),

      addToast: (type, message) => {
        const id = `toast_${Date.now()}`;
        set((state) => ({
          toasts: [...state.toasts, { id, type, message }],
        }));

        setTimeout(() => get().removeToast(id), 3000);
      },

      removeToast: (id) =>
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        })),

      setConnected: (connected) => set({ isConnected: connected }),

      // Missing implementations for socket handlers
      setGameId: (gameId) => set({ gameId }),
      setPowerUpSelection: (data) => set({ powerUpSelection: { ...get().powerUpSelection, ...data } }),
      setAllPowerUpSelections: (selections) => set({ allPowerUpSelections: selections }),
      setLastAnswerResult: (result) => set({ lastAnswerResult: result }),
      addEffect: (effect) => set((state) => ({ activeEffects: [...state.activeEffects, effect] })),
      removeEffect: (effectId) => set((state) => ({ activeEffects: state.activeEffects.filter((e: any) => e.id !== effectId) })),
      setEliminatedOptions: (options) => set({ eliminatedOptions: options }),
      addChatMessage: (msg) => set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
      setReadyPlayers: (players) => set({ readyPlayers: players }),
      confirmPowerUpSelection: () => set((state) => ({ powerUpSelection: { ...state.powerUpSelection, isSelecting: false } })),

      // CHAOS actions
      setChaosState: (chaosState) => set({ chaosState }),
      setChaosVoting: (voting) => set((state) => ({
        chaosState: state.chaosState ? { ...state.chaosState, votingSession: voting, isVoting: !!voting } : null,
      })),
      updateChaosVoting: (update) => set((state) => ({
        chaosState: state.chaosState ? {
          ...state.chaosState,
          votingSession: state.chaosState.votingSession
            ? { ...state.chaosState.votingSession, ...update }
            : null,
        } : null,
      })),
      completeChaosVoting: (result) => set((state) => ({
        chaosState: state.chaosState ? {
          ...state.chaosState,
          isVoting: false,
          votingSession: null,
          activeDrama: null,
        } : null,
      })),
      setActiveDrama: (drama) => set((state) => ({
        chaosState: state.chaosState ? { ...state.chaosState, activeDrama: drama } : null,
      })),
      castChaosVote: (vote) => set((state) => ({
        chaosState: state.chaosState ? {
          ...state.chaosState,
          votingSession: state.chaosState.votingSession
            ? { ...state.chaosState.votingSession, hasVoted: true }
            : null,
        } : null,
      })),
      setActiveTrap: (trap) => set((state) => ({
        chaosState: state.chaosState ? { ...state.chaosState, activeTrap: trap } : null,
      })),
      setTrapEvaluating: (evaluating) => set((state) => ({
        chaosState: state.chaosState ? { ...state.chaosState, evaluatingTrap: true } : null,
      })),
      setTrapResult: (result) => set((state) => ({
        chaosState: state.chaosState ? { ...state.chaosState, lastTrapResult: result, activeTrap: null, evaluatingTrap: false } : null,
      })),
      setChaosAdvantages: (advantages) => set((state) => ({
        chaosState: state.chaosState ? {
          ...state.chaosState,
          activeTrap: state.chaosState.activeTrap
            ? { ...state.chaosState.activeTrap, advantages }
            : null,
        } : null,
      })),
      addChaosLog: (event, message) => set((state) => ({
        chaosState: state.chaosState
          ? {
              ...state.chaosState,
              chaosLog: [...state.chaosState.chaosLog.slice(-9), { timestamp: Date.now(), event, message }],
            }
          : null,
      })),
      clearChaosState: () => set({ chaosState: null }),

      resetGame: () =>
        set({
          ...initialGameState,
          toasts: [],
          isConnected: false,
        }),

      logout: async () => {
        const { isConnected } = get();

        if (isConnected) {
          const { disconnectSocket } = await import("@/lib/socket");
          disconnectSocket();
        }

        set({
          userId: null,
          username: "Warrior",
          token: null,
          isGuest: false,
          role: "GUEST",
          credits: 0,
          balanceQar: 0,
          totalEarningsQar: 0,
          isSubscribed: false,
          ...initialGameState,
        });
      },
    }),
    {
      name: "quiz-battle-storage",
      partialize: (state) => ({
        userId: state.userId,
        username: state.username,
        token: state.token,
        isGuest: state.isGuest,
        role: state.role,
        credits: state.credits,
        balanceQar: state.balanceQar,
        totalEarningsQar: state.totalEarningsQar,
        isSubscribed: state.isSubscribed,
        language: state.language,
      }),
    }
  )
);

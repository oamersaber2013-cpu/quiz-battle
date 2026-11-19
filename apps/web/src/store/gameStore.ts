"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  GameMode,
  GameStatus,
  Difficulty,
  PlayerState,
  SafeClientQuestion,
  ClientQuestion,
  FinalResult,
  ActivePowerUpEffect,
  SyncedGameRoom,
  PowerUpType,
  SubmittedAnswer,
  AnswerReveal,
  ChaosClientSnapshot,
  CustomGameSettings,
} from "@quiz-battle/shared";
import { soundManager } from "@/lib/sounds";
import { getServerTime, synchronizeServerClock } from "@/lib/gameClock";

export interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
}

export type LastAnswerResult = AnswerReveal;

type ChaosTrapResult = {
  outcome: string;
  title: string;
  emoji: string;
  color: string;
  message: string;
  heroUsername?: string;
};

type ChaosStoreState = ChaosClientSnapshot & {
  voteDeadline: number | null;
  lastTrapResult: ChaosTrapResult | null;
  chaosLog: Array<{ timestamp: number; event: string; message: string }>;
};

function mergeChaosSnapshot(
  previous: ChaosStoreState | null,
  snapshot: ChaosClientSnapshot | null
): ChaosStoreState | null {
  if (!snapshot) return null;
  synchronizeServerClock(snapshot.serverNow);
  const existing = previous?.gameId === snapshot.gameId ? previous : null;
  return {
    ...snapshot,
    voteDeadline: snapshot.votingSession
      ? getServerTime() + snapshot.votingSession.timeRemainingMs
      : null,
    lastTrapResult: snapshot.activeTrap ? null : existing?.lastTrapResult ?? null,
    chaosLog: existing?.chaosLog ?? [],
  };
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
  customSettings: CustomGameSettings | null;
  status: GameStatus;
  players: PlayerState[];
  currentPlayer: PlayerState | null;

  // Question
  currentQuestion: ClientQuestion | null;
  currentRound: number;
  totalRounds: number;
  selectedAnswer: SubmittedAnswer | null;
  answeredAt: number | null;
  lastAnswerResult: LastAnswerResult | null;
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

  chaosState: ChaosStoreState | null;

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
  setQuestion: (question: SafeClientQuestion, round: number, totalRounds: number, startedAt?: number) => void;
  selectAnswer: (answer: SubmittedAnswer) => void;
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
  setLastAnswerResult: (result: LastAnswerResult | null) => void;
  addEffect: (effect: any) => void;
  removeEffect: (effectId: string) => void;
  setEliminatedOptions: (options: number[]) => void;
  addChatMessage: (msg: any) => void;
  setReadyPlayers: (players: string[]) => void;

  // CHAOS actions
  syncChaos: (snapshot: ChaosClientSnapshot) => void;
  setTrapResult: (result: ChaosTrapResult | null) => void;
  addChaosLog: (event: string, message: string) => void;
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
  customSettings: null,
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

let nextToastId = 0;

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
          customSettings: data.customSettings ?? null,
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
          currentPlayer: state.currentPlayer?.userId === userId
            ? { ...state.currentPlayer, ...updates }
            : state.currentPlayer,
        })),

      setQuestion: (question, round, totalRounds, startedAt = getServerTime()) => {
        set({
          currentQuestion: question,
          currentRound: round,
          totalRounds,
          selectedAnswer: null,
          answeredAt: null,
          lastAnswerResult: null,
          eliminatedOptions: [],
          timeLeft: Math.max(0, Math.ceil(question.timeLimit - (getServerTime() - startedAt) / 1000)),
          questionStartedAt: startedAt,
          timeWarpBonusSeconds: 0,
          status: GameStatus.Question,
          activeEffects: [],
        });

        if (get().soundEnabled) {
          soundManager.play("TICK");
        }
      },

      selectAnswer: (answer) =>
        set((state) => {
          if (state.selectedAnswer !== null) return state;

          if (state.soundEnabled) {
            soundManager.play("CLICK");
          }

          return {
            selectedAnswer: Array.isArray(answer) ? [...answer] : answer,
            answeredAt: getServerTime(),
          };
        }),

      setTimeLeft: (t) => set({ timeLeft: t }),

      applyTimeWarpBonus: (seconds) =>
        set((state) => ({
          timeWarpBonusSeconds: Math.max(state.timeWarpBonusSeconds, seconds),
          timeLeft: state.currentQuestion && state.questionStartedAt
            ? Math.max(0, Math.ceil(
                state.currentQuestion.timeLimit + Math.max(state.timeWarpBonusSeconds, seconds)
                - (getServerTime() - state.questionStartedAt) / 1000
              ))
            : Math.min(state.timeLeft + seconds, 60),
        })),

      setFinalResults: (results) =>
        set({ finalResults: results, status: GameStatus.Ended }),

  // Conquest / Invasion actions

      setConquestState: (nextState) => set((state) => {
        synchronizeServerClock(nextState?.serverNow);
        const previousDraft = state.conquestState?.draftPhase;
        const nextDraft = nextState?.draftPhase;
        const sameQuestion = previousDraft && nextDraft
          && previousDraft.currentRound === nextDraft.currentRound
          && previousDraft.question?.id === nextDraft.question?.id;
        if (!nextState || !sameQuestion) return { conquestState: nextState };
        return {
          conquestState: {
            ...nextState,
            draftPhase: {
              ...nextDraft,
              selectedAnswer: nextDraft.selectedAnswer === undefined ? previousDraft.selectedAnswer : nextDraft.selectedAnswer,
              answeredAt: nextDraft.answeredAt === undefined ? previousDraft.answeredAt : nextDraft.answeredAt,
            },
          },
        };
      }),
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
          synchronizeServerClock(room.serverNow);
          const userId = state.userId;
          const previous = state.gameId === room.gameId ? state : initialGameState;
          const effects = (room.activeEffects || []).filter(
            (effect) => !effect.expiresAt || effect.expiresAt > getServerTime()
          );
          const question = room.currentQuestion === undefined
            ? previous.currentQuestion
            : room.currentQuestion;
          const questionStartedAt = room.questionStartedAt ?? previous.questionStartedAt;
          const isNewQuestion = room.currentQuestion !== undefined && room.currentQuestion?.id !== previous.currentQuestion?.id;
          const ownTimeWarp = effects.find(
            (effect) => effect.type === PowerUpType.TimeWarp && effect.sourceUserId === userId
          );
          const timeWarpBonusSeconds = question && questionStartedAt && ownTimeWarp?.expiresAt
            ? Math.max(0, (ownTimeWarp.expiresAt - questionStartedAt) / 1000 - question.timeLimit)
            : room.currentQuestion === undefined ? previous.timeWarpBonusSeconds : 0;

          return {
            ...previous,
            gameId: room.gameId,
            joinCode: room.joinCode,
            hostId: room.hostId || null,
            mode: room.mode,
            customSettings: room.customSettings ?? null,
            difficulty: room.difficulty,
            category: room.category || null,
            status: room.status,
            currentRound: room.currentRound,
            totalRounds: room.totalRounds,
            currentQuestion: question,
            questionStartedAt,
            timeWarpBonusSeconds,
            timeLeft: question && questionStartedAt
              ? Math.max(0, Math.ceil(question.timeLimit + timeWarpBonusSeconds - (getServerTime() - questionStartedAt) / 1000))
              : previous.timeLeft,
            eliminatedOptions: room.eliminatedOptions ?? (isNewQuestion ? [] : previous.eliminatedOptions),
            selectedAnswer: room.selectedAnswer === undefined ? (isNewQuestion ? null : previous.selectedAnswer) : room.selectedAnswer,
            answeredAt: room.answeredAt === undefined ? (isNewQuestion ? null : previous.answeredAt) : room.answeredAt,
            lastAnswerResult: room.lastAnswerResult === undefined ? (isNewQuestion ? null : previous.lastAnswerResult) : room.lastAnswerResult,
            finalResults: room.finalResults ?? previous.finalResults,
            chaosState: room.chaos === undefined
              ? previous.chaosState
              : mergeChaosSnapshot(previous.chaosState, room.chaos),
            powerUpSelection: room.powerUpSelection
              ? { ...previous.powerUpSelection, ...room.powerUpSelection }
              : previous.powerUpSelection,
            players: room.players,
            currentPlayer:
              room.players.find((p) => p.userId === userId) || null,
            activeEffects: effects,
            language: room.language || state.language,
          };
        }),

      addToast: (type, message) => {
        if (get().toasts.some(item => item.type === type && item.message === message)) return;
        const id = `toast_${++nextToastId}`;
        set(state => ({
          toasts: [...state.toasts.slice(-1), { id, type, message }],
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
      setLastAnswerResult: (result) => {
        const state = get();
        if (result && !state.lastAnswerResult && state.selectedAnswer !== null && state.soundEnabled) {
          soundManager.play(result.correct ? "CORRECT" : "WRONG");
        }
        set({ lastAnswerResult: result });
      },
      addEffect: (effect) => set((state) => ({ activeEffects: [...state.activeEffects, effect] })),
      removeEffect: (effectId) => set((state) => ({ activeEffects: state.activeEffects.filter((e: any) => e.id !== effectId) })),
      setEliminatedOptions: (options) => set({ eliminatedOptions: options }),
      addChatMessage: (msg) => set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
      setReadyPlayers: (players) => set({ readyPlayers: players }),
      confirmPowerUpSelection: () => set((state) => ({ powerUpSelection: { ...state.powerUpSelection, isSelecting: false } })),

      syncChaos: (snapshot) => set((state) => state.gameId === snapshot.gameId && state.mode === GameMode.Chaos
        ? { chaosState: mergeChaosSnapshot(state.chaosState, snapshot) }
        : state),
      setTrapResult: (result) => set((state) => ({
        chaosState: state.chaosState ? { ...state.chaosState, lastTrapResult: result } : null,
      })),
      addChaosLog: (event, message) => set((state) => ({
        chaosState: state.chaosState
          ? {
              ...state.chaosState,
              chaosLog: [...state.chaosState.chaosLog.slice(-9), { timestamp: Date.now(), event, message }],
            }
          : null,
      })),

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

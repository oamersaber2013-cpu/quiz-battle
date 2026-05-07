import { Server } from "socket.io";
import type { SafeRedis } from "../lib/redis";
import {
  Difficulty,
  ServerToClientEvents,
  ClientToServerEvents,
  GameStatus,
  GAME_MODE_CONFIG,
} from "@quiz-battle/shared";
import { getRoomState } from "../lib/redis";
import {
  getActiveGame,
  startGame,
  handlePlayerAnswer,
  handlePowerUp,
  startPowerUpSelectionPhase,
  handlePowerUpSelection,
  confirmPowerUpSelection,
} from "../lib/gameOrchestrator";
import {
  initConquestGame,
  handleAttack,
  handleDuelAnswer,
  handleRebuild,
  handleRebuildAnswer,
  getConquestState,
  safeConquestState,
  recordDraftAnswer,
  selectDraftTerritory,
} from "../lib/conquestOrchestrator";
import {
  createInvasionGame,
  startInvasionRound,
  recordAnswer,
  selectTerritory,
  getInvasionState,
  deleteInvasionGame,
  INVASION_TERRITORIES,
} from "../lib/invasionOrchestrator";
import { GameMode } from "@quiz-battle/shared";
import { fillWithBots, getBotInfo } from "../lib/aiBots";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

export function registerSocketHandlers(io: TypedServer, redis: SafeRedis) {
  // Matchmaking loop removed - Focusing on Host-Based Rooms

  // JWT auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        // Allow guest access with just a guestId
        const guestId = socket.handshake.auth?.guestId;
        if (guestId) {
          socket.data.userId = guestId;
          socket.data.username = socket.handshake.auth?.username || "Guest";
          socket.data.isGuest = true;
          return next();
        }
        return next(new Error("Authentication required"));
      }

      // In production: verify JWT here
      // const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // For now, accept token as userId (demo mode)
      socket.data.userId = socket.handshake.auth?.userId || token;
      socket.data.username = socket.handshake.auth?.username || "Player";
      socket.data.isGuest = false;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    const username = socket.data.username as string;

    console.log(`🔌 Connected: ${username} (${userId})`);

    // ─── Join Game ─────────────────────────────────────────
    socket.on("game:join", async ({ gameId }, cb) => {
      try {
        if (!gameId) {
          cb?.({ success: false, error: "Game ID is required" });
          return;
        }

        const game = getActiveGame(gameId);
        if (!game) {
          // Try Redis for reconnection
          const stored = await getRoomState(redis, gameId);
          if (!stored) {
            cb?.({ success: false, error: "Game not found" });
            return;
          }
        }

        const activeGame = getActiveGame(gameId);
        if (!activeGame) {
          cb?.({ success: false, error: "Game not found" });
          return;
        }

        if (activeGame.status !== GameStatus.Lobby && !activeGame.players[userId]) {
          cb?.({ success: false, error: "Game already in progress" });
          return;
        }

        const config = GAME_MODE_CONFIG[activeGame.mode];
        if (Object.keys(activeGame.players).length >= config.maxPlayers && !activeGame.players[userId]) {
          cb?.({ success: false, error: "Game is full" });
          return;
        }

        // Add or reconnect player
        if (!activeGame.players[userId]) {
          activeGame.players[userId] = {
            userId,
            username,
            score: 0,
            rank: 0,
            streak: 0,
            isEliminated: false,
            isConnected: true,
            powerUpInventory: [],
          };
        } else {
          activeGame.players[userId].isConnected = true;
        }

        await socket.join(gameId);

        // Sync state to new player
        const { questions: _q, ...safeState } = activeGame;
        socket.emit("game:stateSync", {
          room: {
            ...safeState,
            category: activeGame.categories?.join(", "),
            players: Object.values(safeState.players),
          } as any,
        });

        // Sync Conquest state if in Conquest mode
        if (activeGame.mode === GameMode.Conquest) {
          const cState = getConquestState(gameId);
          if (cState) {
            socket.emit("conquest:state", safeConquestState(cState));
          }
        }

        // Notify others
        socket.to(gameId).emit("game:playerJoined", {
          player: activeGame.players[userId],
        });

        cb?.({
          success: true,
          room: {
            gameId: activeGame.gameId,
            joinCode: activeGame.joinCode,
            hostId: activeGame.hostId,
            mode: activeGame.mode,
            difficulty: activeGame.difficulty,
            status: activeGame.status,
            maxPlayers: activeGame.maxPlayers,
            totalRounds: activeGame.totalRounds || 10,
            category: activeGame.categories?.join(", "),
            language: activeGame.language,
          },
          players: Object.values(activeGame.players),
        });
      } catch (err) {
        console.error("join error:", err);
        cb?.({ success: false, error: "Internal error" });
      }
    });

    // ─── Start Game ─────────────────────────────────────────
    socket.on("game:start", async ({ gameId }, cb) => {
      const game = getActiveGame(gameId);
      if (!game) { cb?.({ success: false, error: "Game not found" }); return; }
      if (game.hostId !== userId) { cb?.({ success: false, error: "Only the host can start" }); return; }
      if (game.status !== GameStatus.Lobby) { cb?.({ success: false, error: "Game already started" }); return; }

      // Auto-fill with bots if not enough players
      const playerCount = Object.keys(game.players).length;
      const minPlayers = game.mode === GameMode.Conquest ? 2 : 2;
      if (playerCount < minPlayers) {
        console.log(`[game:start] Only ${playerCount} players, filling with bots to reach ${minPlayers}`);
        const botIds = await fillWithBots(io as TypedServer, gameId, playerCount, minPlayers, "medium");
        
        // Add bots to the game state
        for (const botId of botIds) {
          const botInfo = getBotInfo(botId);
          if (botInfo) {
            game.players[botId] = {
              userId: botId,
              username: botInfo.name,
              score: 0,
              rank: 0,
              streak: 0,
              isEliminated: false,
              isConnected: true,
              powerUpInventory: [],
              isBot: true,
            };
          }
        }

        // Notify all players about the bots
        io.to(gameId).emit("game:stateSync", {
          room: {
            gameId: game.gameId,
            joinCode: game.joinCode,
            hostId: game.hostId,
            mode: game.mode,
            difficulty: game.difficulty,
            status: game.status,
            maxPlayers: game.maxPlayers,
            totalRounds: game.totalRounds,
            currentRound: game.currentRound,
            language: game.language,
            players: Object.values(game.players),
          } as any,
        });
      }

      cb?.({ success: true });

      // Check if this game mode uses powerups
      const config = GAME_MODE_CONFIG[game.mode];
      console.log(`[game:start] gameId=${gameId}, mode=${game.mode}, players=${Object.keys(game.players).length}`);
      
      if (config?.hasPowerUps) {
        console.log(`[game:start] Starting powerup phase for ${gameId}`);
        startPowerUpSelectionPhase(io as TypedServer, redis, gameId);
      } else {
        console.log(`[game:start] Skipping powerups, starting game ${gameId}`);
        startGame(io as TypedServer, redis, gameId).catch(console.error);
      }
    });

    // ─── PowerUp Selection ────────────────────────────────────
    socket.on("game:selectPowerUp", ({ gameId, powerUp }, cb) => {
      const result = handlePowerUpSelection(gameId, userId, powerUp);
      cb?.(result);
    });

    socket.on("game:confirmPowerUpSelection", ({ gameId }, cb) => {
      const result = confirmPowerUpSelection(io as TypedServer, redis, gameId, userId);
      cb?.(result);
    });

    // ─── Player Answer ───────────────────────────────────────
    socket.on("player:answer", async ({ gameId, questionId, answerIndex, timestamp }) => {
      const game = getActiveGame(gameId);
      if (!game || game.status !== GameStatus.Question) return;

      await handlePlayerAnswer(
        game,
        io as TypedServer,
        redis,
        userId,
        questionId,
        answerIndex,
        timestamp
      );
    });

    // ─── Emote ───────────────────────────────────────────────
    socket.on("game:emote", ({ gameId, emote }) => {
      io.to(gameId).emit("game:emote", { userId, emote });
    });

    // ─── Chat Message ─────────────────────────────────────────
    socket.on("game:message", ({ gameId, message }) => {
      const game = getActiveGame(gameId);
      if (!game) return;

      const text = String(message ?? "").trim();
      if (!text) return;

      const safeText = text.slice(0, 280);
      const senderName = game.players[userId]?.username || username;
      const timestamp = Date.now();

      io.to(gameId).emit("game:message", {
        userId,
        username: senderName,
        message: safeText,
        timestamp,
      });

      io.to(gameId).emit("game:chat", {
        id: `chat_${timestamp}_${Math.random().toString(36).slice(2, 8)}`,
        userId,
        username: senderName,
        message: safeText,
        timestamp,
      });
    });

    // ─── Power-Up ────────────────────────────────────────────
    socket.on("player:powerup", async ({ gameId, type, targetUserId }, cb) => {
      const game = getActiveGame(gameId);
      if (!game) { cb?.({ success: false, error: "Game not found" }); return; }

      const result = await handlePowerUp(game, io as TypedServer, redis, userId, type, targetUserId);
      cb?.(result);
    });


    // ─── Spectate ────────────────────────────────────────────
    socket.on("game:spectate", async ({ gameId }) => {
      const game = getActiveGame(gameId);
      if (!game) {
        socket.emit("game:error", { message: "Game not found" });
        return;
      }

      await socket.join(gameId);
      await socket.join(`${gameId}_spectators`);

      // Count spectators
      const spectatorRoom = io.sockets.adapter.rooms.get(`${gameId}_spectators`);
      const spectatorCount = spectatorRoom?.size || 1;

      // Notify room
      io.to(gameId).emit("game:spectatorJoined", { spectatorId: userId, spectatorCount });

      // Send current game state (exclude sensitive round/question state)
      const { questions: _q, answersThisRound: _a, lastAnswerByPlayer: _l, ...safeRoom } = game;
      socket.emit("game:stateSync", {
        room: {
          ...safeRoom,
          category: game.categories?.join(", "),
          players: Object.values(safeRoom.players),
        } as any,
      });

      if (game.mode === GameMode.Conquest) {
        const cState = getConquestState(gameId);
        if (cState) {
          socket.emit("conquest:state", safeConquestState(cState));
        }
      }
    });

    // ─── Leave Game ──────────────────────────────────────────
    socket.on("game:leave", async ({ gameId }) => {
      const game = getActiveGame(gameId);
      if (game?.players[userId]) {
        game.players[userId].isConnected = false;
      }
      socket.leave(gameId);
      socket.to(gameId).emit("game:playerLeft", { userId });
    });

    // ─── Conquest Handlers ────────────────────────────────────────
    socket.on("conquest:attack", async ({ gameId, targetTerritoryId, categoryId }, cb) => {
      const result = await handleAttack(io as TypedServer, gameId, userId, targetTerritoryId, categoryId);
      cb?.(result);
    });

    socket.on("conquest:duelAnswer", ({ gameId, answerIndex }) => {
      handleDuelAnswer(io as TypedServer, gameId, userId, answerIndex);
    });

    socket.on("conquest:rebuild", async ({ gameId }, cb) => {
      const result = await handleRebuild(io as TypedServer, gameId, userId);
      cb?.(result);
    });

    socket.on("conquest:rebuildAnswer", ({ gameId, answerIndex }) => {
      handleRebuildAnswer(io as TypedServer, gameId, userId, answerIndex);
    });

    // ─── Draft Phase (Splitting the World) ───────────────────────
    socket.on("conquest:draftAnswer", ({ gameId, answerIndex, responseTimeMs }) => {
      const result = recordDraftAnswer(gameId, userId, answerIndex, responseTimeMs);
      if (!result.success) {
        socket.emit("game:error", { message: result.error || "Unable to record draft answer" });
      }
    });

    socket.on("conquest:selectDraftTerritory", ({ gameId, territoryId }, cb) => {
      const result = selectDraftTerritory(io as TypedServer, gameId, userId, String(territoryId));
      cb?.(result);
    });

    // ─── Invasion Mode ──────────────────────────────────────────
    
    // Initialize invasion game
    socket.on("invasion:init", async ({ gameId, playerIds }) => {
      console.log(`[Invasion] Initializing game ${gameId} with players:`, playerIds);
      createInvasionGame(gameId, playerIds);
      
      // Send initial state to all players
      const state = getInvasionState(gameId);
      if (state) {
        io.to(gameId).emit("invasion:state", {
          territories: state.territories.map(t => ({
            id: t.id.toString(),
            ownerId: t.ownerId,
            troopCount: t.troopCount,
          })),
          currentRound: state.currentRound,
          totalRounds: state.totalRounds,
          phase: state.phase,
          currentQuestion: state.currentQuestion ? {
            id: state.currentQuestion.id,
            text: state.currentQuestion.text,
            options: state.currentQuestion.options,
            timeLimit: 15,
          } : null,
          lastRanking: state.lastRanking,
          selectionPhase: {
            isActive: state.selectionPhase.isActive,
            pickingPlayerId: state.selectionPhase.pickingPlayerId,
            picksRemaining: state.selectionPhase.picksRemaining,
            turnIndex: state.selectionPhase.turnIndex,
          },
        });
      }
    });
    
    // Start invasion round (host only)
    socket.on("invasion:startRound", async ({ gameId }) => {
      console.log(`[Invasion] Starting round for game ${gameId}`);
      await startInvasionRound(gameId, io, redis);
    });
    
    // Record answer from player
    socket.on("invasion:answer", async ({ gameId, answer, responseTimeMs }) => {
      recordAnswer(gameId, userId, answer);
      console.log(`[Invasion] Player ${userId} answered in ${responseTimeMs}ms`);
    });
    
    // Select territory
    socket.on("invasion:selectTerritory", async ({ gameId, territoryId }) => {
      const parsedTerritoryId =
        typeof territoryId === "number" ? territoryId : Number.parseInt(territoryId, 10);
      const success = selectTerritory(gameId, userId, parsedTerritoryId, io, redis);
      if (success) {
        console.log(`[Invasion] Player ${userId} selected territory ${territoryId}`);
      }
    });
    
    // Get current invasion state
    socket.on("invasion:getState", async ({ gameId }) => {
      const state = getInvasionState(gameId);
      if (state) {
        socket.emit("invasion:state", {
          territories: state.territories.map(t => ({
            id: t.id.toString(),
            ownerId: t.ownerId,
            troopCount: t.troopCount,
          })),
          currentRound: state.currentRound,
          totalRounds: state.totalRounds,
          phase: state.phase,
          currentQuestion: state.currentQuestion ? {
            id: state.currentQuestion.id,
            text: state.currentQuestion.text,
            options: state.currentQuestion.options,
            timeLimit: 15,
          } : null,
          lastRanking: state.lastRanking,
          selectionPhase: {
            isActive: state.selectionPhase.isActive,
            pickingPlayerId: state.selectionPhase.pickingPlayerId,
            picksRemaining: state.selectionPhase.picksRemaining,
            turnIndex: state.selectionPhase.turnIndex,
          },
        });
      }
    });

    // ─── CHAOS MODE ─────────────────────────────────────────────
    
    // Initialize CHAOS game
    socket.on("chaos:init", async ({ gameId, personality }) => {
      const { initializeChaosV2 } = await import("../lib/chaosEngineV2");
      const state = initializeChaosV2(gameId, (personality as import("../lib/chaosEngineV2").ChaosPersonality) || "RANDOM");
      
      io.to(gameId).emit("chaos:init", {
        chaosLevel: state.chaosLevel,
        chaosState: state.chaosState,
        personality: state.personality,
        message: "🌀 CHAOS MODE ACTIVATED! Expect the unexpected...",
      });
      
      console.log(`[CHAOS] Initialized game ${gameId} with ${state.personality} personality`);
    });
    
    // Record drama event (tab visibility, inactivity)
    socket.on("chaos:drama", async ({ gameId, type }) => {
      const { recordDramaV2 } = await import("../lib/chaosEngineV2");
      const drama = recordDramaV2(gameId, type as import("../lib/chaosEngineV2").DramaType, userId, username);
      
      if (drama) {
        io.to(gameId).emit("chaos:drama", {
          id: drama.dramaId,
          type,
          playerId: userId,
          username,
        });
      }
    });
    
    // Start voting session
    socket.on("chaos:startVoting", async ({ gameId, dramaEventId, targetPlayerId, targetUsername }) => {
      const { getChaosV2 } = await import("../lib/chaosEngineV2");
      const state = getChaosV2(gameId);
      if (!state) return;
      
      // Get all player IDs except target
      const voterIds = Object.keys(state.playerProfiles || {}).filter(id => id !== targetPlayerId);
      
      const { handleStartVoting } = await import("../lib/chaosOrchestrator");
      const voting = handleStartVoting(gameId, dramaEventId, targetPlayerId, targetUsername, voterIds, io);
      
      if (voting) {
        io.to(gameId).emit("chaos:votingStart", {
          dramaEventId,
          targetPlayerId,
          targetUsername,
          duration: voting.duration,
          options: ["FORGIVE", "REDUCE_SCORE", "BLOCK_QUESTION"],
        });
      }
    });
    
    // Cast vote
    socket.on("chaos:vote", async ({ gameId, vote }) => {
      const { handleCastVote } = await import("../lib/chaosOrchestrator");
      const success = handleCastVote(gameId, userId, vote as import("../lib/chaosEngineV2").VoteOption, io);
      
      if (success) {
        socket.emit("chaos:voteConfirmed", { vote });
      }
    });
    
    // Activate trap round
    socket.on("chaos:activateTrap", async ({ gameId, targetPlayerId }) => {
      const { initializeTrap } = await import("../lib/trapSystem");
      const totalPlayers = Object.keys(getActiveGame(gameId)?.players || {}).length;
      
      const trap = initializeTrap(gameId, targetPlayerId, username, -1, totalPlayers);
      
      io.to(gameId).emit("chaos:trapActivated", {
        targetPlayerId,
        targetUsername: trap.targetUsername,
        trapLevel: trap.trapLevel,
        message: "🚨 TRAP ROUND ACTIVATED!",
      });
    });
    
    // Record player answer with mode (SAFE/RISK)
    socket.on("chaos:answer", async ({ gameId, questionId, answerIndex, mode }) => {
      // Store answer mode for trap calculation - actual scoring handled by regular answer flow
      console.log(`[CHAOS] Player ${username} answered with mode: ${mode}`);
    });
    
    // Evaluate trap outcome
    socket.on("chaos:evaluateTrap", async ({ gameId }) => {
      const { evaluateTrap } = await import("../lib/trapSystem");
      const outcome = await evaluateTrap(gameId, io);
      
      console.log(`[CHAOS] Trap evaluated for ${gameId}: ${outcome}`);
    });
    
    // Get chaos state
    socket.on("chaos:getState", async ({ gameId }) => {
      const { getChaosStatsV2 } = await import("../lib/chaosEngineV2");
      const stats = getChaosStatsV2(gameId);
      
      if (stats) {
        socket.emit("chaos:state", {
          chaosLevel: stats.chaosLevel,
          chaosState: stats.chaosState,
          personality: stats.personality,
          factors: stats.factors,
          momentum: { burstActive: stats.burstActive },
        });
      }
    });
    
    // Get target advantages (hint, time bonus)
    socket.on("chaos:getAdvantages", async ({ gameId }) => {
      const { getTargetAdvantages } = await import("../lib/trapSystem");
      const advantages = getTargetAdvantages(gameId, userId);
      
      socket.emit("chaos:advantages", advantages);
    });

    // ─── Disconnect ──────────────────────────────────────────────
    socket.on("disconnect", async () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      console.log(`🔌 Disconnected: ${username} (${userId})`);
      // Mark player as disconnected in any active game
      // Actual cleanup handled by game orchestrator TTL
    });
  });
}

import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../lib/jwtConfig";
import type { SafeRedis } from "../lib/redis";
import {
  Difficulty,
  ServerToClientEvents,
  ClientToServerEvents,
  GameStatus,
  GAME_MODE_CONFIG,
  SyncedGameRoom,
  toSafeClientQuestion,
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
  getPowerUpSelectionSnapshot,
  getViewerAnswerResult,
} from "../lib/gameOrchestrator";
import {
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
  startInvasionRound,
  recordAnswer,
  selectTerritory,
  getInvasionState,
  buildInvasionClientState,
} from "../lib/invasionOrchestrator";
import { GameMode } from "@quiz-battle/shared";
import { fillWithBots, getBotInfo } from "../lib/aiBots";
import { authorizeRoomAccess, revokeRoomAccess } from "../lib/roomAccess";
import { getChaosV2, initializeChaosV2, recordDramaV2, type ChaosPersonality } from "../lib/chaosEngineV2";
import { getChaosClientSnapshot } from "../lib/chaosSnapshot";
import { castChaosVote, startChaosVoting } from "../lib/chaosVoting";

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;

function roomSnapshot(game: NonNullable<ReturnType<typeof getActiveGame>>, viewerId?: string): SyncedGameRoom {
  const question = [GameStatus.Question, GameStatus.AnswerReveal].includes(game.status) && game.mode !== GameMode.Conquest
    ? game.questions[game.currentRound - 1] : null;
  const answer = viewerId ? game.answersThisRound[viewerId] : undefined;
  return {
    serverNow: Date.now(),
    gameId: game.gameId, joinCode: game.joinCode, hostId: game.hostId,
    mode: game.mode, difficulty: game.difficulty, status: game.status,
    isPrivate: !!game.isPrivate,
    currentRound: game.currentRound, totalRounds: game.totalRounds, maxPlayers: game.maxPlayers,
    customSettings: game.customSettings,
    category: game.categories?.join(", "), language: game.language,
    players: Object.values(game.players), activeEffects: game.activeEffects,
    currentQuestion: question ? toSafeClientQuestion(question) : null,
    questionStartedAt: game.questionStartTime,
    selectedAnswer: answer?.answer ?? answer?.index ?? null,
    answeredAt: answer?.timestamp ?? null,
    lastAnswerResult: viewerId && game.status === GameStatus.AnswerReveal ? getViewerAnswerResult(game.gameId, viewerId) : null,
    finalResults: game.status === GameStatus.Ended ? game.finalResults || [] : [],
    powerUpSelection: viewerId ? getPowerUpSelectionSnapshot(game.gameId, viewerId) : undefined,
    territories: game.territories, playerTerritories: game.playerTerritories,
    chaos: game.mode === GameMode.Chaos ? getChaosClientSnapshot(game.gameId, viewerId) : null,
  };
}

export function registerSocketHandlers(io: TypedServer, redis: SafeRedis) {
  // Matchmaking loop removed - Focusing on Host-Based Rooms

  // JWT auth middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (typeof token !== "string" || !token) {
        return next(new Error("Authentication required"));
      }
      // Guests also receive a signed token from /api/auth/guest. Identity comes
      // exclusively from that signature, never handshake userId/guestId fields.
      const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] });
      if (typeof decoded === "string" || typeof decoded.userId !== "string" || !decoded.userId ||
          typeof decoded.username !== "string" || !decoded.username) {
        return next(new Error("Invalid token identity"));
      }
      socket.data.userId = decoded.userId;
      socket.data.username = decoded.username;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  function roomConnections(gameId: string) {
    const ids = io.sockets.adapter.rooms.get(gameId) ?? [];
    return Array.from(ids).flatMap(id => {
      const socket = io.sockets.sockets.get(id);
      return socket ? [socket] : [];
    });
  }

  function syncChaosRoom(gameId: string) {
    const game = getActiveGame(gameId);
    if (game?.mode !== GameMode.Chaos) return;
    for (const socket of roomConnections(gameId)) {
      const userId = socket.data.userId as string;
      const player = game.players[userId];
      const viewerId = player && !player.isEliminated && !socket.rooms.has(`${gameId}_spectators`) ? userId : undefined;
      const snapshot = getChaosClientSnapshot(gameId, viewerId);
      if (snapshot) socket.emit("chaos:state", snapshot);
    }
  }

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    const username = socket.data.username as string;
    const canParticipate = (gameId: string) => {
      const game = getActiveGame(gameId);
      return !!(socket.rooms.has(gameId) && !socket.rooms.has(`${gameId}_spectators`) && game?.players[userId] && !game.players[userId].isEliminated);
    };
    const canHostInvasion = (gameId: string) => {
      const game = getActiveGame(gameId);
      return canParticipate(gameId) && game?.hostId === userId && game.mode === GameMode.Conquest;
    };
    const canHostChaos = (gameId: string) => {
      const game = getActiveGame(gameId);
      return canParticipate(gameId) && game?.hostId === userId && game.mode === GameMode.Chaos;
    };
    const syncInvasion = (gameId: string) => {
      if (getInvasionState(gameId)) {
        socket.emit("invasion:state", buildInvasionClientState(gameId, socket.rooms.has(`${gameId}_spectators`) ? undefined : userId));
      }
    };

    console.log(`🔌 Connected: ${username} (${userId})`);

    socket.on("clock:sync", (acknowledge) => {
      if (typeof acknowledge === "function") acknowledge({ serverNow: Date.now() });
    });

    // ─── Join Game ─────────────────────────────────────────
    socket.on("game:join", async ({ gameId, password }, cb) => {
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
        const access = await authorizeRoomAccess(activeGame, userId, password);
        if (!access.success) { cb?.(access); return; }
        if (getActiveGame(gameId) !== activeGame) { cb?.({ success: false, error: "Game not found" }); return; }

        if (activeGame.status !== GameStatus.Lobby && !activeGame.players[userId]) {
          cb?.({ success: false, error: "Game already in progress" });
          return;
        }

        const config = GAME_MODE_CONFIG[activeGame.mode];
        if (Object.keys(activeGame.players).length >= activeGame.maxPlayers && !activeGame.players[userId]) {
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
        if (socket.rooms.has(`${gameId}_spectators`)) await socket.leave(`${gameId}_spectators`);

        // Sync state to new player
        socket.emit("game:stateSync", {
          room: roomSnapshot(activeGame, userId),
        });

        // Sync Conquest state if in Conquest mode
        if (activeGame.mode === GameMode.Conquest) {
          const cState = getConquestState(gameId);
          if (cState) {
            socket.emit("conquest:state", safeConquestState(cState, userId));
          }
        }
        syncInvasion(gameId);

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
      if (!canParticipate(gameId)) { cb?.({ success: false, error: "Join the game first" }); return; }
      if (game.hostId !== userId) { cb?.({ success: false, error: "Only the host can start" }); return; }
      if (game.status !== GameStatus.Lobby) { cb?.({ success: false, error: "Game already started" }); return; }

      if (game.mode === GameMode.Chaos && !getChaosV2(gameId)) {
        initializeChaosV2(gameId);
        syncChaosRoom(gameId);
      }

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
      if (!canParticipate(gameId)) { cb?.({ success: false, error: "Player not in game" }); return; }
      const result = handlePowerUpSelection(gameId, userId, powerUp);
      cb?.(result);
    });

    socket.on("game:confirmPowerUpSelection", ({ gameId }, cb) => {
      if (!canParticipate(gameId)) { cb?.({ success: false, error: "Player not in game" }); return; }
      const result = confirmPowerUpSelection(io as TypedServer, redis, gameId, userId);
      cb?.(result);
    });

    // ─── Player Answer ───────────────────────────────────────
    socket.on("player:answer", async ({ gameId, questionId, answer, answerIndex, timestamp }) => {
      const game = getActiveGame(gameId);
      if (!game || game.status !== GameStatus.Question || !canParticipate(gameId)) return;

      await handlePlayerAnswer(
        game,
        io as TypedServer,
        redis,
        userId,
        questionId,
        answer ?? answerIndex,
        timestamp
      );
    });

    // ─── Emote ───────────────────────────────────────────────
    socket.on("game:emote", ({ gameId, emote }) => {
      if (!canParticipate(gameId)) return;
      io.to(gameId).emit("game:emote", { userId, emote });
    });

    // ─── Chat Message ─────────────────────────────────────────
    socket.on("game:message", ({ gameId, message }) => {
      const game = getActiveGame(gameId);
      if (!game || !socket.rooms.has(gameId)) return;

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
      if (!canParticipate(gameId)) { cb?.({ success: false, error: "Player not in game" }); return; }

      const result = await handlePowerUp(game, io as TypedServer, redis, userId, type, targetUserId);
      cb?.(result);
    });


    // ─── Spectate ────────────────────────────────────────────
    socket.on("game:spectate", async ({ gameId, password }, cb) => {
      const game = getActiveGame(gameId);
      if (!game) {
        if (cb) cb({ success: false, error: "Game not found" });
        else socket.emit("game:error", { message: "Game not found" });
        return;
      }
      const access = await authorizeRoomAccess(game, userId, password);
      if (!access.success) {
        if (cb) cb(access);
        else socket.emit("game:error", { message: access.error || "Room password required" });
        return;
      }
      if (getActiveGame(gameId) !== game) { cb?.({ success: false, error: "Game not found" }); return; }

      await socket.join(gameId);
      await socket.join(`${gameId}_spectators`);

      // Count spectators
      const spectatorRoom = io.sockets.adapter.rooms.get(`${gameId}_spectators`);
      const spectatorCount = spectatorRoom?.size || 1;

      // Notify room
      io.to(gameId).emit("game:spectatorJoined", { spectatorId: userId, spectatorCount });

      // Send current game state (exclude sensitive round/question state)
      socket.emit("game:stateSync", {
        room: roomSnapshot(game),
      });

      if (game.mode === GameMode.Conquest) {
        const cState = getConquestState(gameId);
        if (cState) {
          socket.emit("conquest:state", safeConquestState(cState));
        }
      }
      syncInvasion(gameId);
      cb?.({ success: true });
    });

    // ─── Leave Game ──────────────────────────────────────────
    socket.on("game:leave", async ({ gameId }) => {
      if (!socket.rooms.has(gameId)) return;
      const game = getActiveGame(gameId);
      const isSpectating = socket.rooms.has(`${gameId}_spectators`);
      if (!isSpectating && game?.players[userId]) {
        game.players[userId].isConnected = false;
      }
      socket.leave(gameId);
      socket.leave(`${gameId}_spectators`);
      revokeRoomAccess(gameId, userId);
      if (!isSpectating) socket.to(gameId).emit("game:playerLeft", { userId });
    });

    // ─── Conquest Handlers ────────────────────────────────────────
    socket.on("conquest:attack", async ({ gameId, targetTerritoryId, categoryId }, cb) => {
      if (!canParticipate(gameId)) { cb?.({ success: false, error: "Player not in game" }); return; }
      const result = await handleAttack(io as TypedServer, gameId, userId, targetTerritoryId, categoryId);
      cb?.(result);
    });

    socket.on("conquest:duelAnswer", ({ gameId, answerIndex }) => {
      if (!canParticipate(gameId)) return;
      handleDuelAnswer(io as TypedServer, gameId, userId, answerIndex);
    });

    socket.on("conquest:rebuild", async ({ gameId }, cb) => {
      if (!canParticipate(gameId)) { cb?.({ success: false, error: "Player not in game" }); return; }
      const result = await handleRebuild(io as TypedServer, gameId, userId);
      cb?.(result);
    });

    socket.on("conquest:rebuildAnswer", ({ gameId, answerIndex }) => {
      if (!canParticipate(gameId)) return;
      handleRebuildAnswer(io as TypedServer, gameId, userId, answerIndex);
    });

    // ─── Draft Phase (Splitting the World) ───────────────────────
    socket.on("conquest:draftAnswer", ({ gameId, answerIndex, responseTimeMs, questionId, round }, cb) => {
      if (!canParticipate(gameId)) { cb?.({ success: false, error: "Player not in game" }); return; }
      const result = recordDraftAnswer(gameId, userId, answerIndex, responseTimeMs, { questionId, round }, io as TypedServer);
      const state = getConquestState(gameId);
      if (state) socket.emit("conquest:state", safeConquestState(state, userId));
      cb?.(result);
      if (!result.success && !cb) {
        socket.emit("game:error", { message: result.error || "Unable to record draft answer" });
      }
    });

    socket.on("conquest:selectDraftTerritory", ({ gameId, territoryId, turnId }, cb) => {
      if (!canParticipate(gameId)) { cb?.({ success: false, error: "Player not in game" }); return; }
      const result = selectDraftTerritory(io as TypedServer, gameId, userId, String(territoryId), turnId);
      cb?.(result);
    });

    // ─── Invasion Mode ──────────────────────────────────────────
    
    // The Conquest orchestrator creates invasion from server-owned draft state.
    // A client may request a sync but may never replace its player list or map.
    socket.on("invasion:init", async ({ gameId }) => {
      if (!canHostInvasion(gameId)) {
        socket.emit("game:error", { message: "Only the host can initialize invasion" });
        return;
      }
      syncInvasion(gameId);
    });
    
    // Start invasion round (host only)
    socket.on("invasion:startRound", async ({ gameId }) => {
      if (!canHostInvasion(gameId)) {
        socket.emit("game:error", { message: "Only the host can start invasion" });
        return;
      }
      try {
        await startInvasionRound(gameId, io);
      } catch (err) {
        console.error("Invasion start error:", err);
        socket.emit("game:error", { message: "Unable to start invasion round" });
      }
    });
    
    // Record answer from player
    socket.on("invasion:answer", async ({ gameId, answer, responseTimeMs }) => {
      if (!canParticipate(gameId)) return;
      recordAnswer(gameId, userId, answer);
      console.log(`[Invasion] Player ${userId} answered in ${responseTimeMs}ms`);
    });
    
    // Select territory
    socket.on("invasion:selectTerritory", async ({ gameId, territoryId }) => {
      if (!canParticipate(gameId)) return;
      const parsedTerritoryId =
        typeof territoryId === "number" ? territoryId : Number(territoryId);
      const success = selectTerritory(gameId, userId, parsedTerritoryId, io);
      if (success) {
        console.log(`[Invasion] Player ${userId} selected territory ${territoryId}`);
      }
    });
    
    // Get current invasion state
    socket.on("invasion:getState", async ({ gameId }) => {
      if (!socket.rooms.has(gameId)) return;
      syncInvasion(gameId);
    });

    // ─── CHAOS MODE ─────────────────────────────────────────────
    
    // Older lobby clients may request a personality before starting the game.
    socket.on("chaos:init", ({ gameId, personality }) => {
      const game = getActiveGame(gameId);
      if (!canHostChaos(gameId) || game?.status !== GameStatus.Lobby || getChaosV2(gameId)) return;
      const allowed: ChaosPersonality[] = ["TRICKSTER", "AGGRESSIVE", "RANDOM", "REVENGE"];
      const chosen = allowed.includes(personality as ChaosPersonality) ? personality as ChaosPersonality : "RANDOM";
      initializeChaosV2(gameId, chosen);
      syncChaosRoom(gameId);
    });

    socket.on("chaos:drama", ({ gameId, type }) => {
      const game = getActiveGame(gameId);
      if (!canParticipate(gameId) || game?.mode !== GameMode.Chaos || game.status !== GameStatus.Question) return;
      const allowed = ["TAB_LEFT", "INACTIVITY", "SWITCHED_APP", "SUSPICIOUS_BEHAVIOR"] as const;
      const eventType = allowed.find(value => value === type);
      if (!eventType) return;
      const playerName = game.players[userId].username;
      const drama = recordDramaV2(gameId, eventType, userId, playerName);
      if (!drama) return;
      io.to(gameId).emit("chaos:drama", { id: drama.dramaId, type: eventType, playerId: userId, username: playerName });
      syncChaosRoom(gameId);
    });

    socket.on("chaos:startVoting", ({ gameId, dramaEventId }, cb) => {
      const game = getActiveGame(gameId);
      if (!canHostChaos(gameId) || !game || ![GameStatus.Question, GameStatus.AnswerReveal].includes(game.status)) {
        cb?.({ success: false, error: "Only the host can open a vote during a round" });
        return;
      }
      const voterIds = [...new Set(roomConnections(gameId).flatMap(connection => {
        const id = connection.data.userId as string;
        const player = game.players[id];
        return player && !player.isBot && !player.isEliminated && !connection.rooms.has(`${gameId}_spectators`) ? [id] : [];
      }))];
      const started = startChaosVoting(io, gameId, { dramaEventId, voterIds }, (targetPlayerId, amount) => {
        if (getActiveGame(gameId) !== game || game.status === GameStatus.Ended) return 0;
        const target = game.players[targetPlayerId];
        if (!target) return 0;
        const deduction = Math.min(target.score, amount);
        target.score -= deduction;
        io.to(gameId).emit("game:scoreboard", { players: Object.values(game.players).sort((a, b) => b.score - a.score) });
        return deduction;
      }, () => syncChaosRoom(gameId));
      cb?.(started ? { success: true } : { success: false, error: "This vote could not be opened" });
    });

    socket.on("chaos:vote", ({ gameId, dramaEventId, vote }, cb) => {
      const game = getActiveGame(gameId);
      const accepted = canParticipate(gameId) && game?.mode === GameMode.Chaos && game.status !== GameStatus.Ended &&
        castChaosVote(io, gameId, dramaEventId, userId, vote);
      if (accepted) socket.emit("chaos:voteConfirmed", { vote, dramaEventId });
      cb?.(accepted ? { success: true } : { success: false, error: "This vote is closed or unavailable" });
    });

    // Activate trap round
    socket.on("chaos:activateTrap", async ({ gameId, targetPlayerId }) => {
      const game = getActiveGame(gameId);
      const target = game?.players[targetPlayerId];
      if (!canHostChaos(gameId) || game?.status !== GameStatus.Question || !target || target.isEliminated) return;
      const { initializeTrap } = await import("../lib/trapSystem");
      const totalPlayers = Object.keys(game.players).length;
      const trap = initializeTrap(gameId, targetPlayerId, target.username, -1, totalPlayers);
      
      io.to(gameId).emit("chaos:trapActivated", {
        targetPlayerId,
        targetUsername: trap.targetUsername,
        trapLevel: trap.trapLevel,
        message: "🚨 TRAP ROUND ACTIVATED!",
      });
      syncChaosRoom(gameId);
    });
    
    // Evaluate trap outcome
    socket.on("chaos:evaluateTrap", async ({ gameId }) => {
      if (!canHostChaos(gameId) || getActiveGame(gameId)?.status !== GameStatus.Question) return;
      const { evaluateTrap } = await import("../lib/trapSystem");
      const evaluation = evaluateTrap(gameId, io);
      syncChaosRoom(gameId);
      await evaluation;
      syncChaosRoom(gameId);
    });
    
    socket.on("chaos:getState", ({ gameId }) => {
      if (!socket.rooms.has(gameId) || getActiveGame(gameId)?.mode !== GameMode.Chaos) return;
      const snapshot = getChaosClientSnapshot(gameId, canParticipate(gameId) ? userId : undefined);
      if (snapshot) socket.emit("chaos:state", snapshot);
    });

    // Get target advantages (hint, time bonus)
    socket.on("chaos:getAdvantages", async ({ gameId }) => {
      if (!canParticipate(gameId)) return;
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

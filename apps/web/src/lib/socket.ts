"use client";
import { io, Socket } from "socket.io-client";
import { ServerToClientEvents, ClientToServerEvents, PowerUpType, getPowerUpMessage, GameStatus } from "@quiz-battle/shared";
import { useGameStore } from "../store/gameStore";

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: TypedSocket | null = null;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";

export function getSocket(): TypedSocket {
  if (!socket) {
    const store = useGameStore.getState();
    socket = io(API_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: {
        token: store.token,
        userId: store.userId,
        username: store.username,
        guestId: store.isGuest ? store.userId : undefined,
      },
    }) as TypedSocket;

    registerHandlers(socket);
  }
  return socket;
}

export function connectSocket(
  userId: string,
  username: string,
  token?: string,
  isGuest?: boolean
): TypedSocket {
  if (socket?.connected) return socket;

  socket = io(API_URL, {
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    auth: { token, userId, username, guestId: isGuest ? userId : undefined },
  }) as TypedSocket;

  registerHandlers(socket);
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

function registerHandlers(s: TypedSocket) {
  s.on("connect", () => {
    console.log("✅ Socket connected:", s.id);
    useGameStore.getState().setConnected(true);
  });

  s.on("disconnect", () => {
    console.log("❌ Socket disconnected");
    useGameStore.getState().setConnected(false);
  });

  s.on("game:playerJoined", ({ player }) => {
    const gs = useGameStore.getState();
    gs.addPlayer(player);
    // Don't show toast for yourself
    if (player.userId !== gs.userId) {
      const msg = gs.language === "ar"
        ? `${player.username} انضم إلى المعركة!`
        : `${player.username} joined the battle!`;
      gs.addToast("info", msg);
    }
  });

  s.on("game:playerLeft", ({ userId }) => {
    const gs = useGameStore.getState();
    const player = gs.players.find(p => p.userId === userId);
    gs.removePlayer(userId);
    if (player && userId !== gs.userId) {
      const msg = gs.language === "ar"
        ? `${player.username} غادر المعركة`
        : `${player.username} left the battle`;
      gs.addToast("info", msg);
    }
  });

  s.on("game:countdown", ({ seconds }) => {
    const gs = useGameStore.getState();
    const msg = gs.language === "ar"
      ? `⚔️ تبدأ المعركة خلال ${seconds} ثوانٍ!`
      : `⚔️ Battle starts in ${seconds}s!`;
    gs.addToast("info", msg);
  });

  // PowerUp Selection Phase
  s.on("game:powerUpSelectStart", ({ availablePowerUps, maxSelections, timeLimit }) => {
    const gs = useGameStore.getState();
    gs.setPowerUpSelection({
      isSelecting: true,
      availablePowerUps,
      maxSelections,
      timeLeft: timeLimit,
    });
    gs.setStatus(GameStatus.PowerUpSelect);
    const msg = gs.language === "ar"
      ? "⚡ اختر قوى خاصة للمعركة!"
      : "⚡ Choose your power-ups for battle!";
    gs.addToast("info", msg);
  });

  s.on("game:powerUpSelected", ({ userId, powerUp, remainingSlots }) => {
    const gs = useGameStore.getState();
    if (userId === gs.userId) {
      gs.selectPowerUp(powerUp);
    }
  });

  s.on("game:powerUpSelectEnd", ({ selections }) => {
    const gs = useGameStore.getState();
    gs.setAllPowerUpSelections(selections);
    gs.confirmPowerUpSelection();
    const msg = gs.language === "ar"
      ? "✅ تم اختيار القوى! تبدأ المعركة..."
      : "✅ Power-ups selected! Battle starting...";
    gs.addToast("success", msg);
  });

  s.on("game:question", ({ question, round, totalRounds }) => {
    useGameStore.getState().setQuestion(question, round, totalRounds);
  });

  s.on("game:answerResult", ({ userId, correct, scoreDelta, newScore, correctIndex }) => {
    const gs = useGameStore.getState();
    const isAr = gs.language === "ar";

    if (userId === gs.userId) {
      gs.setLastAnswerResult({ correct, correctIndex });
      if (correct) {
        const msg = isAr
          ? `✓ صحيح! +${scoreDelta} نقطة`
          : `✓ Correct! +${scoreDelta} pts`;
        gs.addToast("success", msg);
      } else {
        const letter = String.fromCharCode(65 + correctIndex);
        const msg = isAr
          ? `✗ خطأ! الإجابة الصحيحة: ${letter}`
          : `✗ Wrong! Correct: ${letter}`;
        gs.addToast("error", msg);
      }
    }

    gs.updatePlayer(userId, { score: newScore });
  });

  s.on("game:scoreboard", ({ players }) => {
    useGameStore.getState().setPlayers(players);
  });

  s.on("game:powerUpApplied", (effect) => {
    const gs = useGameStore.getState();
    gs.addEffect(effect);

    if (effect.type === "fifty_fifty") {
      const eliminatedIndices = (effect as typeof effect & { eliminatedIndices?: number[] }).eliminatedIndices;
      if (eliminatedIndices) {
        gs.setEliminatedOptions(eliminatedIndices);
      }
    }

    if (effect.type === PowerUpType.TimeWarp && effect.sourceUserId === gs.userId) {
      gs.applyTimeWarpBonus(5);
    }

    gs.addToast(
      "info",
      getPowerUpMessage({
        type: effect.type,
        language: gs.language,
        viewerUserId: gs.userId,
        sourceUserId: effect.sourceUserId,
        targetUserId: effect.targetUserId,
      })
    );

    // Special toast if YOU are the target
    if (effect.targetUserId === gs.userId && effect.sourceUserId !== gs.userId) {
      const sourcePlayer = gs.players.find((p) => p.userId === effect.sourceUserId);
      const isAr = gs.language === "ar";
      const sourceName = sourcePlayer?.username || (isAr ? "لاعب" : "Player");
      
      let targetMessage = "";
      switch (effect.type) {
        case "freeze":
          targetMessage = isAr ? `❄️ ${sourceName} جمدك!` : `❄️ ${sourceName} froze you!`;
          break;
        case "steal":
          targetMessage = isAr ? `💰 ${sourceName} سرق نقاطك!` : `💰 ${sourceName} stole your points!`;
          break;
        case "sandstorm":
          targetMessage = isAr ? `🌪️ ${sourceName} أربك خياراتك!` : `🌪️ ${sourceName} scrambled your options!`;
          break;
        default:
          targetMessage = isAr ? `⚡ ${sourceName} استخدم قوة عليك!` : `⚡ ${sourceName} used a powerup on you!`;
      }
      gs.addToast("warning", targetMessage);
    }
  });

  s.on("game:playerEliminated", ({ userId, reason }) => {
    const gs = useGameStore.getState();
    const isAr = gs.language === "ar";
    const player = gs.players.find((p) => p.userId === userId);
    gs.updatePlayer(userId, { isEliminated: true });
    const name = player?.username || (isAr ? "لاعب" : "Player");
    const msg = userId === gs.userId
      ? (isAr ? "💀 تم استبعادك من المعركة!" : "💀 You were eliminated!")
      : (isAr ? `💀 ${name} تم استبعاده!` : `💀 ${name} eliminated!`);
    gs.addToast(userId === gs.userId ? "error" : "info", msg);
  });

  s.on("game:end", ({ results }) => {
    useGameStore.getState().setFinalResults(results);
  });



  // Conquest mode events
  s.on("game:territoryCaptured", ({ territoryId, playerName }) => {
    useGameStore.getState().addToast("info", `🏰 Territory ${territoryId} captured by ${playerName}!`);
  });



  s.on("game:stateSync", ({ room }) => {
    useGameStore.getState().syncRoom(room);
  });

  s.on("game:error", ({ message }) => {
    useGameStore.getState().addToast("error", message);
  });

  // ─── Chat ────────────────────────────────────────────────
  s.on("game:chat", (message) => {
    useGameStore.getState().addChatMessage(message);
  });

  // ─── Ready Check ───────────────────────────────────────────
  s.on("game:playerReady", ({ userId, isReady }) => {
    const gs = useGameStore.getState();
    const currentReady = gs.readyPlayers || [];
    if (isReady) {
      if (!currentReady.includes(userId)) {
        gs.setReadyPlayers([...currentReady, userId]);
      }
    } else {
      gs.setReadyPlayers(currentReady.filter((id) => id !== userId));
    }
  });

  s.on("game:allPlayersReady", () => {
    const gs = useGameStore.getState();
    gs.addToast("success", gs.language === "ar" ? "✅ جميع اللاعبين جاهزون!" : "✅ All players ready!");
  });

  // ─── Spectator ─────────────────────────────────────────────
  s.on("game:spectatorJoined", ({ spectatorCount }) => {
    const gs = useGameStore.getState();
    gs.addToast("info", gs.language === "ar" ? `👁️ ${spectatorCount} مشاهد` : `👁️ ${spectatorCount} watching`);
  });

  // ─── Conquest Events ───────────────────────────────────────
  s.on("conquest:state", (conquestState) => {
    console.log("[Socket] conquest:state received:", conquestState);
    useGameStore.getState().setConquestState(conquestState);
  });

  s.on("conquest:turnStart", ({ playerId, playerName }) => {
    const gs = useGameStore.getState();
    const isMe = playerId === gs.userId;
    const msg = isMe
      ? (gs.language === "ar" ? "⚔️ دورك الآن — اختر هدفك!" : "⚔️ Your turn — pick your target!")
      : (gs.language === "ar" ? `⏳ دور ${playerName} الآن` : `⏳ ${playerName}'s turn`);
    gs.addToast(isMe ? "success" : "info", msg);
  });

  // ─── Victory/Defeat Statements ─────────────────────────────
  const VICTORY_STATEMENTS = [
    { ar: "👑 الملك دائماً منتصر!", en: "👑 The King Always Wins!" },
    { ar: "🗡️ انتصار ساحق!", en: "🗡️ Crushing Victory!" },
    { ar: "🏆 لا أحد يقف أمامي!", en: "🏆 None Can Stand Against Me!" },
    { ar: "⚔️ المجد للمنتصر!", en: "⚔️ Glory to the Victor!" },
    { ar: "🌍 العالم يخضع لي!", en: "🌍 The World Bows to Me!" }
  ];

  const DEFEAT_STATEMENTS = [
    { ar: "💀 دُمِّرَ جيشُك كلُّه!", en: "💀 Your Army Lies in Ruins!" },
    { ar: "🩸 دمُك يسيل على الأرض!", en: "🩸 Your Blood Spills Upon the Earth!" },
    { ar: "⚰️ مقبرتُك في أرضِ العدو!", en: "⚰️ Your Grave Awaits in Enemy Soil!" },
    { ar: "🔥 احترقت ممالكُك كلُّها!", en: "🔥 Your Kingdoms Burn to Ash!" },
    { ar: "☠️ الموتُ يُحيطُ بك من كلِّ جانب!", en: "☠️ Death Surrounds You from All Sides!" },
    { ar: "🌑 ظلامُ الهزيمةِ يبتلعُك!", en: "🌑 The Darkness of Defeat Consumes You!" },
    { ar: "💔 انكسَرَت إرادتُك للأبد!", en: "💔 Your Will is Broken Forever!" },
    { ar: "⚔️ سُحِقَت تحتَ أقدامِ الغزاة!", en: "⚔️ Crushed Beneath the Invaders' Feet!" }
  ];

  s.on("conquest:duelResult", ({ attackerWon, correctIndex, capturedTerritoryId, fortDamage, eliminatedPlayerId, tieBreaker }) => {
    const gs = useGameStore.getState();
    const isAr = gs.language === "ar";
    
    if (tieBreaker) {
      gs.addToast("info", isAr ? "🤝 تعادل! جولة إضافية..." : "🤝 Tie! Next round...");
      return;
    }
    
    if (attackerWon) {
      // Victory sound + random victory statement
      const statement = VICTORY_STATEMENTS[Math.floor(Math.random() * VICTORY_STATEMENTS.length)];
      gs.addToast("success", isAr ? statement.ar : statement.en);
      
      if (capturedTerritoryId !== undefined) gs.addToast("success", isAr ? "🏴 تم الاستيلاء على الإقليم!" : "🏴 Territory captured!");
      if (fortDamage) gs.addToast("success", isAr ? "💥 تم إلحاق الضرر بالحصن!" : "💥 Fort damaged!");
      if (eliminatedPlayerId) gs.addToast("error", isAr ? "💀 تم القضاء على محارب!" : "💀 Warrior eliminated!");
    } else {
      // Defeat sound + random defeat statement  
      const statement = DEFEAT_STATEMENTS[Math.floor(Math.random() * DEFEAT_STATEMENTS.length)];
      gs.addToast("error", isAr ? statement.ar : statement.en);
      gs.addToast("info", isAr ? "🛡️ الدفاع نجح!" : "🛡️ Defense held!");
    }
  });

  // ─── Conquest Draft Events ─────────────────────────────────────
  s.on("conquest:draftQuestion", ({ round, question }) => {
    const gs = useGameStore.getState();
    const isAr = gs.language === "ar";
    gs.addToast("info", isAr ? `📝 سؤال الجولة ${round}` : `📝 Round ${round} question`);
  });

  s.on("conquest:draftRanking", ({ round, ranking, pickOrder }) => {
    const gs = useGameStore.getState();
    const isAr = gs.language === "ar";

    const myRank = ranking.find((r: { playerId: string }) => r.playerId === gs.userId);
    if (myRank) {
      const msg = isAr
        ? `مرتبتك: #${myRank.rank} — ${myRank.picks} اختيارات`
        : `Rank #${myRank.rank} — ${myRank.picks} picks`;
      gs.addToast(myRank.rank === 1 ? "success" : "info", msg);
    }
  });

  s.on("conquest:draftPickTurn", ({ playerId, playerName, picksRemaining, availableTerritories }) => {
    const gs = useGameStore.getState();
    const isMe = playerId === gs.userId;
    const isAr = gs.language === "ar";

    const msg = isMe
      ? (isAr ? `🎯 دورك — اختر ${picksRemaining} منطقة!` : `🎯 Your turn — pick ${picksRemaining} territories!`)
      : (isAr ? `⏳ دور ${playerName} للاختيار` : `⏳ ${playerName}'s turn to select`);
    gs.addToast(isMe ? "success" : "info", msg);
  });

  s.on("conquest:territoryClaimed", ({ territoryId, playerId, playerName, isFort }) => {
    const gs = useGameStore.getState();
    const isAr = gs.language === "ar";
    const isMe = playerId === gs.userId;

    const msg = isMe
      ? (isAr ? `🏰 احتلت ${territoryId}${isFort ? " (حصن!)" : ""}` : `🏰 You claimed ${territoryId}${isFort ? " (Fort!)" : ""}`)
      : (isAr ? `🌍 ${playerName} احتل ${territoryId}` : `🌍 ${playerName} claimed ${territoryId}`);
    gs.addToast(isMe ? "success" : "info", msg);
  });

  // ─── Invasion Events ─────────────────────────────────────
  s.on("invasion:init", ({ gameId, playerIds }) => {
    console.log("[Socket] invasion:init received - transitioning to invasion mode", { gameId, playerCount: playerIds.length });
    const gs = useGameStore.getState();
    const isAr = gs.language === "ar";
    
    // Show transition toast
    gs.addToast("info", isAr ? "⚔️ بدأت مرحلة الغزو!" : "⚔️ Invasion phase began!");
    
    // Request initial invasion state and auto-start first round
    setTimeout(() => {
      emitInvasionGetState(gameId);
      // Auto-start first round after brief delay to let clients transition
      setTimeout(() => emitInvasionStartRound(gameId), 1000);
    }, 500);
  });

  s.on("invasion:state", (invasionState) => {
    console.log("[Socket] invasion:state received:", invasionState);
    useGameStore.getState().setInvasionState(invasionState);
  });

  s.on("invasion:roundStart", ({ round, totalRounds, question }) => {
    const gs = useGameStore.getState();
    gs.setInvasionQuestion(question);
    // Also populate standard game state so the existing question UI renders
    if (question) {
      gs.setQuestion(
        {
          id: question.id,
          text: question.text,
          options: question.options,
          timeLimit: question.timeLimit || 15,
          category: "General",
          difficulty: "Scholar" as any,
        },
        round,
        totalRounds
      );
    }
    console.log(`[Socket] invasion:roundStart round=${round}/${totalRounds}`);
  });

  s.on("invasion:ranking", ({ ranking, correctAnswer }) => {
    const gs = useGameStore.getState();
    const isAr = gs.language === "ar";
    
    // Update invasion state with ranking
    if (gs.invasionState) {
      gs.setInvasionState({
        ...gs.invasionState,
        phase: "ranking",
        lastRanking: ranking,
      });
    }
    
    // Show toast about picks earned
    const myRank = ranking.find((r: { playerId: string }) => r.playerId === gs.userId);
    if (myRank) {
      const msg = isAr 
        ? `مرتبتك: #${myRank.rank} (${myRank.picks} اختيارات)`
        : `Rank #${myRank.rank} — ${myRank.picks} picks`;
      gs.addToast(myRank.rank === 1 ? "success" : "info", msg);
    }
  });

  s.on("invasion:turn", ({ playerId, picksRemaining, selectableTerritories, timeLimit }) => {
    const gs = useGameStore.getState();
    const isMe = playerId === gs.userId;
    const isAr = gs.language === "ar";
    
    // Update invasion state
    if (gs.invasionState) {
      gs.setInvasionState({
        ...gs.invasionState,
        phase: "selection",
        currentTurn: playerId,
        picksRemaining,
        selectableTerritories,
      });
    }
    
    const msg = isMe
      ? (isAr ? `⚔️ دورك — اختر ${picksRemaining} منطقة!` : `⚔️ Your turn — pick ${picksRemaining} territories!`)
      : (isAr ? `⏳ دور ${playerId} للاختيار` : `⏳ ${playerId}'s turn to select`);
    gs.addToast(isMe ? "success" : "info", msg);
  });

  s.on("invasion:territoryUpdate", (data) => {
    const gs = useGameStore.getState();
    const isAr = gs.language === "ar";
    
    if (gs.invasionState) {
      if ("territories" in data) {
        const updatesById = new Map(
          data.territories.map((territory) => [String(territory.id), territory])
        );
        const updatedTerritories = gs.invasionState.territories.map((territory) => {
          const updated = updatesById.get(String(territory.id));
          if (!updated) return territory;
          return {
            ...territory,
            ownerId: updated.ownerId,
            troopCount: updated.troopCount,
          };
        });
        gs.setInvasionState({
          ...gs.invasionState,
          territories: updatedTerritories,
        });
        return;
      }

      const { territoryId, ownerId, troopCount } = data;
      const updatedTerritories = gs.invasionState.territories.map((territory) =>
        String(territory.id) === String(territoryId) ? { ...territory, ownerId, troopCount } : territory
      );
      gs.setInvasionState({
        ...gs.invasionState,
        territories: updatedTerritories,
      });
    }
    
    const conquered = "conquered" in data ? data.conquered : false;
    const ownerId = "ownerId" in data ? data.ownerId : null;
    if (conquered) {
      const msg = ownerId === gs.userId
        ? (isAr ? "🏴 تم الاستيلاء على المنطقة!" : "🏴 Territory captured!")
        : (isAr ? "⚔️ خسر منطقة!" : "⚔️ Territory lost!");
      gs.addToast(ownerId === gs.userId ? "success" : "warning", msg);
    }
  });

  s.on("invasion:gameEnd", ({ scores, winner, winnerId, winnerName, finalTerritories }) => {
    const gs = useGameStore.getState();
    const isAr = gs.language === "ar";
    const resolvedScores = scores || finalTerritories;
    const resolvedWinner =
      winner ||
      (winnerId
        ? { playerId: winnerId, playerName: winnerName || winnerId }
        : undefined);
    
    if (gs.invasionState) {
      gs.setInvasionState({
        ...gs.invasionState,
        phase: "ended",
      });
    }
    
    if (resolvedWinner?.playerId === gs.userId) {
      gs.addToast("success", isAr ? "🏆 فزت بالغزو!" : "🏆 You won the invasion!");
    } else if (resolvedWinner) {
      gs.addToast(
        "info",
        isAr
          ? `انتهت اللعبة — الفائز: ${resolvedWinner.playerName || resolvedWinner.playerId}`
          : `Game over — Winner: ${resolvedWinner.playerName || resolvedWinner.playerId}`
      );
    } else if (resolvedScores) {
      gs.addToast("info", isAr ? "انتهت اللعبة" : "Game over");
    }
  });

  // ─── Reconnect ───────────────────────────────────────────
  s.on("game:reconnected", ({ gameId, state }) => {
    const gs = useGameStore.getState();
    gs.setGameId(gameId);
    gs.syncRoom(state);
    gs.addToast("success", gs.language === "ar" ? "🔄 تم إعادة الاتصال!" : "🔄 Reconnected!");
  });

  s.on("conquest:rebuildResult", ({ success, newHealth }) => {
    const gs = useGameStore.getState();
    const isAr = gs.language === "ar";
    gs.addToast(success ? "success" : "error",
      success
        ? (isAr ? `🏗️ تم تعزيز الحصن! الطبقات: ${newHealth}/3` : `🏗️ Fort reinforced! Layers: ${newHealth}/3`)
        : (isAr ? "❌ فشل إعادة البناء" : "❌ Rebuild failed"));
  });

  // ─── CHAOS MODE ─────────────────────────────────────────────
  
  s.on("chaos:init", ({ chaosLevel, chaosState, personality, message }) => {
    const gs = useGameStore.getState();
    gs.setChaosState({ chaosLevel, chaosState, personality });
    gs.addToast("info", message);
  });
  
  s.on("chaos:drama", ({ id, type, playerId, username }) => {
    const gs = useGameStore.getState();
    const isMe = playerId === gs.userId;
    
    const dramaMessages: Record<string, { ar: string; en: string }> = {
      TAB_LEFT: { ar: "غادر اللعبة أثناء السؤال", en: "left during the question" },
      INACTIVITY: { ar: "غير نشط", en: "is inactive" },
      SWITCHED_APP: { ar: "انتقل لتطبيق آخر", en: "switched to another app" },
      SUSPICIOUS_BEHAVIOR: { ar: "أظهر سلوكاً مشبوهاً", en: "showed suspicious behavior" },
    };
    
    const msg = dramaMessages[type];
    if (msg) {
      gs.addToast("warning", gs.language === "ar" 
        ? `⚠️ ${username} ${msg.ar}` 
        : `⚠️ ${username} ${msg.en}`);
      
      // Trigger voting UI if chaos level high enough
      gs.setActiveDrama({ id, type, playerId, username });
    }
  });
  
  s.on("chaos:votingStart", ({ dramaEventId, targetPlayerId, targetUsername, duration, options }) => {
    const gs = useGameStore.getState();
    gs.setChaosVoting({
      isActive: true,
      dramaEventId,
      targetPlayerId,
      targetUsername,
      duration,
      options,
      votes: {},
    });
  });
  
  s.on("chaos:votingUpdate", ({ totalVotes, voteCounts, timeRemaining }) => {
    const gs = useGameStore.getState();
    gs.updateChaosVoting({ totalVotes, voteCounts, timeRemaining });
  });
  
  s.on("chaos:votingComplete", ({ result, targetPlayerId, targetUsername, voteCounts }) => {
    const gs = useGameStore.getState();
    gs.completeChaosVoting({ result, targetPlayerId, targetUsername, voteCounts });
    
    const resultMessages: Record<string, { ar: string; en: string }> = {
      FORGIVE: { ar: "✅ تم التسامح!", en: "✅ Forgiven!" },
      REDUCE_SCORE: { ar: `👎 تم خفض نقاط ${targetUsername}`, en: `👎 ${targetUsername}'s score reduced!` },
      BLOCK_QUESTION: { ar: `🚫 تم حجب سؤال ${targetUsername}`, en: `🚫 ${targetUsername}'s next question blocked!` },
    };
    
    const msg = resultMessages[result];
    if (msg) {
      gs.addToast(result === "FORGIVE" ? "success" : "warning", 
        gs.language === "ar" ? msg.ar : msg.en);
    }
  });
  
  s.on("chaos:trapActivated", ({ targetPlayerId, targetUsername, trapLevel, message }) => {
    const gs = useGameStore.getState();
    const isMe = targetPlayerId === gs.userId;
    
    gs.setActiveTrap({ targetPlayerId, targetUsername, trapLevel });
    
    gs.addToast(isMe ? "error" : "warning", 
      gs.language === "ar" 
        ? `🚨 فخ مستوى ${trapLevel} مفعل ضد ${targetUsername}!` 
        : `🚨 Level ${trapLevel} trap activated against ${targetUsername}!`);
  });
  
  s.on("chaos:evaluating", ({ message, correctRatio, playerCount }) => {
    const gs = useGameStore.getState();
    gs.setTrapEvaluating({ message, correctRatio, playerCount });
  });
  
  s.on("chaos:result", ({ outcome, title, emoji, color, correctRatio, targetUsername, heroUsername, playerResults, summary }) => {
    const gs = useGameStore.getState();
    gs.setTrapResult({ outcome, title, emoji, color, correctRatio, targetUsername, heroUsername, playerResults, summary });
    gs.addToast(outcome === "FULL_TRAP" || outcome === "PARTIAL_TRAP" ? "error" : "success", summary);
  });
  
  s.on("chaos:state", ({ chaosLevel, chaosState, personality, factors, momentum }) => {
    const gs = useGameStore.getState();
    gs.setChaosState({ chaosLevel, chaosState, personality, factors, momentum });
  });
  
  s.on("chaos:advantages", ({ timeBonus, eliminatedOptions }) => {
    const gs = useGameStore.getState();
    gs.setChaosAdvantages({ timeBonus, eliminatedOptions });
    if (timeBonus > 0) {
      gs.addToast("info", gs.language === "ar" 
        ? `⏱️ مكافأة زمنية: +${timeBonus} ثوانٍ!` 
        : `⏱️ Time bonus: +${timeBonus}s!`);
    }
  });

}

// ─── Action helpers ──────────────────────────────────────────

export function emitJoinGame(gameId: string): Promise<import("@quiz-battle/shared").JoinResponse> {
  return new Promise((resolve, reject) => {
    const s = getSocket();
    const timeout = setTimeout(() => {
      reject(new Error("Join game timeout"));
    }, 10000);
    
    s.emit("game:join", { gameId }, (response) => {
      clearTimeout(timeout);
      resolve(response);
    });
  });
}

export function emitStartGame(gameId: string): Promise<import("@quiz-battle/shared").AckResponse> {
  return new Promise((resolve, reject) => {
    const s = getSocket();
    const timeout = setTimeout(() => {
      reject(new Error("Start game timeout"));
    }, 10000);
    
    s.emit("game:start", { gameId }, (response) => {
      clearTimeout(timeout);
      resolve(response);
    });
  });
}

export function emitSpectateGame(gameId: string) {
  const s = getSocket();
  s.emit("game:spectate", { gameId });
}

export function emitAnswer(gameId: string, questionId: string, answerIndex: number) {
  const s = getSocket();
  s.emit("player:answer", { gameId, questionId, answerIndex, timestamp: Date.now() });
}

export function emitPowerUp(
  gameId: string,
  type: PowerUpType,
  targetUserId?: string
): Promise<import("@quiz-battle/shared").AckResponse> {
  return new Promise((resolve, reject) => {
    const s = getSocket();
    const timeout = setTimeout(() => {
      reject(new Error("Power-up timeout"));
    }, 5000);
    
    s.emit("player:powerup", { gameId, type, targetUserId }, (response) => {
      clearTimeout(timeout);
      resolve(response);
    });
  });
}

// ─── Conquest helpers ─────────────────────────────────────────

export function emitConquestAttack(
  gameId: string,
  targetTerritoryId: string,
  categoryId?: string
): Promise<import("@quiz-battle/shared").AckResponse> {
  return new Promise((resolve, reject) => {
    const s = getSocket();
    const timeout = setTimeout(() => {
      reject(new Error("Attack timeout"));
    }, 5000);
    
    s.emit("conquest:attack", { gameId, targetTerritoryId, categoryId }, (response) => {
      clearTimeout(timeout);
      resolve(response);
    });
  });
}

export function emitConquestDuelAnswer(gameId: string, answerIndex: number) {
  getSocket().emit("conquest:duelAnswer", { gameId, answerIndex });
}

export function emitConquestRebuild(
  gameId: string
): Promise<import("@quiz-battle/shared").AckResponse> {
  return new Promise((resolve, reject) => {
    const s = getSocket();
    const timeout = setTimeout(() => {
      reject(new Error("Rebuild timeout"));
    }, 5000);
    
    s.emit("conquest:rebuild", { gameId }, (response) => {
      clearTimeout(timeout);
      resolve(response);
    });
  });
}

export function emitConquestRebuildAnswer(gameId: string, answerIndex: number) {
  getSocket().emit("conquest:rebuildAnswer", { gameId, answerIndex });
}

// ─── Conquest Draft helpers ───────────────────────────────────

export function emitConquestDraftAnswer(
  gameId: string,
  answerIndex: number,
  responseTimeMs: number
) {
  const s = getSocket();
  s.emit("conquest:draftAnswer", { gameId, answerIndex, responseTimeMs });
}

export function emitConquestSelectDraftTerritory(
  gameId: string,
  territoryId: string
): Promise<import("@quiz-battle/shared").AckResponse> {
  return new Promise((resolve, reject) => {
    const s = getSocket();
    const timeout = setTimeout(() => {
      reject(new Error("Territory selection timeout"));
    }, 5000);
    
    s.emit("conquest:selectDraftTerritory", { gameId, territoryId }, (response) => {
      clearTimeout(timeout);
      resolve(response);
    });
  });
}

// ─── Invasion helpers ─────────────────────────────────────────

export function emitInvasionAnswer(
  gameId: string,
  answer: number,
  responseTimeMs: number
) {
  const s = getSocket();
  s.emit("invasion:answer", { gameId, answer, responseTimeMs });
}

export function emitInvasionSelectTerritory(gameId: string, territoryId: number) {
  const s = getSocket();
  s.emit("invasion:selectTerritory", { gameId, territoryId });
}

export function emitInvasionStartRound(gameId: string) {
  const s = getSocket();
  s.emit("invasion:startRound", { gameId });
}

export function emitInvasionGetState(gameId: string) {
  const s = getSocket();
  s.emit("invasion:getState", { gameId });
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAOS MODE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function emitChaosVote(
  gameId: string,
  vote: "FORGIVE" | "REDUCE_SCORE" | "BLOCK_QUESTION"
) {
  const s = getSocket();
  s.emit("chaos:vote", { gameId, vote });
}

export function emitChaosAnswer(
  gameId: string,
  questionId: string,
  answerIndex: number,
  mode: "SAFE" | "RISK"
) {
  const s = getSocket();
  s.emit("chaos:answer", { gameId, questionId, answerIndex, mode });
}

export function emitChaosInit(
  gameId: string,
  personality: "TRICKSTER" | "AGGRESSIVE" | "RANDOM" | "REVENGE" = "RANDOM"
) {
  const s = getSocket();
  s.emit("chaos:init", { gameId, personality });
}

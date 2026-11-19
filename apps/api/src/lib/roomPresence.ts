import type { Server, Socket } from "socket.io";
import { GameStatus, type ClientToServerEvents, type ServerToClientEvents } from "@quiz-battle/shared";
import { getActiveGame } from "./gameOrchestrator";
import { revokeRoomAccess } from "./roomAccess";
import { roomConnections } from "./roomConnections";

const LOBBY_RECONNECT_MS = 60_000;

export function trackRoomPresence(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: Socket<ClientToServerEvents, ServerToClientEvents>
) {
  const userId = socket.data.userId as string;
  let currentRoom: string | null = null;
  let latestAdmission: { gameId: string } | null = null;

  function watchers(gameId: string) {
    return new Set(roomConnections(io, gameId).filter(member => member.rooms.has(`${gameId}_spectators`)).map(member => member.data.userId));
  }

  function notifyDeparture(gameId: string, wasWatching: boolean, disconnected: boolean) {
    const game = getActiveGame(gameId);
    if (!game) return;
    const others = roomConnections(io, gameId).filter(member => member.id !== socket.id);
    const sameUser = others.filter(member => member.data.userId === userId);
    const watcherRoom = `${gameId}_spectators`;
    if (wasWatching) {
      const remaining = new Set(others.filter(member => member.rooms.has(watcherRoom)).map(member => member.data.userId));
      if (!remaining.has(userId)) socket.to(gameId).emit("game:spectatorLeft", { spectatorId: userId, spectatorCount: remaining.size });
      return;
    }
    if (!game.players[userId] || sameUser.some(member => !member.rooms.has(watcherRoom))) return;
    const keepSeat = disconnected || game.status !== GameStatus.Lobby || userId === game.hostId;
    if (keepSeat) {
      const offline = { ...game.players[userId], isConnected: false };
      game.players[userId] = offline;
      if (disconnected && game.status === GameStatus.Lobby && userId !== game.hostId) {
        // A dropped connection can reclaim its lobby seat. A later disconnect
        // creates a new offline record and gets its own complete grace period.
        setTimeout(() => {
          if (getActiveGame(gameId) !== game || game.status !== GameStatus.Lobby ||
              game.players[userId] !== offline || offline.isConnected) return;
          delete game.players[userId];
          io.to(gameId).emit("game:playerLeft", { userId });
        }, LOBBY_RECONNECT_MS).unref();
      }
    } else {
      delete game.players[userId];
    }
    socket.to(gameId).emit("game:playerLeft", { userId, retained: keepSeat });
  }

  function leave(gameId: string, disconnected = false) {
    if (latestAdmission?.gameId === gameId) latestAdmission = null;
    if (!socket.rooms.has(gameId)) return;
    const watching = socket.rooms.has(`${gameId}_spectators`);
    notifyDeparture(gameId, watching, disconnected);
    if (!disconnected) {
      const anotherTab = roomConnections(io, gameId).some(member => member.id !== socket.id && member.data.userId === userId);
      if (!anotherTab) revokeRoomAccess(gameId, userId);
      socket.leave(gameId);
      if (watching) socket.leave(`${gameId}_spectators`);
    }
    if (currentRoom === gameId) currentRoom = null;
  }

  socket.on("game:leave", ({ gameId }) => leave(gameId));
  socket.on("disconnecting", () => {
    latestAdmission = null;
    if (currentRoom) leave(currentRoom, true);
  });

  return {
    begin(gameId: string) {
      const request = { gameId };
      latestAdmission = request;
      return () => latestAdmission === request;
    },
    async enter(gameId: string, watching: boolean) {
      if (currentRoom && currentRoom !== gameId) leave(currentRoom);
      const watcherRoom = `${gameId}_spectators`;
      const previouslyWatching = socket.rooms.has(watcherRoom);
      if (socket.rooms.has(gameId) && previouslyWatching !== watching) {
        notifyDeparture(gameId, previouslyWatching, false);
      }
      const alreadyPresent = roomConnections(io, gameId).some(member =>
        member.data.userId === userId && member.rooms.has(watcherRoom) === watching);
      await socket.join(gameId);
      if (watching) await socket.join(watcherRoom);
      else if (previouslyWatching) await socket.leave(watcherRoom);
      currentRoom = gameId;
      if (watching && !alreadyPresent) {
        io.to(gameId).emit("game:spectatorJoined", { spectatorId: userId, spectatorCount: watchers(gameId).size });
      }
      return !alreadyPresent;
    },
  };
}

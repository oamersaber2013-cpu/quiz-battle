import type { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@quiz-battle/shared";

export function roomConnections(io: Server<ClientToServerEvents, ServerToClientEvents>, gameId: string) {
  const ids = io.sockets.adapter.rooms.get(gameId) ?? [];
  return Array.from(ids).flatMap(id => {
    const socket = io.sockets.sockets.get(id);
    return socket ? [socket] : [];
  });
}

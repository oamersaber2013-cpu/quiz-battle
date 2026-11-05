import { FastifyPluginAsync } from "fastify";
import { getSavedGameResults } from "../lib/gamePersistence";
import { getActiveGame } from "../lib/gameOrchestrator";
import type { JWTPayload } from "./auth";

export const resultsRouter: FastifyPluginAsync = async app => {
  app.get<{ Params: { gameId: string } }>("/:gameId", { onRequest: [app.authenticate] }, async (req, reply) => {
    reply.header("Cache-Control", "no-store");
    const viewerId = (req.user as Partial<JWTPayload> | undefined)?.userId;
    if (!viewerId) return reply.status(401).send({ error: "Unauthorized" });
    const { gameId } = req.params;
    if (!/^[A-Za-z0-9_-]{1,64}$/.test(gameId)) return reply.status(400).send({ error: "Invalid game ID" });
    try {
      const saved = await getSavedGameResults(gameId, viewerId);
      if (saved.status === "forbidden") return reply.status(403).send({ error: "Only game participants can view these results" });
      if (saved.status === "found") return reply.send(saved.data);
      // A failed/pending write is distinct from a room that never completed.
      const active = getActiveGame(gameId);
      if (active?.finalResults) {
        if (active.hostId !== viewerId && !active.players[viewerId])
          return reply.status(403).send({ error: "Only game participants can view these results" });
        return reply.header("Retry-After", "5").status(503).send({ error: "Completed results are not saved yet. Please retry." });
      }
      return reply.status(404).send({ error: "Completed game results not found" });
    } catch (error) {
      req.log.error({ err: error }, "Unable to load completed results");
      return reply.header("Retry-After", "5").status(503).send({ error: "Results are temporarily unavailable. Please retry." });
    }
  });
};

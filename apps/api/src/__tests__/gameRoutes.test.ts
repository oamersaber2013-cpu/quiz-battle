jest.mock("nanoid", () => ({ nanoid: () => "test-room" }));
jest.mock("@quiz-battle/db", () => ({ prisma: {} }));
jest.mock("../lib/gameOrchestrator", () => ({ getActiveGame: jest.fn(), setActiveGame: jest.fn() }));

import Fastify from "fastify";
import { gamesRouter } from "../routes/games";
import { getActiveGame } from "../lib/gameOrchestrator";

it("keeps room passwords and answer records out of the public room summary", async () => {
  (getActiveGame as jest.Mock).mockReturnValue({
    gameId: "private-room", password: "hidden-password", players: {},
    questions: [{ correctAnswer: "hidden-answer" }], answersThisRound: { player: { answer: "secret" } },
    lastAnswerByPlayer: { player: true },
  });
  const app = Fastify();
  app.decorate("authenticate", async () => {});
  await app.register(gamesRouter, { prefix: "/api/games" });
  try {
    const response = await app.inject({ method: "GET", url: "/api/games/private-room" });
    expect(response.statusCode).toBe(200);
    const data = response.json();
    for (const key of ["password", "questions", "answersThisRound", "lastAnswerByPlayer"]) expect(data).not.toHaveProperty(key);
  } finally { await app.close(); }
});

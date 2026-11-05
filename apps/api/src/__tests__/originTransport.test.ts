import Fastify from "fastify";
import cors from "@fastify/cors";
import { createServer } from "http";
import { AddressInfo } from "net";
import { Server } from "socket.io";
import { createOriginPolicy } from "../lib/originPolicy";

const allowed = createOriginPolicy({ NODE_ENV: "production", FRONTEND_URL: "https://battle.example.test" });

it("permits the configured HTTP frontend preflight without reflecting an untrusted origin", async () => {
  const app = Fastify();
  await app.register(cors, { origin: (origin, cb) => cb(null, allowed(origin)), credentials: true });
  app.get("/health", async () => ({ status: "ok" }));
  try {
    const accepted = await app.inject({ method: "OPTIONS", url: "/health", headers: { origin: "https://battle.example.test", "access-control-request-method": "GET" } });
    expect(accepted.headers["access-control-allow-origin"]).toBe("https://battle.example.test");
    const rejected = await app.inject({ method: "GET", url: "/health", headers: { origin: "https://demo.ngrok-free.app.attacker.test" } });
    expect(rejected.headers["access-control-allow-origin"]).toBeUndefined();
  } finally { await app.close(); }
});

it("enforces the same origin policy on the actual Socket.IO handshake", async () => {
  const http = createServer();
  const io = new Server(http, {
    cors: { origin: (origin, cb) => cb(null, allowed(origin)) },
    allowRequest: (request, callback) => callback(null, allowed(request.headers.origin)),
  });
  await new Promise<void>(resolve => http.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(http.address() as AddressInfo).port}/socket.io/?EIO=4&transport=polling`;
  try {
    const accepted = await fetch(url, { headers: { origin: "https://battle.example.test" } });
    expect(accepted.status).toBe(200);
    expect(accepted.headers.get("access-control-allow-origin")).toBe("https://battle.example.test");
    await accepted.text();
    const rejected = await fetch(url, { headers: { origin: "https://demo.ngrok-free.app.attacker.test" } });
    expect(rejected.status).toBe(403);
    await rejected.text();
  } finally { await new Promise<void>(resolve => io.close(() => resolve())); }
});

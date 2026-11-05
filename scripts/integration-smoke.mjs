// Opt-in, disposable database/API smoke. See scripts/INTEGRATION.md.
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { startNativePostgres } from "./native-postgres.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const backend = process.env.INTEGRATION_DB || "pglite";
assert.ok(["pglite", "native"].includes(backend), "INTEGRATION_DB must be pglite or native");
const runtime = backend === "native" ? process.env.NATIVE_POSTGRES_TEST_RUNTIME : process.env.PGLITE_TEST_RUNTIME;
if (!runtime) throw new Error(`Set ${backend === "native" ? "NATIVE_POSTGRES_TEST_RUNTIME" : "PGLITE_TEST_RUNTIME"} to the separate pinned runtime folder. See scripts/INTEGRATION.md.`);
const runtimeRequire = createRequire(path.join(path.resolve(runtime), "package.json"));
const require = createRequire(path.join(repo, "package.json"));
const { io: connect } = require("socket.io-client");
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const protectedPath = path.join(repo, "packages/db/prisma/dev.db");
const hashFile = async () => createHash("sha256").update(await readFile(protectedPath)).digest("hex");
const protectedHash = await hashFile();
const report = { status: "running", startedAt: new Date().toISOString(), backend, engine: null, runtime: {}, checks: [] };
const saveReport = async () => {
  if (process.env.INTEGRATION_REPORT) await writeFile(path.resolve(process.env.INTEGRATION_REPORT), JSON.stringify(report, null, 2) + "\n");
};
await saveReport();
const sockets = [];
const eventCleanups = new Set();
const completedMatches = [];
let api;
let apiLog = "";
let server;
let db;

async function freePort() {
  const socket = createServer();
  await new Promise((resolve, reject) => { socket.once("error", reject); socket.listen(0, "127.0.0.1", resolve); });
  const port = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  return port;
}

async function runNode(label, args, env) {
  const child = spawn(process.execPath, args, { cwd: repo, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  const capture = chunk => { output = (output + chunk).slice(-18000); };
  child.stdout.on("data", capture); child.stderr.on("data", capture);
  const timeout = setTimeout(() => child.kill(), 90000);
  const code = await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", resolve); });
  clearTimeout(timeout);
  assert.equal(code, 0, `${label} failed: ${output}`);
  // PGlite's wire multiplexer shares a backend session across CLI processes.
  // Reset disconnected clients' prepared names before the next CLI connects.
  // Native PostgreSQL discards them when its client session closes.
  if (!db.native) await db.exec("DEALLOCATE ALL");
  report.checks.push({ name: label, passed: true });
  console.log(`PASS ${label}`);
}

function event(socket, name, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const cleanup = () => { clearTimeout(timer); socket.off(name, onEvent); eventCleanups.delete(cleanup); };
    const onEvent = data => { cleanup(); resolve(data); };
    const timer = setTimeout(() => { cleanup(); reject(new Error(`Timed out waiting for ${name}`)); }, timeoutMs);
    eventCleanups.add(cleanup);
    socket.once(name, onEvent);
  });
}

async function request(base, method, route, body, token, expected = 200) {
  const response = await fetch(`${base}${route}`, {
    method, headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  assert.equal(response.status, expected, `${method} ${route}: ${JSON.stringify(data)}`);
  return data;
}

async function openSocket(base, identity) {
  const socket = connect(base, { transports: ["websocket"], reconnection: false, forceNew: true, auth: { token: identity.token } });
  sockets.push(socket);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Socket connection timed out")), 10000);
    socket.once("connect", () => { clearTimeout(timer); resolve(); });
    socket.once("connect_error", error => { clearTimeout(timer); reject(error); });
  });
  return socket;
}

async function startApi(env) {
  apiLog = "";
  api = spawn(process.execPath, ["--import", "tsx", path.join(repo, "apps/api/src/index.ts")], {
    cwd: repo, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
  });
  const capture = chunk => { apiLog = (apiLog + chunk).slice(-18000); };
  api.stdout.on("data", capture); api.stderr.on("data", capture);
  const base = `http://127.0.0.1:${env.PORT}`;
  let ready = false;
  for (let i = 0; i < 300; i++) {
    if (api.exitCode !== null || api.signalCode !== null) throw new Error(`API exited: ${apiLog}`);
    try { const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(500) }); if (response.ok) { ready = true; break; } } catch {}
    await delay(200);
  }
  assert.ok(ready, `API did not become ready: ${apiLog}`);
  return base;
}

async function stopApi() {
  if (api && api.exitCode === null && api.signalCode === null) {
    api.kill();
    await Promise.race([new Promise(resolve => api.once("exit", resolve)), delay(5000)]);
    assert.ok(api.exitCode !== null || api.signalCode !== null, "Temporary API did not stop");
  }
}

const ack = async (socket, name, data) => {
  const response = await socket.timeout(10000).emitWithAck(name, data);
  assert.equal(response.success, true, `${name}: ${JSON.stringify(response)}`);
  return response;
};

function assertPrivateQuestion(question) {
  assert.ok(question, "The client did not receive a current question");
  for (const key of Object.keys(question)) {
    assert.ok(!key.startsWith("correct") && key !== "acceptedAnswers", `Leaked answer metadata: ${key}`);
  }
}

async function playRound(base, host, guest, config) {
  const room = await request(base, "POST", "/api/games/", {
    mode: "classic", difficulty: config.difficulty || "master", rounds: 1,
    categories: [config.category], language: "ar",
    ...(config.password ? { isPrivate: true, password: config.password } : {}),
  }, host.token, 201);
  assert.equal((await request(base, "GET", `/api/games/join/${room.joinCode}`)).gameId, room.gameId);
  const first = await openSocket(base, host);
  const second = await openSocket(base, guest);
  try {
    await ack(first, "game:join", { gameId: room.gameId });
    if (config.password) {
      await request(base, "GET", `/api/games/${room.gameId}`, null, null, 401);
      await request(base, "GET", `/api/games/${room.gameId}`, null, config.outsider.token, 403);
      const missing = await second.timeout(10000).emitWithAck("game:join", { gameId: room.gameId });
      assert.equal(missing.success, false); assert.equal(missing.code, "PASSWORD_REQUIRED");
      const wrong = await second.timeout(10000).emitWithAck("game:join", { gameId: room.gameId, password: config.password.trim() });
      assert.equal(wrong.success, false); assert.equal(wrong.code, "INVALID_PASSWORD");
    }
    await ack(second, "game:join", { gameId: room.gameId, ...(config.password ? { password: config.password } : {}) });
    if (config.password) {
      const metadata = await request(base, "GET", `/api/games/${room.gameId}`, null, guest.token);
      assert.ok(!("password" in metadata) && !("passwordHash" in metadata));
      assert.ok(!JSON.stringify(metadata).includes(config.password.trim()), "Private room metadata exposed its password");
      await ack(second, "game:join", { gameId: room.gameId });
      const observer = await openSocket(base, config.outsider);
      const missing = await observer.timeout(10000).emitWithAck("game:spectate", { gameId: room.gameId });
      assert.equal(missing.success, false); assert.equal(missing.code, "PASSWORD_REQUIRED");
      await ack(observer, "game:spectate", { gameId: room.gameId, password: config.password });
      observer.disconnect();
      const reconnected = await openSocket(base, config.outsider);
      await ack(reconnected, "game:spectate", { gameId: room.gameId });
      reconnected.emit("game:leave", { gameId: room.gameId });
      await delay(100);
      reconnected.disconnect();
      const revoked = await openSocket(base, config.outsider);
      const denial = await revoked.timeout(10000).emitWithAck("game:spectate", { gameId: room.gameId });
      assert.equal(denial.success, false); assert.equal(denial.code, "PASSWORD_REQUIRED");
      revoked.disconnect();
    }
    const selecting = event(first, "game:powerUpSelectStart");
    await ack(first, "game:start", { gameId: room.gameId });
    await selecting;
    if (config.password) {
      const listing = await request(base, "GET", "/api/games/active");
      assert.ok(!listing.some(game => game.gameId === room.gameId), "A private room appeared in the public listing");
    }
    const firstQuestion = event(first, "game:question");
    const secondQuestion = event(second, "game:question");
    const firstEnd = event(first, "game:end", 45000);
    const secondEnd = event(second, "game:end", 45000);
    await ack(first, "game:confirmPowerUpSelection", { gameId: room.gameId });
    await ack(second, "game:confirmPowerUpSelection", { gameId: room.gameId });
    const [q1, q2] = await Promise.all([firstQuestion, secondQuestion]);
    assert.equal(q1.question.id, q2.question.id);
    assertPrivateQuestion(q1.question);
    assert.match(q1.question.text, /[\u0600-\u06ff]/);
    if (config.id) assert.equal(q1.question.id, config.id, "The deterministic fixture was not selected");
    if (config.type) assert.equal(q1.question.type, config.type);
    const stored = (await db.query('SELECT "correctAnswer" FROM "Question" WHERE id=$1', [q1.question.id])).rows[0];
    assert.ok(stored, "The live question did not come from the migrated database");
    const answer = config.answer ?? Number(stored.correctAnswer);
    const send = (socket, value) => socket.emit("player:answer", {
      gameId: room.gameId, questionId: q1.question.id,
      ...(config.legacy ? { answerIndex: value } : { answer: value }), timestamp: Date.now(),
    });

    if (config.malformed !== undefined) {
      send(first, config.malformed);
      await delay(100);
    }
    const syncEvent = event(first, "game:stateSync");
    await ack(first, "game:join", { gameId: room.gameId });
    const sync = (await syncEvent).room;
    assertPrivateQuestion(sync.currentQuestion);
    assert.equal(sync.selectedAnswer, null, "A malformed answer consumed the player's attempt");
    await delay(400);
    send(first, answer);
    await delay(100);
    const restoredEvent = event(first, "game:stateSync");
    await ack(first, "game:join", { gameId: room.gameId });
    const restored = (await restoredEvent).room;
    assertPrivateQuestion(restored.currentQuestion);
    assert.deepEqual(restored.selectedAnswer, typeof answer === "string" ? answer.trim() : answer, "Rejoin did not preserve the typed submitted answer");
    assert.equal("answersThisRound" in restored, false);
    assert.equal("lastAnswerByPlayer" in restored, false);
    send(second, config.wrong ?? answer);
    if (config.wrong !== undefined) send(second, answer);
    const [end1, end2] = await Promise.all([firstEnd, secondEnd]);
    assert.deepEqual(end1, end2);
    assert.equal(end1.results.length, 2);
    const hostResult = end1.results.find(player => player.userId === host.userId);
    const guestResult = end1.results.find(player => player.userId === guest.userId);
    assert.ok(hostResult.score > 0, "The correct typed answer did not award points");
    assert.equal(hostResult.correctAnswers, 1);
    assert.equal(hostResult.totalAnswers, 1);
    if (config.wrong !== undefined) {
      assert.equal(guestResult.score, 0, "A wrong answer was overwritten by a duplicate correct answer");
      assert.equal(guestResult.correctAnswers, 0);
      assert.equal(guestResult.totalAnswers, 1);
    } else assert.ok(guestResult.score > 0, "Correct database-backed answers did not award both players points");
    const completed = Number((await db.query('SELECT count(*) FROM "AnalyticsEvent" WHERE "eventType"=$1 AND "eventData" LIKE $2', ["game_completed", `%${room.gameId}%`])).rows[0].count);
    assert.equal(completed, 1, "Game completion did not persist its analytics event");
    report.checks.push({ name: config.name, passed: true });
    console.log(`PASS ${config.name}`);
    return { gameId: room.gameId, endedAt: Date.now(), results: end1.results };
  } finally {
    first.disconnect(); second.disconnect();
  }
}

try {
  const dbPort = await freePort();
  let databaseUrl;
  if (backend === "native") {
    const native = await startNativePostgres(runtime, dbPort, repo);
    ({ db, server } = native);
    databaseUrl = server.url;
    report.runtime = native.metadata;
    assert.equal((await db.query("SHOW fsync")).rows[0].fsync, "on");
    const { PrismaClient } = require("@prisma/client");
    const independent = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
    try {
      const primaryPid = (await db.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
      const otherPid = (await independent.$queryRawUnsafe("SELECT pg_backend_pid() AS pid"))[0].pid;
      assert.notEqual(primaryPid, otherPid, "Native clients unexpectedly shared one backend session");
    } finally { await independent.$disconnect(); }
    report.checks.push({ name: "native PostgreSQL fsync and independent backend sessions", passed: true });
    console.log("PASS native PostgreSQL fsync and independent backend sessions");
  } else {
    const { PGlite } = runtimeRequire("@electric-sql/pglite");
    const { PGLiteSocketServer } = runtimeRequire("@electric-sql/pglite-socket");
    db = await PGlite.create();
    server = new PGLiteSocketServer({ db, host: "127.0.0.1", port: dbPort, maxConnections: 10 });
    await server.start();
    databaseUrl = `postgresql://postgres:postgres@127.0.0.1:${dbPort}/postgres?sslmode=disable&connection_limit=1`;
    report.runtime.pglite = JSON.parse(await readFile(path.join(path.resolve(runtime), "node_modules/@electric-sql/pglite/package.json"), "utf8")).version;
  }
  report.engine = (await db.query("SELECT version()")).rows[0].version;
  const apiPort = await freePort();
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    JWT_SECRET: randomBytes(32).toString("hex"), NODE_ENV: "test", PORT: String(apiPort),
    QUIZ_INTEGRATION_DISPOSABLE: "1",
    REDIS_URL: "redis://127.0.0.1:1", OPENAI_API_KEY: "", HUGGINGFACE_API_TOKEN: "", SENTRY_DSN: "",
  };
  if (backend === "native") delete env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK;
  else env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK = "1";
  const prismaCli = path.join(repo, "node_modules/prisma/build/index.js");
  const schema = path.join(repo, "packages/db/prisma/schema.prisma");
  await runNode("apply repository migrations", [prismaCli, "migrate", "deploy", "--schema", schema], env);
  await runNode("migration deploy is idempotent", [prismaCli, "migrate", "deploy", "--schema", schema], env);
  await runNode("seed actual bilingual questions", ["--import", "tsx", path.join(repo, "packages/db/prisma/seed.ts")], env);
  const seedCount = Number((await db.query('SELECT count(*) FROM "Question"')).rows[0].count);
  assert.ok(seedCount > 0, "The seed wrote no questions");
  await runNode("seed is repeatable", ["--import", "tsx", path.join(repo, "packages/db/prisma/seed.ts")], env);
  assert.equal(Number((await db.query('SELECT count(*) FROM "Question"')).rows[0].count), seedCount);
  report.seededQuestions = seedCount;
  report.appliedMigrations = Number((await db.query('SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL')).rows[0].count);
  await runNode("durable result writes are idempotent", ["--import", "tsx", "--eval", `
    const { saveGameSession } = require('./apps/api/src/lib/gamePersistence.ts');
    const { prisma } = require('@quiz-battle/db');
    if (process.env.QUIZ_INTEGRATION_DISPOSABLE !== '1') throw Error('Disposable runner required');
    const result = { gameId:'integration-idempotent-results',hostId:'integration-host',joinCode:'REPLAY',mode:'classic',difficulty:'scholar',language:'ar',totalRounds:1,
      players:[{userId:'integration-host',username:'Host',score:100,rank:1,correctAnswers:1,totalAnswers:1,avgAnswerTime:500,xpEarned:0},
      {userId:'integration-player',username:'Player',score:0,rank:2,correctAnswers:0,totalAnswers:1,avgAnswerTime:500,xpEarned:0}] };
    (async()=>{ await saveGameSession(result); await saveGameSession(result); })()
      .catch(error=>{ console.error(error);process.exitCode=1; }).finally(()=>prisma.$disconnect());
  `], env);
  assert.equal(Number((await db.query('SELECT count(*) FROM "GameSession" WHERE id=$1', ["integration-idempotent-results"])).rows[0].count), 1);
  assert.equal(Number((await db.query('SELECT count(*) FROM "PlayerGameStat" WHERE "gameSessionId"=$1', ["integration-idempotent-results"])).rows[0].count), 2);

  let base = await startApi(env);
  const host = await request(base, "POST", "/api/auth/guest", {});
  const guest = await request(base, "POST", "/api/auth/guest", {});
  assert.notEqual(host.userId, guest.userId);
  const account = { username: "IntegrationPlayer", email: "integration@example.test", password: "TestOnlyPassword19!" };
  const registered = await request(base, "POST", "/api/auth/register", account, null, 201);
  const loggedIn = await request(base, "POST", "/api/auth/login", { email: account.email, password: account.password });
  assert.equal(loggedIn.userId, registered.userId);
  const refreshed = await request(base, "POST", "/api/auth/refresh", {}, loggedIn.token);
  assert.equal(refreshed.userId, loggedIn.userId);
  assert.equal((await request(base, "GET", "/api/auth/me", null, loggedIn.token)).userId, loggedIn.userId);
  const users = (await db.query('SELECT "passwordHash", "hasPurchasedGame", "shortGamesRemaining", "longGamesRemaining" FROM "User" WHERE email=$1', [account.email])).rows;
  assert.ok(users[0].passwordHash && users[0].passwordHash !== account.password);
  assert.equal(users[0].hasPurchasedGame, false);
  assert.equal(users[0].shortGamesRemaining, 0);
  assert.equal(users[0].longGamesRemaining, 0);
  const outsider = await request(base, "POST", "/api/auth/guest", {});
  report.checks.push({ name: "guest, registration, login, refresh and persisted account defaults", passed: true });
  console.log("PASS guest, registration, login, refresh and persisted account defaults");

  completedMatches.push(await playRound(base, host, guest, {
    name: "two signed players complete a seeded Arabic round with legacy numeric answers",
    category: "science", difficulty: "scholar", legacy: true,
  }));
  const fixtures = [
    {
      id: "integration-fill-blank", type: "fill_blank", category: "integration_fill_blank",
      textEn: "The capital of Egypt is [BLANK].", textAr: "عاصمة مصر هي [BLANK].",
      optionsEn: [], optionsAr: [], persisted: { en: ["Cairo"], ar: ["القاهرة", "القاهره"] },
      answer: "  القاهره  ", wrong: "الإسكندرية", malformed: { text: "القاهرة" },
    },
    {
      id: "integration-multi-select", type: "multi_select", category: "integration_multi_select",
      textEn: "Select the even numbers.", textAr: "اختر الأعداد الزوجية.",
      optionsEn: ["Two", "Three", "Four"], optionsAr: ["اثنان", "ثلاثة", "أربعة"], persisted: [0, 2],
      answer: [2, 0], wrong: [0], malformed: [0, 0],
    },
    {
      id: "integration-ordering", type: "ordering", category: "integration_ordering",
      textEn: "Put the numbers in ascending order.", textAr: "رتب الأعداد تصاعدياً.",
      optionsEn: ["Two", "Three", "One"], optionsAr: ["اثنان", "ثلاثة", "واحد"], persisted: [2, 0, 1],
      answer: [2, 0, 1], wrong: [0, 1, 2], malformed: [2],
    },
  ];
  for (const fixture of fixtures) {
    await db.query('INSERT INTO "Question" (id, type, category, difficulty, "textEn", "textAr", "optionsEnJson", "optionsArJson", "correctAnswer", hash, "updatedAt") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,CURRENT_TIMESTAMP)', [
      fixture.id, fixture.type, fixture.category, "master", fixture.textEn, fixture.textAr,
      JSON.stringify(fixture.optionsEn), JSON.stringify(fixture.optionsAr), JSON.stringify(fixture.persisted), fixture.id,
    ]);
    completedMatches.push(await playRound(base, host, guest, {
      ...fixture, name: `${fixture.type}: malformed retry, typed scoring, duplicate protection and safe question sync`,
    }));
  }
  report.typedQuestionFixtures = fixtures.length;
  completedMatches.push(await playRound(base, host, guest, {
    name: "private room password, listing, participant and spectator grants",
    category: "science", difficulty: "scholar", legacy: true,
    password: "  Test Only Private Room 19!  ", outsider,
  }));
  const expired = completedMatches[0];
  await delay(Math.max(0, expired.endedAt + 31000 - Date.now()));
  await request(base, "GET", `/api/games/${expired.gameId}`, null, host.token, 404);
  const saved = await request(base, "GET", `/api/results/${expired.gameId}`, null, host.token);
  assert.deepEqual(saved.results, expired.results);
  assert.equal(saved.language, "ar");
  await request(base, "GET", `/api/results/${expired.gameId}`, null, null, 401);
  await request(base, "GET", `/api/results/${expired.gameId}`, null, outsider.token, 403);
  await request(base, "GET", "/api/results/does-not-exist", null, host.token, 404);
  report.checks.push({ name: "participant-protected results survive in-memory expiry", passed: true });
  console.log("PASS participant-protected results survive in-memory expiry");
  await stopApi();
  if (backend === "native") await server.restart();
  else await db.exec("DEALLOCATE ALL");
  base = await startApi(env);
  for (const match of completedMatches) {
    const restored = await request(base, "GET", `/api/results/${match.gameId}`, null, guest.token);
    assert.deepEqual(restored.results, match.results);
    await request(base, "GET", `/api/results/${match.gameId}`, null, outsider.token, 403);
  }
  report.checks.push({ name: backend === "native" ? "results survive native PostgreSQL and API restart with outsider denial" : "results survive API restart with outsider denial", passed: true });
  console.log(`PASS ${report.checks.at(-1).name}`);
  report.completedMatches = completedMatches.length;
  report.protectedDatabaseSha256 = protectedHash;
  assert.equal(await hashFile(), protectedHash, "Tracked dev.db changed");
  report.checks.push({ name: "tracked dev.db remains unchanged", passed: true });
  report.limits = backend === "native"
    ? ["Native Windows PostgreSQL testing binary; not a hosted production deployment", "No SSL, HA, production load or Redis durability proof", "No payment or OAuth provider requests"]
    : ["PostgreSQL WASM/PGlite wire path; not native PostgreSQL deployment equivalence", "Disconnected CLI/API clients require DEALLOCATE ALL between phases because PGlite multiplexes one backend session", "One Prisma connection; no SSL, production concurrency or Redis durability proof", "No payment or OAuth provider requests"];
  report.status = "passed";
} catch (error) {
  report.status = "failed";
  report.error = error.message;
  console.error(error);
  if (apiLog) console.error("API tail:", apiLog);
  process.exitCode = 1;
} finally {
  try {
    for (const cleanup of eventCleanups) cleanup();
    sockets.forEach(socket => socket.disconnect());
    await stopApi();
    if (server) await server.stop();
    if (db) await db.close();
    assert.equal(await hashFile(), protectedHash, "Tracked dev.db changed during the integration run");
  } catch (error) {
    report.status = "failed";
    report.error = error.message;
    console.error(error);
    process.exitCode = 1;
  }
  report.completedAt = new Date().toISOString();
  await saveReport();
  console.log(JSON.stringify(report, null, 2));
}

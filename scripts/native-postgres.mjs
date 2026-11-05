import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { mkdtemp, readFile, realpath, rm, unlink, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

async function runBinary(file, args, timeoutMs = 90000) {
  const child = spawn(file, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  const capture = chunk => { output = (output + chunk).slice(-16000); };
  child.stdout.on("data", capture); child.stderr.on("data", capture);
  const timer = setTimeout(() => child.kill(), timeoutMs);
  let code;
  try {
    code = await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", resolve); });
  } finally { clearTimeout(timer); }
  assert.equal(code, 0, `${path.basename(file)} failed: ${output}`);
  return output.trim();
}

export async function startNativePostgres(runtimePath, port, repo) {
  assert.equal(process.platform, "win32", "The pinned native runtime currently targets Windows x64");
  assert.equal(process.arch, "x64");
  const runtime = await realpath(path.resolve(runtimePath));
  const packageRoot = path.join(runtime, "node_modules/@embedded-postgres/windows-x64");
  const info = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
  assert.equal(info.version, "18.6.0-beta.19", "Install the documented pinned native binary package");
  const binaries = await import(pathToFileURL(path.join(packageRoot, "dist/index.js")).href);
  const version = await runBinary(binaries.postgres, ["--version"]);
  const work = await mkdtemp(path.join(runtime, "cluster-"));
  const workReal = await realpath(work);
  const marker = randomBytes(24).toString("hex");
  const markerFile = path.join(work, "integration-owner.txt");
  const data = path.join(work, "data");
  const passwordFile = path.join(work, "password.txt");
  const password = randomBytes(32).toString("hex");
  const logFile = path.join(work, "postgres.log");
  await writeFile(markerFile, marker, { mode: 0o600 });
  await writeFile(passwordFile, password, { mode: 0o600 });
  let started = false;
  let prisma;
  const options = `-p ${port} -h 127.0.0.1 -c max_connections=24 -c shared_buffers=16MB`;
  const start = async () => {
    await runBinary(binaries.pg_ctl, ["start", "-D", data, "-l", logFile, "-w", "-t", "60", "-o", options]);
    started = true;
  };
  const stop = async () => {
    if (!started) return;
    await runBinary(binaries.pg_ctl, ["stop", "-D", data, "-m", "fast", "-w", "-t", "30"], 45000);
    started = false;
  };
  try {
    await runBinary(binaries.initdb, ["-D", data, "--username=postgres", "--auth=scram-sha-256", `--pwfile=${passwordFile}`, "--no-locale", "--encoding=UTF8"]);
    await unlink(passwordFile);
    await start();
    const url = `postgresql://postgres:${password}@127.0.0.1:${port}/postgres?sslmode=disable&connection_limit=4`;
    const require = createRequire(path.join(repo, "package.json"));
    const { PrismaClient } = require("@prisma/client");
    prisma = new PrismaClient({ datasources: { db: { url } } });
    await prisma.$connect();
    const packageLock = JSON.parse(await readFile(path.join(runtime, "package-lock.json"), "utf8"));
    return {
      db: {
        native: true,
        query: async (sql, params = []) => ({ rows: await prisma.$queryRawUnsafe(sql, ...params) }),
        exec: sql => prisma.$executeRawUnsafe(sql),
        close: () => prisma.$disconnect(),
      },
      server: {
        native: true,
        url,
        restart: async () => { await prisma.$disconnect(); await stop(); await start(); await prisma.$connect(); },
        stop: async () => {
          await prisma.$disconnect();
          await stop();
          if (process.env.PRESERVE_INTEGRATION_DATABASE === "1") return;
          // Delete only the unique folder created by this invocation, after
          // resolving both paths and checking its unguessable ownership marker.
          assert.equal(path.dirname(workReal), runtime);
          assert.ok(path.basename(workReal).startsWith("cluster-"));
          assert.equal(await realpath(work), workReal);
          assert.equal(await readFile(markerFile, "utf8"), marker);
          await rm(workReal, { recursive: true, force: false });
        },
      },
      metadata: {
        binaryPackage: info.name, packageVersion: info.version, version,
        packageIntegrity: packageLock.packages["node_modules/@embedded-postgres/windows-x64"].integrity,
        postgresSha256: createHash("sha256").update(await readFile(binaries.postgres)).digest("hex"),
        provenance: "https://github.com/leinelissen/embedded-postgres (Zonky PostgreSQL testing binaries)",
        serviceInstalled: false, pathChanged: false,
      },
    };
  } catch (error) {
    await prisma?.$disconnect().catch(() => {});
    if (started) await stop().catch(() => {});
    await unlink(passwordFile).catch(() => {});
    throw new Error(`Native PostgreSQL setup failed; diagnostic folder: ${work}. ${error.message}`);
  }
}

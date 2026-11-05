# Disposable database/API integration smoke

The opt-in runner applies this repository's real Prisma migrations, runs the
bilingual seed twice, starts the real API, exercises guest/account
authentication and completes four one-round Arabic games with two real
Socket.IO clients. The seeded round checks legacy numeric clients; isolated
database fixtures check text, multi-select and ordering payloads. It does not
mock Prisma, API routes, question retrieval or transport.

Its database is an in-memory PostgreSQL WASM engine served through
[`@electric-sql/pglite-socket`](https://pglite.dev/docs/pglite-socket). The test
packages live in a separate scratch folder and are not application dependencies.
From a prepared checkout (`npm ci`, shared package built), run in PowerShell:

```powershell
npm run build -w @quiz-battle/shared
$runtime = Join-Path $env:TEMP 'sword-knowledge-integration-runtime'
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
npm install --prefix $runtime --save-exact @electric-sql/pglite@0.5.15 @electric-sql/pglite-socket@0.2.18 --no-audit --no-fund
$env:PGLITE_TEST_RUNTIME = $runtime
# Optional: save the result outside the source tree.
$env:INTEGRATION_REPORT = Join-Path $runtime 'result.json'
node scripts/integration-smoke.mjs
```

The runner selects unused local ports, overrides its child processes' database
URL and JWT secret, disables remote AI/telemetry keys, and closes the temporary
API and database. It verifies that the tracked `packages/db/prisma/dev.db`
SHA-256 is unchanged. No production database, service installation or `.env`
file is used as the test's database destination. Guest/account tokens and
passwords are not written to the result report.

The typed-answer matches verify that malformed submissions leave a valid retry
available, correct typed answers receive points, and a valid wrong answer cannot
be overwritten by a second submission. They also check that question broadcasts
and rejoin snapshots omit answer metadata, typed submitted answers survive a
rejoin, final answer counts match the actual attempts, and a game-completion
analytics event is persisted. Fixture insertion
happens only after the real seed's repeatability check.

## Boundaries

This is stronger than a persistence mock, and does **not** replace a native
PostgreSQL release check. PGlite multiplexes connections through one engine
session; the runner uses one Prisma connection and clears disconnected CLI
clients' prepared statements between phases to compensate for that difference.
Migration advisory locks are disabled for this isolated engine. The test does
not establish native connection isolation, migration-lock behavior, SSL,
production concurrency, Redis durability or multi-instance restart recovery.

The create-game credit bypass remains enabled in existing application code.
This test makes no payment or external OAuth provider requests, and completion
of an in-memory match does not establish persistent game-history support.

# Disposable database/API integration smoke

The opt-in runner applies this repository's real Prisma migrations, runs the
bilingual seed twice, starts the real API, exercises guest/account
authentication and completes five one-round Arabic games with two real
Socket.IO clients. The seeded round checks legacy numeric clients; isolated
database fixtures check text, multi-select and ordering payloads. It does not
mock Prisma, API routes, question retrieval or transport. It also exercises
password-protected room access and participant-protected saved results.

## Native PostgreSQL on Windows x64

This option starts native PostgreSQL 18.6 binaries from a separate scratch
runtime. It uses normal PostgreSQL sessions and Prisma migration advisory locks,
with `fsync` enabled. The binary package comes from the
[embedded-postgres maintainer](https://github.com/leinelissen/embedded-postgres)
and its [Zonky binary build project](https://github.com/zonkyio/embedded-postgres-binaries).
The runner records the package version, registry integrity and executable hash.

```powershell
npm run build -w @quiz-battle/shared
$runtime = Join-Path $env:TEMP 'sword-knowledge-native-runtime'
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
npm install --prefix $runtime --save-exact @embedded-postgres/windows-x64@18.6.0-beta.19 --ignore-scripts --no-audit --no-fund
$env:INTEGRATION_DB = 'native'
$env:NATIVE_POSTGRES_TEST_RUNTIME = $runtime
$env:INTEGRATION_REPORT = Join-Path $runtime 'native-result.json'
node scripts/integration-smoke.mjs
```

For this pinned Windows package, the inspected symlink manifest is empty, so no
post-install script is needed. Native processes run hidden, the database listens
only on loopback, and no Windows service, user account or PATH entry is created.
The runner creates a unique marked cluster folder and removes only that folder
after checking its resolved path and marker and stopping PostgreSQL. Set
`PRESERVE_INTEGRATION_DATABASE=1` to retain it for inspection. Setup failures
retain their diagnostic folder and stop any server that successfully started.

## PGlite alternative

Its database is an in-memory PostgreSQL WASM engine served through
[`@electric-sql/pglite-socket`](https://pglite.dev/docs/pglite-socket). The test
packages live in a separate scratch folder and are not application dependencies.
From a prepared checkout (`npm ci`, shared package built), run in PowerShell:

```powershell
npm run build -w @quiz-battle/shared
$runtime = Join-Path $env:TEMP 'sword-knowledge-integration-runtime'
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
npm install --prefix $runtime --save-exact @electric-sql/pglite@0.5.15 @electric-sql/pglite-socket@0.2.18 --no-audit --no-fund
$env:INTEGRATION_DB = 'pglite'
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

The private-room match verifies missing/wrong passwords, exact password spaces,
HTTP metadata protection, omission from public listings, spectator reconnect
grants and explicit leave revocation. Completed matches must be readable only
by their host/participants after the active room expires and the API restarts.
The native option additionally stops and starts PostgreSQL before reading those
results again. Repeated writes must retain one session and two standings.

## Boundaries

The native run is a local Windows integration check, not a hosted deployment,
SSL/HA/load test or Redis durability proof. The PGlite option is stronger than a
persistence mock and does **not** replace the native check. It multiplexes connections through one engine
session; the runner uses one Prisma connection and clears disconnected CLI/API
clients' prepared statements between phases to compensate for that difference.
Migration advisory locks are disabled for this isolated engine. The test does
not establish native connection isolation, migration-lock behavior, SSL,
production concurrency, Redis durability or multi-instance restart recovery.

The create-game credit bypass remains enabled in existing application code.
This test makes no payment or external OAuth provider requests. Saved results
are tested for completed standard matches; full active-match restart recovery
and end-to-end Conquest/Chaos integration checks remain separate work.

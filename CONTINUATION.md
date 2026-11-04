# Sword of Knowledge continuation - 4 November 2026

This continuation starts from GitHub `main` commit `4547a7b` in a fresh checkout.
The older status/launch documents describe earlier work; they are not evidence
that the current game has been deployed or fully verified.

## Changes

- Lobby and game routes restore room membership after a reload or reconnect.
  The server restores the current question, original clock, the viewer's own
  answer and power-up choices. Spectators reconnect as spectators.
- Fixed Time Warp's disappearing extension, the power-up confirmation echo
  undoing a local selection, and Conquest's loading-to-game React hook crash.
- Socket identities now come from signed JWTs. Invasion controls require the
  host; answers and territory actions require participation in the room.
- Invasion accepts one bounded answer before its deadline, prevents overlapping
  round starts and excess picks, and clears tracked timers on removal.
- Conquest reserves forts during the draft, keeps fort health capped, uses
  server answer timing and finishes the draft immediately after the last pick.
  Country ownership, language, difficulty and categories survive transition.
- Database questions use the persisted `correctAnswer`, stable question IDs
  and separate language/topic caches. Optional caching uses the existing
  Redis fallback instead of opening a second unbounded Redis connection.
- Guest and account JWTs share the same configuration, including values loaded
  from the API's environment file.
- Added the missing User battle-credit columns and an additive PostgreSQL
  migration. Repaired seed/worker schema fields and enum values.
- A failed scheduled leaderboard refresh is caught and retried at its next
  interval instead of terminating the API process.
- Builds fail on TypeScript errors. API, web, worker, DB and shared checks are
  runnable; placeholder frontend assertions were replaced with real regressions.

## Verification

- `npm test`: 55 passed (39 API and 16 web), including four real Socket.IO
  transport tests and a React loading/reloading lifecycle test.
- `npm run typecheck`: all workspace checks passed.
- `npm run build`: all production build tasks passed.
- Production-backed Playwright: six checks passed across desktop and mobile
  Chromium, covering the creation wizard, Arabic/RTL persistence and join codes.
- PostgreSQL Prisma schema validation passed. The compiled API served HTTP 200
  for `/health` and the Socket.IO handshake. Background database-outage handling
  is verified with a deterministic failing-then-passing regression.

See [TESTING.md](TESTING.md) for repeatable commands and test boundaries.

## Remaining integration work

No hosted deployment or production database was changed. The new migration and
seed need an isolated PostgreSQL integration run before release. Redis fallback
and in-memory game state are not proof of multi-instance/restart recovery.

Real payment verification and OAuth provider verification remain unfinished;
the existing game-creation credit bypass was preserved. Full text/multi-select
answer contracts, completed-result reload and complete Chaos-state recovery
remain outside this change. Hosted frontend CORS configuration also needs a
deployment check. Browser smoke tests do not prove a complete paid multiplayer
match. Question content and media still need their own editorial verification.

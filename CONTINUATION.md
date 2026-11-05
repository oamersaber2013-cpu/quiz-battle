# Sword of Knowledge continuation - 5 November 2026

Draft PR #1 continues from main commit `4547a7b`. Nothing has been merged or
deployed. Older launch/status documents are historical, not current release proof.

## Gameplay and reliability

The 4 November pass fixed room recovery, Conquest's React hook crash, Time Warp,
power-up echoes, fort drafting, Invasion permissions/timers, missing credit
columns, masked build failures and a crashing background leaderboard refresh.

The 5 November pass fixes the next gameplay gap: text, multi-select and ordering
submissions previously became option zero. Classic, Survival and Custom now
carry the actual string or complete index array to server-side validation and
scoring. Malformed submissions do not consume the answer; a valid first answer
cannot be replaced. Text comparison normalizes case, Unicode and whitespace;
multi-select compares sets, and ordering compares the entire permutation.

Question and reconnect payloads now explicitly allow presentation fields and
exclude answer keys, accepted alternatives and explanations. Correct-answer
feedback is sent at reveal. Reconnection restores the viewer's actual answer
and reveal feedback; finished results restore while the ended room is retained.
Bots score once, and final answer counts/timing use real scoring history.
Numeric-only Chaos, Conquest and Invasion request compatible question types.

## HTTP and authentication

HTTP and Socket.IO share exact configured frontend origins; hosted FRONTEND_URL
is honored, development loopback ports work, and arbitrary ngrok-looking
hostnames are not trusted. Production JWT signing requires a unique secret.
Public room summaries no longer return room passwords.

Auth inputs are validated before database access. Opaque passwords and provider
tokens are preserved through sanitization. Google sign-in requires a verified
ID token and configured audience; caller-supplied profile IDs cannot create a
session. Facebook sign-in returns unavailable until its provider-verification
flow exists. See [AUTH_CONFIGURATION.md](AUTH_CONFIGURATION.md).

## Verification on the final source

- 123 regression tests passed: 85 API and 38 web. An additional API run with
  `--runInBand --detectOpenHandles` passed all 85 and exited cleanly.
- Workspace typecheck: 6/6 tasks; production build: 4/4 tasks.
- Production-backed Playwright: 6/6 desktop/mobile Chromium checks covering the
  creation wizard, Arabic/RTL persistence and join-code validation.
- Isolated integration: both real Prisma migrations, repeat deployment, repeat
  bilingual seed, guest/account auth, room creation and four Arabic matches.
  The matches cover legacy numeric, text/alias, multi-select and ordering answers
  with real Prisma/API/Socket.IO paths. They check scoring, malformed retries,
  first-answer locking, private keys, reconnect state and completion analytics.
- Tracked `packages/db/prisma/dev.db` SHA-256 stayed unchanged. No production
  database or `.env` destination was used for the integration test.

The integration engine is PostgreSQL 18.6 through PGlite WASM. It is not a native
PostgreSQL release check: one backend session, prepared-statement resets between
CLI phases and disabled advisory locks are explicit limitations. See
[scripts/INTEGRATION.md](scripts/INTEGRATION.md) and [TESTING.md](TESTING.md).

## Remaining release work

Native PostgreSQL concurrency/migration locks, durable Redis and multi-instance
restart recovery still need hosted checks. Real payment/credit enforcement is
unfinished; the existing create-game credit bypass remains. Google provider
credentials and a frontend sign-in flow need live verification; Facebook remains
disabled. Full Chaos-state recovery and persistent result/history reload after
an ended room expires remain outside this pass. Private-room password enforcement
and question/media editorial review also require separate work.

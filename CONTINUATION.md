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
and reveal feedback. Completed results now persist in PostgreSQL and load through
an authenticated participant/host endpoint after room expiry and server restart.
Bots score once, and final answer counts/timing use real scoring history.
Numeric-only Chaos, Conquest and Invasion request compatible question types.

Private rooms now enforce exact passwords for players and spectators, rate-limit
failed attempts, and preserve approved signed identities across reconnects.
Passwords are hashed outside serialized game state and remain outside browser
storage. Private rooms are omitted from public listings; private summaries require
authenticated admission. Hosts can create them through the bilingual wizard.

Results saves are atomic and repeatable, with an additive migration for host,
language and avatar. Failed writes are marked pending, retried three times and
retained in memory for at most two hours. The results page reloads from the API
and distinguishes authorization, missing results and temporary failures.
Conquest/Invasion completion also saves territory standings; its untracked quiz
counts are not presented as measured statistics.

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

- 166 regression tests passed: 112 API and 54 web.
  The final API run with its two-worker limit exited cleanly without a worker warning.
- Workspace typecheck: 6/6 tasks; production build: 4/4 tasks.
- Production-backed Playwright: 10/10 desktop/mobile Chromium checks, including
  saved-result reload and private-room creation. Browser API fixtures are separate
  from the real database/transport checks below.
- Native PostgreSQL 18.6 on Windows x64: 15 integration check groups passed.
  Three real Prisma migrations, repeat deployment/seed, guest/account auth,
  repeatable result saves and five two-player Arabic matches passed. Matches cover
  numeric, text/alias, multi-select, ordering and private-room entry. Missing/wrong
  passwords, exact spaces, spectator grants, metadata privacy, result authorization
  and scoring are checked. Saved results survived room expiry, API restart and
  native PostgreSQL restart; unrelated users remained denied.
- PGlite alternative: 14 integration check groups passed, including API restart.
- Tracked `packages/db/prisma/dev.db` SHA-256 stayed unchanged. No production
  database or `.env` destination was used for the integration test.

The native runner uses independent PostgreSQL sessions, fsync and normal migration
advisory locks. It installs no service or PATH entry and removes only its marked
scratch cluster after stopping the server. The optional PGlite runner still has
single-session/prepared-statement/advisory-lock limitations. See
[scripts/INTEGRATION.md](scripts/INTEGRATION.md) and [TESTING.md](TESTING.md).

## Remaining release work

Hosted PostgreSQL TLS/HA/load behavior, durable Redis and multi-instance
active-match restart recovery still need deployment checks. Real payment/credit enforcement is
unfinished; the existing create-game credit bypass remains. Google provider
credentials and a frontend sign-in flow need live verification; Facebook remains
disabled. Full Chaos-state recovery, complete multi-round browser Conquest/Chaos
matches and question/media editorial review remain separate release work.

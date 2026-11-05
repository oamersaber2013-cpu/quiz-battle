# Local verification

Use Node.js 20.9 or newer. From the repository root:

```sh
npm ci
npm exec -w web -- playwright install chromium
npm run typecheck
npm test
npm run build
```

`typecheck` covers the API, web, shared types, workers, DB wrapper and DB seed.
Shared declarations are built before dependent checks. Web route types are
generated before its TypeScript check. Production builds fail on compiler
errors; source files are never copied into `dist` as a fallback.
API Jest uses at most two workers to bound TypeScript transpilation memory on
Windows and CI; no forced-exit option hides teardown problems.

On Windows, `npm run test:all` runs these checks followed by the browser suite.
To run the browser suite separately against the production build in PowerShell:

```powershell
$env:PLAYWRIGHT_USE_BUILD = '1'
npm run test:e2e -w web -- --workers=2
```

Without `PLAYWRIGHT_USE_BUILD`, Playwright starts the development frontend.
The suite uses its own port (3100), refuses to reuse an existing server, and
checks desktop Chromium and mobile Chromium. Set `PLAYWRIGHT_PORT` to choose a
different port, or `PLAYWRIGHT_BASE_URL` to use an already running frontend.

API regression tests exercise the actual orchestrators with deterministic
question and persistence stubs. Socket transport tests use real local
Socket.IO clients. Web regression tests cover room recovery and restored state.
Browser smoke checks cover the creation wizard, Arabic language persistence,
RTL layout and join-code validation. They do not create a paid game or make a
payment, and are not proof of a deployed multiplayer service.

Database setup is separate and requires an isolated PostgreSQL database:

```sh
npm run migrate:deploy
npm run seed
```

Set `DATABASE_URL` for that isolated database before either command. Seeding
upserts the existing bilingual question dataset and does not delete records.
The opt-in `npm run test:integration` supports native PostgreSQL on Windows x64
and a separate PGlite runtime. It applies the real migrations/seed and runs actual
Prisma/auth/Socket.IO flows, including five Arabic matches, private-room
admission, saved-result access after expiry and API/database restart. See
[scripts/INTEGRATION.md](scripts/INTEGRATION.md) for runtime setup and engine
limitations. It preserves the tracked local DB and uses no production destination.

Hosted PostgreSQL TLS/HA/load behavior, live OAuth/payment-provider verification,
production Redis and deployed active-match recovery require separate release checks.

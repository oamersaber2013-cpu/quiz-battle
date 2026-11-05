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
The opt-in `npm run test:integration` uses a separate PGlite runtime to apply the
real migrations/seed and run actual Prisma/auth/Socket.IO flows, including four
Arabic matches with numeric, text, multi-select and ordering answers. See
[scripts/INTEGRATION.md](scripts/INTEGRATION.md) for runtime setup and engine
limitations. It preserves the tracked local DB and uses no production destination.

Native PostgreSQL, live OAuth/payment-provider verification, production Redis
and deployed multi-instance behavior require separate release checks.

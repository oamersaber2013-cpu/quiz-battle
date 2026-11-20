# Publish Sword of Knowledge on Railway

Use the existing [Railway project](https://railway.com/project/69ccea59-310d-4d10-b068-46e9de09647d)
and its production Postgres and Redis services. Railway reported an expired
trial on 17 November 2026. An active plan is required before deployment.
Check that the existing volume contents or backups are available when Postgres
and Redis come online. Volume listings alone do not verify stored data.

## Service settings

Both application services build from the repository root and track the
`main` branch. Use the Docker image's default start command.

| Service | Dockerfile | Port | Health check |
| --- | --- | --- | --- |
| API | `Dockerfile.api` | `4000` | `/health` |
| Web | `Dockerfile.web` | `8000` | `/` |

- API `FRONTEND_URL` is `https://web-production-126d2.up.railway.app`
  and `NODE_ENV` is `production`. Keep the existing `JWT_SECRET` if it meets
  the production requirements. Use the retained project's `DATABASE_URL` and
  `REDIS_URL`. Store credentials only in Railway.
- Web `NEXT_PUBLIC_API_URL` is `https://api-production-1eb9.up.railway.app`.
  Next.js uses it during the build for both HTTP and Socket.IO.
- Keep one API replica while active match state lives in that process.

## Release and verify

1. Start the existing data services and verify Postgres has the expected
   database and migration history. Take a backup of retained production data
   before applying migrations. If Prisma reports an unexpected schema or
   migration history, inspect it before proceeding.
2. Promote the reviewed commit to `main` and follow both Railway deployments
   through a successful build and start. The API startup runs Prisma
   `migrate deploy` before it serves requests. The API can use its bundled
   questions so startup requires no seed write.
3. Check the web home page, the API health endpoint, the exact production CORS
   origin, and the Socket.IO connection. Create a test room with two browser
   sessions, play through to results, and reload the authenticated results page.
   Verify the published URLs and commit after the test.

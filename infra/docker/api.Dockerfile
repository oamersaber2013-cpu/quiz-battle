FROM node:20-alpine AS base

FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
# Install turbo globally
RUN npm install -g turbo
COPY . .
# Prune to only the API app and its dependencies
RUN turbo prune --scope=api --docker

FROM base AS installer
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/package-lock.json ./package-lock.json
RUN npm ci

COPY --from=builder /app/out/full/ .
# Generate prisma client
RUN cd packages/db && npx prisma generate
RUN npm run build --filter=api...

FROM base AS runner
WORKDIR /app
# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 apiuser
USER apiuser

COPY --from=installer /app .
WORKDIR /app/apps/api

EXPOSE 4000
CMD ["npm", "run", "start"]

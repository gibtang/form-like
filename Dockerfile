# Multi-stage build using Next.js standalone output (apps/web/next.config.mjs).
FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app

# pnpm workspace: copy manifests first for layer caching.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile

COPY tsconfig.base.json ./
COPY apps/web apps/web
RUN pnpm --filter @formlike/web build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0

RUN addgroup -S formlike && adduser -S formlike -G formlike

COPY --from=builder --chown=formlike:formlike /app/apps/web/.next/standalone ./
COPY --from=builder --chown=formlike:formlike /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=formlike:formlike /app/apps/web/public ./apps/web/public

USER formlike
EXPOSE 3000
CMD ["node", "apps/web/server.js"]

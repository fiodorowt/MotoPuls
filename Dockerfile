# syntax=docker/dockerfile:1

# ---------- zależności ----------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
# postinstall generuje klienta Prisma (nie wymaga połączenia z bazą)
RUN npm ci

# ---------- build (ten etap służy też do migracji i seeda) ----------
FROM deps AS builder
WORKDIR /app
COPY . .
# Klucz publiczny Turnstile trafia do kodu przeglądarki w czasie budowania (opcjonalny).
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=""
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
RUN npm run build

# ---------- obraz produkcyjny ----------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOAD_DIR=/app/uploads

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
RUN mkdir -p /app/uploads && chown node:node /app/uploads

USER node
EXPOSE 3000
VOLUME ["/app/uploads"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]

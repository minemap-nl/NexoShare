# ---------------------------------------
# STAGE 1: Frontend Bouwen
# ---------------------------------------
FROM oven/bun:1 AS frontend-builder
WORKDIR /app/frontend

RUN apt-get update \
  && apt-get upgrade -y --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# Kopieer package files
COPY frontend/package.json frontend/bun.lock ./
# Installeer dependencies
RUN bun install --frozen-lockfile

# Kopieer broncode en bouw
COPY frontend/ .
RUN bun run build

# ---------------------------------------
# STAGE 2: Backend & Final Runs
# ---------------------------------------
FROM oven/bun:1-alpine
WORKDIR /app/backend

# Tijdzone data (vaak nodig) + OS patches
RUN apk update && apk upgrade --no-cache \
  && apk add --no-cache tzdata

# Kopieer backend package config + dedupe-script (nodig voor postinstall)
COPY backend/package.json backend/bun.lock ./
COPY backend/scripts/dedupe-peculiar.mjs ./scripts/dedupe-peculiar.mjs

# Installeer productie dependencies
RUN bun install --frozen-lockfile --production

# Kopieer broncode (Bun voert TS direct uit, dus geen build stap nodig)
COPY backend/src ./src
COPY backend/scripts ./scripts
COPY backend/tsconfig.json ./

# Kopieer de gebouwde frontend assets naar de juiste plek relatief aan backend
COPY --from=frontend-builder /app/frontend/dist ../frontend/dist

# Maak de upload map aan en zet rechten (Bun image gebruikt user 'bun' met id 1000)
RUN mkdir -p uploads && chown -R bun:bun /app

# Environment defaults
ENV TZ=UTC
ENV NODE_ENV=production
ENV PORT=3000

# Schakel over naar de veilige 'bun' gebruiker
USER bun

EXPOSE 3000

# Start de applicatie
CMD ["bun", "src/index.ts"]
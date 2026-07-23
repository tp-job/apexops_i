# Build context MUST be the repo root (see docker-compose.yml), because the
# Prisma schema now lives outside this package at database/prisma/. We mirror
# the monorepo layout inside the image so the package.json `prisma.schema` path
# (../../database/prisma/schema.prisma) resolves in-container exactly as in dev.

FROM node:20-alpine AS build
WORKDIR /repo/app/server
# Schema + manifests first for better layer caching.
COPY app/server/package*.json ./
COPY database/prisma /repo/database/prisma
RUN npm ci --ignore-scripts
COPY app/server/ ./
RUN npx prisma generate && npm run build

FROM node:20-alpine AS run
WORKDIR /repo/app/server
ENV NODE_ENV=production
COPY app/server/package*.json ./
RUN npm ci --omit=dev --ignore-scripts
# Bring the generated Prisma Client over from the build stage.
COPY --from=build /repo/app/server/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /repo/app/server/dist ./dist
EXPOSE 3000
CMD ["node", "dist/server.js"]

# 웹(Next.js) 운영 이미지. 이 PC에서 빌드하고 VM에는 이미지만 올림 (작은 VM에서 빌드하지 않음, CLAUDE.md 13절)
# 빌드: docker build -t squad-web apps/web

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build

FROM node:22-bookworm-slim AS run
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/* \
  && npm install -g prisma@6.19.3 && npm cache clean --force
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 AUDIO_DIR=/data/audio
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/prisma ./prisma
RUN mkdir -p /data/audio && chown -R node:node /data /app
USER node
EXPOSE 3000
# 시작할 때마다 밀린 마이그레이션을 적용 (이미 적용된 것은 건너뜀)
CMD ["sh", "-c", "prisma migrate deploy --schema prisma/schema.prisma && node server.js"]

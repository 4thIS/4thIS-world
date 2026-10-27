# syntax=docker/dockerfile:1
# 4thIS-world: 컨테이너 1개, 프로세스 1개 (Fastify + Socket.IO + 웹 정적 파일)

# 1) 모든 의존성 설치 + 웹 빌드
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
# better-sqlite3는 prebuilds를 패키지에 담아 오므로 빌드 스크립트가 필요 없다 (python·make 없이 설치)
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build -w @4this/web

# 2) 서버 실행에 필요한 의존성만 (개발 도구·웹 라이브러리 제외)
FROM node:24-bookworm-slim AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN npm ci --ignore-scripts --omit=dev -w @4this/server

# 3) 런타임: 서버 + shared 소스 + 웹 dist, tsx로 바로 실행
FROM node:24-bookworm-slim
ENV NODE_ENV=production \
    PORT=8080 \
    DB_PATH=/data/world.db \
    WEB_DIST=/app/apps/web/dist
WORKDIR /app
COPY --from=prod-deps /app ./
COPY tsconfig.base.json ./
COPY packages/shared/tsconfig.json packages/shared/
COPY packages/shared/src packages/shared/src
COPY apps/server/tsconfig.json apps/server/
COPY apps/server/src apps/server/src
COPY --from=build /app/apps/web/dist apps/web/dist
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]
CMD ["node", "--import", "tsx", "apps/server/src/main.ts"]

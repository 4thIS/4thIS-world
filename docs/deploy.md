# 배포·운영

4thIS-world는 **컨테이너 1개, 프로세스 1개**로 돈다. 서버(Fastify + Socket.IO)가 웹 빌드(`apps/web/dist`)도 같이 서빙하고, 데이터는 볼륨 안의 SQLite 파일 `world.db` 하나다. 접속자·조종 상태는 메모리에만 있으므로 컨테이너를 여러 개 띄우지 않는다.

## 준비

- Docker Engine 24 이상 + Docker Compose v2 (`docker compose version`)
- 이 저장소

## 처음 실행

```bash
cp .env.example .env
# .env를 열어 ADMIN_PASSWORD와 SESSION_SECRET을 채운다
# SESSION_SECRET 만들기:
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"

docker compose up -d --build
docker compose ps            # STATUS가 healthy가 될 때까지 기다린다
```

브라우저로 http://localhost:8080 을 연다. 관리자 화면은 관리자 비밀번호(`ADMIN_PASSWORD`)로 로그인한다.

| 환경변수         | 기본값 (이미지)      | 설명                                                                 |
| ---------------- | -------------------- | -------------------------------------------------------------------- |
| `ADMIN_PASSWORD` | 없음 (필수)          | 관리자 로그인 비밀번호. 없으면 서버가 시작하지 않는다                |
| `SESSION_SECRET` | 없음 (필수)          | 세션 쿠키 서명 키, 32자 이상 권장. 바꾸면 모든 로그인이 풀린다       |
| `PORT`           | `8080`               | 컨테이너 안 포트. compose를 쓰면 바꾸지 않는다                       |
| `DB_PATH`        | `/data/world.db`     | SQLite 파일 위치 (볼륨 `world-data`)                                 |
| `WEB_DIST`       | `/app/apps/web/dist` | 웹 빌드 폴더                                                         |
| `NODE_ENV`       | `production`         | `production`이면 쿠키에 `Secure`가 붙는다 (아래 "HTTPS" 참고)        |
| `TRUST_PROXY`    | 꺼짐                 | 리버스 프록시 뒤라면 `1`. 로그인 시도 제한이 실제 접속 IP로 동작한다 |
| `WEATHER_LAT`·`WEATHER_LON` | 명지전문대학 (37.5844, 126.9251) | 실시간 날씨(Open-Meteo)를 받을 좌표. 서버가 10분마다 받는다 |
| `WEATHER`        | 켜짐                 | `off`면 날씨를 받지 않고 늘 맑음 (`NODE_ENV=test`도 끔) |

### HTTPS와 쿠키

`NODE_ENV=production`이면 세션 쿠키에 `Secure`가 붙어서 **HTTPS 또는 `localhost`에서만** 로그인이 유지된다. 같은 공유기 안의 다른 PC에서 `http://192.168.x.x:8080`으로 시험할 때는 `.env`에 `NODE_ENV=development`를 넣고 `docker compose up -d`로 다시 띄운다. 외부에 공개할 때는 아래 nginx 예시처럼 HTTPS를 붙이고 `production`을 쓴다.

## 상태 확인과 로그

```bash
docker compose ps                    # healthy 여부 (30초마다 /api/health 확인)
docker compose logs -f world         # 서버 로그
curl http://localhost:8080/api/health   # {"ok":true}
```

## 업데이트

```bash
git pull
docker compose up -d --build         # 새 이미지로 바꿔 띄운다. 데이터 볼륨은 그대로
docker image prune -f                # 지난 이미지 정리 (선택)
```

DB 마이그레이션은 서버가 시작할 때 자동으로 돈다(`PRAGMA user_version`). 업데이트 전에 아래 방법으로 백업해 두면 안전하다.

## 백업

서버가 도는 중에도 SQLite 온라인 백업으로 일관된 파일을 받을 수 있다. 결과는 `world-YYYYMMDD.db`(한국 날짜) 파일 하나다.

**브라우저:** 관리자로 로그인 → 관리자 화면 → **백업** 버튼.

**curl:** 관리자 로그인 쿠키를 파일에 저장한 뒤 그 쿠키로 받는다. 로그인 시도는 IP당 분당 5회로 제한된다.

```bash
curl -c admin.cookies -H 'content-type: application/json' \
  -d '{"password":"<ADMIN_PASSWORD>"}' http://localhost:8080/api/auth/admin
curl -b admin.cookies -OJ http://localhost:8080/api/admin/backup   # world-YYYYMMDD.db 저장
rm admin.cookies
```

HTTPS 도메인 뒤라면 `http://localhost:8080` 자리에 `https://world.example.com`을 쓴다. 매일 받으려면 위 세 줄을 cron에 넣는다.

## 복원

1. 컨테이너를 멈춘다. 정상 종료하면 SQLite가 WAL을 정리해서 `world.db` 하나만 남는다.

   ```bash
   docker compose stop world
   ```

2. 백업 파일을 볼륨에 `world.db`라는 이름으로 넣는다. 볼륨 이름은 `4this-world_world-data`다(compose 프로젝트 이름 `4this-world` + `world-data`). 백업 파일이 있는 폴더에서 실행한다.

   ```bash
   docker run --rm -v 4this-world_world-data:/data -v "$PWD":/backup \
     --entrypoint cp 4this-world /backup/world-20261021.db /data/world.db
   ```

   볼륨에 `world.db-wal`·`world.db-shm`이 남아 있으면(비정상 종료 뒤) 먼저 지운다:

   ```bash
   docker run --rm -v 4this-world_world-data:/data --entrypoint ls 4this-world -la /data
   docker run --rm -v 4this-world_world-data:/data --entrypoint rm 4this-world \
     -f /data/world.db-wal /data/world.db-shm
   ```

3. 다시 띄운다.

   ```bash
   docker compose start world
   ```

Windows의 Git Bash에서는 경로가 바뀌지 않도록 명령 앞에 `MSYS_NO_PATHCONV=1`을 붙이고 `"$PWD"` 대신 `"$(pwd -W)"`를 쓴다. PowerShell은 그대로 `"$PWD"`를 쓴다.

## 리버스 프록시 (nginx, HTTPS)

Socket.IO가 WebSocket을 쓰므로 `Upgrade`·`Connection` 헤더를 넘겨야 한다. `.env`에 `TRUST_PROXY=1`을 넣어야 로그인 시도 제한이 프록시 IP가 아닌 실제 접속자 IP로 동작한다.

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

server {
    listen 443 ssl http2;
    server_name world.example.com;

    ssl_certificate     /etc/letsencrypt/live/world.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/world.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_read_timeout 120s;
    }
}

server {
    listen 80;
    server_name world.example.com;
    return 301 https://$host$request_uri;
}
```

프록시를 쓰면 compose의 포트를 바깥에 열 필요가 없다. `ports`를 `'127.0.0.1:8080:8080'`으로 바꾸면 같은 서버의 nginx만 접근할 수 있다.

## 문제 해결

| 증상                                      | 확인할 것                                                               |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| 컨테이너가 바로 꺼진다                    | `docker compose logs world`에 `ADMIN_PASSWORD 환경변수가 필요합니다` 등 |
| 로그인해도 새로고침하면 풀린다            | HTTP로 접속 중인데 `NODE_ENV=production` → HTTPS를 쓰거나 `development` |
| 접속자 목록·조종이 안 된다 ("재연결 중…") | 프록시가 WebSocket 헤더를 넘기는지 (`Upgrade`, `Connection`)            |
| 로그인이 계속 429                         | 프록시 뒤인데 `TRUST_PROXY=1`이 없어 모두가 같은 IP로 보임              |

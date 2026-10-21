# 4thIS-world 설계 문서

- 작성일: 2026-10-21
- 상태: 검토 대기
- 저장소: https://github.com/4thIS/4thIS-world
- 참여: 박찬우(`cw`) · 이우진(`wj`) · 박효민(`hm`) · 김태희(`th`)
- 참고 프로토타입: [`docs/prototype/preview-3d.html`](../../prototype/preview-3d.html) — 브레인스토밍 때 만든 일회성 미리보기. 분위기·캐릭터 조립·에셋 파스텔화의 **참고용**이며 코드를 그대로 가져가지 않는다.

---

## 1. 한 줄 소개

4thIS 동아리원이 **주간 시간표**와 **동물 캐릭터**를 등록하면, 파스텔 톤의 **3D 학교 캠퍼스**에서 캐릭터들이 **지금 한국 시각의 시간표대로** 강의실·연구실·식당·공원·카페를 오가는 실시간 웹. 로그인한 멤버는 자기 캐릭터를 직접 조종할 수 있고, 그 모습은 접속한 모두에게 실시간으로 보인다.

## 2. 목표와 범위

### 목표
- 시간표만 넣으면 캐릭터가 알아서 맞는 건물·층·자리로 간다.
- 언제 접속해도(오후 2시든 밤 11시든) 모든 사람의 화면에 **같은 장면**이 보인다.
- 캐릭터 꾸미기는 몇 번의 클릭으로 끝난다.
- 4명이 **인당 PR 3~4개**, 총 16개 PR로 완성한다(§12).

### 하지 않는 것
- 시간 슬라이더·타임랩스(실시간만 보여 준다)
- 날짜별 일정·공휴일(매주 반복 일정만)
- 채팅(이모지 반응만)
- 소셜 로그인, 다중 서버 확장

## 3. 확정된 결정 요약

| 항목 | 결정 |
|---|---|
| 기존 시간표 앱 | 참고만, 새로 만든다 |
| 렌더링 | 진짜 3D (Three.js, react-three-fiber) |
| 에셋 | 가구·소품은 CC0 에셋(Kenney Furniture Kit, KayKit City Builder Bits) + 파스텔화, 건물 껍데기·자연물·캐릭터는 코드로 조립 |
| 건물 | 공학관(3F) · 본관(3F) · 연구동(2F) · 카페(1F) + 공원 + 정문 |
| 건물 내부 보기 | 카메라 쪽 벽이 자동으로 투명해지는 컷어웨이 |
| 장소 결정 | 일정 **종류**가 장소를 정한다 (종류 1개 = 방 1개) |
| 시간 | 지금 한국 시각(Asia/Seoul)만 |
| 구경 | 누구나(로그인 불필요) |
| 가입 | 누구나 가입 → **관리자 승인** 후 월드에 등장 |
| 직접 조종 | 로그인 멤버가 자기 캐릭터를 조종, **모두에게 실시간으로 보임** |
| 소셜 | 접속자 목록 + 이모지 반응 |
| 스택 | React + Vite + react-three-fiber + drei + zustand / Node + Fastify + Socket.IO + SQLite(better-sqlite3) / TypeScript 전체 |
| 배포 | Docker 컨테이너 1개 + 볼륨 |
| 분위기 | 부드럽고 귀여운 파스텔 |

## 4. 전체 구조

**원칙: "이 시각에 이 사람은 어디에 있나"는 모든 브라우저가 같은 규칙으로 직접 계산한다. 서버는 저장·인증·실시간 중계만 한다.**

```
4thIS-world/                       npm workspaces 모노레포
├─ packages/shared/                서버·클라이언트 공용, 순수 TS (DOM·Node API 금지)
│   └─ src/
│       ├─ schema/                 zod 스키마 + 타입 (REST · 소켓 메시지 단일 정의)
│       ├─ campus/                 맵 데이터: 장소·층·좌석·문·경로 그래프 좌표
│       ├─ placement/              시간표 + 시각 → 위치/행동 계산 엔진
│       └─ time.ts                 KST 변환, 30분 슬롯 유틸
├─ apps/server/                    Fastify + Socket.IO + SQLite
│   └─ src/{db,auth,routes,realtime,config}
├─ apps/web/                       React + Vite + R3F
│   └─ src/
│       ├─ world/campus/           지형·길·자연물·건물·컷어웨이·가구·하늘
│       ├─ world/characters/       동물 조립·악세서리·포즈·이름표·이모지 말풍선
│       ├─ world/sim/              placement 실행, 이동 보간, 조종, 카메라 추적
│       ├─ ui/                     오버레이·가입·꾸미기·시간표·관리자 화면
│       ├─ api/                    REST 클라이언트, 소켓 클라이언트
│       └─ store/                  zustand 스토어
├─ e2e/                            Playwright
├─ docs/
├─ Dockerfile · docker-compose.yml · .env.example
└─ CREDITS.md                      에셋 출처
```

## 5. 캠퍼스

### 5.1 배치 (약 50×50 m, 프로토타입의 면적 4배)

```
            북
  ┌──────────────────────────────────────┐
  │  [연구동 2F]          [  본관 3F  ]    │
  │                      3F 도서관        │
  │                      2F 교양강의실     │
  │      🌳🌳            1F 식당          │
  │                         │             │
  │  🌸 공원 🌸  ────── ( 광장 ) ────── [공학관 3F]
  │   연못  벤치            │           3F 3학년
  │                         │           2F 2학년
  │  [카페 1F] 테라스        │           1F 1학년
  │                    📋게시판            │
  └──────────────[ 정문 아치 ]─────────────┘
            남
```

- 정문 → 광장 큰길, 광장에서 각 건물로 갈라지는 길.
- 이동은 **경로 그래프**(길목 노드 + 간선)를 따른다. 자동 이동 캐릭터는 잔디를 가로지르지 않는다.
- 조종 중인 캐릭터는 자유 이동하되 건물 벽·연못·맵 경계는 통과하지 못한다(간단한 AABB/원 충돌).

### 5.2 장소와 좌석

| 장소 ID | 건물·층 | 꾸밈 | 좌석 | 넘칠 때 |
|---|---|---|---|---|
| `eng-1f` / `eng-2f` / `eng-3f` | 공학관 1·2·3F | 칠판·교탁·2열×3줄 책상·자리마다 노트북 또는 PC·"n학년" 표지판 | 6 | 뒤쪽 스탠딩 지점 |
| `lab-2f` | 연구동 2F | 큰 사각 테이블+노트북 6대, 책장 파티션, 건너편 교수님 책상 | 6 | 책장 옆 스탠딩 |
| (`lab-1f`) | 연구동 1F | 불 꺼진 로비, 사용 안 함 | - | - |
| `main-1f` | 본관 1F 식당 | 배식대·4인 테이블 4개·식판 | 16 | 배식대 줄 |
| `main-2f` | 본관 2F 교양강의실 | 칠판·큰 강의실 | 12 | 뒤쪽 스탠딩 |
| `main-3f` | 본관 3F 도서관 | 책장·열람 테이블·스탠드 | 8 | 책장 사이 스탠딩 |
| `cafe` | 카페 1F | 카운터·커피머신·2인 테이블 4개 + 테라스 | 8 | 테라스 6 → 스탠딩 |
| `park` | 공원 | 연못·벤치·꽃밭 | 산책 지점 N개 | - |
| `gate` | 정문 + 게시판 | 아치, "4thIS 캠퍼스" 간판, 외부 일정 게시판 | - | - |

### 5.3 건물 (코드로 모듈 조립)
- 바닥판·벽·창문·문·계단을 코드로 조립한다. 층 높이는 3.2 m이고, 지붕 없이 옥상 난간만 둔다.
- **컷어웨이**: 매 프레임 카메라 방향과 각 벽의 바깥 법선을 비교해, 카메라 쪽을 향한 벽(내적 > 0.3)을 투명도 0.1까지 부드럽게(0.25초) 낮추고 테두리선만 남긴다.
- 건물을 클릭하면 카메라가 그 건물로 다가가고, 층 버튼으로 위층을 숨길 수 있다. "지금 이 건물에 있는 사람" 목록도 함께 뜬다.
- 출입 연출: 문까지 걷기 → 0.3초 페이드 → 목표 층 계단참에서 나타나 자리로 걷기.

### 5.4 에셋과 꾸밈
- 가구: Kenney Furniture Kit(CC0). 바깥 소품: KayKit City Builder Bits(CC0).
- 원색 텍스처는 로드할 때 캔버스에서 **채도 35% 낮추고 크림빛(255,238,245)과 50% 섞어** 파스텔로 바꾼다(프로토타입에서 검증).
- 나무·꽃밭·연못·정문·보도블록·풀잎은 코드로 만들고 InstancedMesh로 그린다.
- 에셋은 레포 `apps/web/public/assets/`에 복사해 둔다(CDN 의존 없음). 출처는 `CREDITS.md`에 남긴다.

### 5.5 하늘과 조명 (실제 시각 기준)
- 06–09 복숭아빛 아침 / 09–17 하늘색 낮 / 17–19 분홍·보라 노을 / 19–06 남색 밤. 구간 경계는 30분에 걸쳐 보간한다.
- 밤에는 사람이 있는 층의 창문이 발광하고 가로등이 켜진다.

### 5.6 성능 목표
- 일반 노트북 브라우저에서 캐릭터 30명 기준 60 fps.
- 그림자는 해(directional) 1개만 쓰고, 풀·꽃·보도블록·나무는 인스턴싱한다.

## 6. 캐릭터

### 6.1 생김새 (코드로 조립, 뼈대 없음)
- 동물: `dog` · `cat` · `bear` · `duck`. `lion`은 교수님 NPC 전용이라 학생은 고를 수 없다.
- 몸 색: 동물별 기본색 + 파스텔 8색(`pink`, `mint`, `sky`, `lavender`, `lemon`, `peach`, `cream`, `gray`)
- 악세서리는 부위 3칸으로, 동시에 조합할 수 있다.

| 부위 | 값 |
|---|---|
| `head` | `none`, `strawHat`, `beanie`, `ribbon`, `cap` |
| `eyes` | `none`, `glasses`, `sunglasses` |
| `neck` | `none`, `scarf`, `bowtie` |

### 6.2 포즈와 애니메이션
| 포즈 | 동작 |
|---|---|
| `idle` | 숨쉬기, 두리번 |
| `walk` | 통통 튀기, 팔 흔들기, 발 번갈아 |
| `sitType` | 앉아서 노트북 타이핑, 가끔 고개 들기 |
| `sitEat` | 앉아서 숟가락질 |
| `sitRead` | 책 읽기, 페이지 넘기기 |
| `sitSip` | 컵 들고 홀짝 |
| `sitRest` | 벤치에 앉아 쉬기 |
| `stand` | 서서 살짝 흔들 |

공통으로 눈 깜빡임, 꼬리 흔들기를 넣는다.

### 6.3 머리 위 표시
- 이름표 `철수 · 2학년 강의`. 거리에 따라 전체 → 이름만 → 숨김.
- 이모지 말풍선: 8종(👋 ❤️ 😂 👍 😮 😴 🎉 ☕)이 튀어나왔다가 3초 뒤 사라진다.
- 내 캐릭터는 발밑에 링을 띄운다.

### 6.4 사자 교수님 NPC
- 평일 09:00–18:00에 `lab-2f` 교수님 책상에서 `sitType`. 가끔 기지개를 켠다. 그 밖의 시간에는 빈 책상이다.
- 클릭하면 말풍선 한 줄("오늘도 연구 열심히!" 등 몇 개 중 하나)을 띄운다.

## 7. 하루 흐름 (placement 엔진)

`packages/shared/src/placement`의 순수 함수다. **같은 입력이면 어디서 계산해도 같은 결과**가 나와야 한다. 랜덤은 모두 `hash(문자열)` 기반 결정적 값으로 만든다.

### 7.1 시간표 데이터
- `{ day: 0..6 (월=0), start: "HH:MM", end: "HH:MM", kind, title? }`
- 30분 단위, 06:00–24:00이다. 같은 멤버의 일정은 겹칠 수 없다.
- `kind`와 장소 매핑:

| kind | 장소 | 포즈 | 이름표 |
|---|---|---|---|
| `lecture1` | `eng-1f` | `sitType` | 1학년 강의 |
| `lecture2` | `eng-2f` | `sitType` | 2학년 강의 |
| `lecture3` | `eng-3f` | `sitType` | 3학년 강의 |
| `liberal` | `main-2f` | `sitType` | 교양 강의 |
| `research` | `lab-2f` | `sitType` | 연구 중 |
| `library` | `main-3f` | `sitRead` | 도서관 |
| `external` | (캠퍼스 밖, 게시판) | - | - |

강의 계열(`lecture*`, `liberal`)에 `title`이 있으면 이름표에 `2학년 강의 · 자료구조`처럼 붙인다.

### 7.2 상태 결정 규칙 (멤버 1명, 날짜 D, 시각 t)
"캠퍼스 일정" = `external`이 아닌 일정.

1. 그날 일정이 없으면 → **부재**.
2. **등교**: 첫 캠퍼스 일정 시작 **5분 전**에 정문에 나타나 목적지로 걷는다. 단, 그보다 앞에 외부 일정이 있으면 **첫 캠퍼스 일정 직전의 외부 일정이 끝나는 시각**에 정문으로 들어온다(그 사이는 빈 시간 규칙을 따른다).
3. **캠퍼스 일정 중** → 해당 장소의 좌석(§7.4).
4. **외부 일정 중** → 정문으로 걸어가서 사라진다. 게시판에 `🦆 지우 · 알바 (~18:00)`처럼 표시한다(`title`이 없으면 "외부 일정"). 끝나면 정문으로 다시 들어온다. 그날 남은 캠퍼스 일정이 없으면 다시 들어오지 않는다.
5. **빈 시간**(캠퍼스에 있는 동안 일정 사이):
   - 다음 일정까지 **20분 미만** → 다음 장소의 건물 입구에서 `stand`.
   - 빈 시간이 11:30–13:30과 겹치면 점심 구간 = `[max(빈시작, 11:30), min(빈끝, 13:30, max(빈시작, 11:30) + 60분))` → `main-1f` 식당, `sitEat`.
   - 나머지 → 공원 또는 카페. `hash(memberId + 날짜) % 2`로 그날 하루 동안 고정한다.
   - 이렇게 나눈 조각 중 **10분 미만**인 것은 바로 앞 조각에 붙인다(첫 조각이면 뒤 조각에 붙인다).
   - 다음 일정이 외부 일정이면 빈 시간 규칙을 그대로 따르고, 외부 일정 시작 시각에 정문으로 출발한다.
6. **하교**: 마지막 캠퍼스 일정이 끝나면 정문으로 걸어가 사라진다.
7. 승인되지 않은 멤버는 계산에서 뺀다.

**예시: 지우의 수요일** (09–12 `lecture1`, 13–15 `external` "알바", 16–18 `research`)
```
08:55 정문 등장 → 09:00 eng-1f 2번 자리 → 12:00 main-1f 식당 → 13:00 정문 퇴장(게시판)
→ 15:00 정문 입장 → 공원 또는 카페 → 16:00 lab-2f → 18:00 정문으로 하교
```

### 7.3 이동
- 장소가 바뀌는 순간(구간 경계)에 출발해서 경로 그래프의 최단 경로(다익스트라, 결과 캐시)를 1.5 m/s로 걷는다.
- 위치는 `(출발 시각, 경로, t)`만으로 정해지는 **t의 함수**다. 처음 접속한 시점과 상관없이 같은 장면이 나온다.

### 7.4 좌석 배정
- 같은 장소·같은 요일의 일정 구간들을 **(시작 시각, memberId)** 순으로 정렬한 뒤, 그 구간 동안 비어 있는 가장 앞 번호 좌석을 준다(구간 색칠).
- 한 구간 동안 좌석은 바뀌지 않는다. 좌석이 모자라면 장소별 넘침 지점(§5.2)을 같은 규칙으로 배정한다.
- 식당·카페·공원 같은 "빈 시간 장소"도 그 구간을 같은 방식으로 다룬다.

### 7.5 공원
- 2분 칸마다 `hash(memberId, 날짜, 칸)`으로 다음 산책 지점을 고른다. 3번 중 1번꼴로 벤치나 연못가 지점을 골라 `sitRest`를 한다.

### 7.6 엔진 인터페이스
```ts
// packages/shared/src/placement/index.ts
export function computeDay(input: {
  members: MemberForPlacement[];   // 승인된 멤버 + 시간표
  date: string;                     // "2026-10-21" (KST)
  campus: Campus;
}): DayPlan;                        // 멤버별 구간 목록 (장소·좌석·경로·포즈·시각)

export function sampleAt(plan: DayPlan, memberId: string, t: number /* KST ms */): Pose | null;
// Pose = { position: [x, y, z]; facing: number; pose: PoseKind; placeId: PlaceId | 'transit';
//          floor?: number; status: string /* 이름표 문구 */ } | null(부재)

export function boardAt(plan: DayPlan, t: number): BoardEntry[]; // 정문 게시판
```
`DayPlan`은 날짜와 시간표가 바뀔 때만 다시 계산하고, 매 프레임에는 `sampleAt`만 호출한다.

## 8. 서버

### 8.1 데이터 (SQLite)
```sql
members (
  id TEXT PRIMARY KEY,          -- nanoid
  username TEXT UNIQUE NOT NULL, -- 표시 이름 겸 로그인 아이디, 2–12자
  password_hash TEXT NOT NULL,  -- bcrypt, 비밀번호 6자 이상
  status TEXT NOT NULL,         -- 'pending' | 'approved' | 'rejected'
  look TEXT NOT NULL,           -- JSON {animal, color, head, eyes, neck}
  created_at INTEGER NOT NULL
)
schedules (
  id TEXT PRIMARY KEY, member_id TEXT REFERENCES members ON DELETE CASCADE,
  day INTEGER, start TEXT, end TEXT, kind TEXT, title TEXT
)
sessions (id TEXT PRIMARY KEY, member_id TEXT, is_admin INTEGER, expires_at INTEGER)
settings (key TEXT PRIMARY KEY, value TEXT)
```

### 8.2 REST (`/api`, 요청·응답은 모두 shared zod 스키마로 검증)
| 메서드·경로 | 권한 | 설명 |
|---|---|---|
| `GET /world` | 누구나 | 승인 멤버의 `{id, username, look, schedules}` 전체와 서버 시각 |
| `GET /auth/session` | 누구나 | 지금 세션 (`guest` / `member` / `admin`) |
| `POST /auth/signup` | 누구나 | 가입 → `pending`, 바로 로그인 세션 발급 |
| `POST /auth/login` · `POST /auth/logout` | 누구나 | httpOnly 쿠키 세션(30일) |
| `POST /auth/admin` | 누구나 | `ADMIN_PASSWORD`로 관리자 세션 |
| `GET /me` · `PATCH /me` | 본인 | 내 정보, `look` 수정, 비밀번호 변경 |
| `GET/PUT /me/schedules` | 본인 | 내 시간표 통째로 교체(겹치면 409) |
| `DELETE /me` | 본인 | 탈퇴 |
| `GET /admin/members` | 관리자 | 전체(대기 포함) |
| `POST /admin/members/:id/approve` · `/reject` | 관리자 | 승인·거절 |
| `PATCH/DELETE /admin/members/:id` | 관리자 | 수정·삭제·비밀번호 초기화 |
| `GET /admin/backup` | 관리자 | SQLite 온라인 백업 파일 다운로드 |

승인 대기 멤버도 자기 `look`과 시간표는 편집할 수 있다. `GET /world`에는 나오지 않는다.

### 8.3 실시간 (Socket.IO, 이벤트 타입은 shared에 정의)
| 방향 | 이벤트 | 내용 |
|---|---|---|
| S→C | `presence` | `{members: {id, controlling}[], spectators: number}`, 변동 시 전송 |
| S→C | `world:changed` | 누군가 시간표·look을 바꾸거나 승인됨 → 클라이언트가 `GET /world` 재요청 |
| C→S | `control:start` · `control:stop` | 조종 시작·해제(승인된 본인만) |
| C→S | `control:move` | `{x, z, facing, moving}`, 초당 최대 15회, 맵 범위로 자름 |
| S→C | `control:state` | 조종 중인 멤버들의 위치, 10 Hz 묶음 |
| S→C | `control:released` | 60초 무입력·해제·연결 끊김 → 클라이언트는 placement로 걸어서 복귀 |
| C→S / S→C | `emote` | `{memberId, emoji}`, 멤버당 초당 1회 |
| S→C | `time` | 접속 시 서버 시각(클라이언트 시계 보정) |

- 조종권은 멤버당 하나이고, 마지막으로 `control:start`를 보낸 소켓이 가진다.
- 접속자 정보는 메모리에만 둔다. 그래서 프로세스는 1개다.

### 8.4 보안·운영
- 시작 조건: `ADMIN_PASSWORD`와 `SESSION_SECRET`이 없으면 서버가 시작하지 않는다.
- 로그인·관리자 로그인 시도: IP당 분당 5회.
- 쿠키: `httpOnly`, `sameSite=lax`, 프로덕션은 `secure`.

## 9. 화면

```
┌────────────────────────────────────────────────────────┐
│ 🐾 4thIS-world  수 14:10 ☀️          [로그인] [가입] │
│                                       ┌──────────────┐ │
│                                       │ 접속 중 4     │ │
│          (3D 캠퍼스)                  │ 🐶 철수 공강  │ │
│                                       │ 🦆 지우 🎮조종│ │
│                                       │ 👀 구경 중 2  │ │
│                                       └──────────────┘ │
│        [ 🎮 조종하기 ]  👋 ❤️ 😂 👍 😮 😴 🎉 ☕        │
└────────────────────────────────────────────────────────┘
```
- **메인**: 월드 전체 화면 + 반투명 파스텔 카드 오버레이. 접속자 패널은 접을 수 있고, 이름을 누르면 카메라가 그 캐릭터로 간다. 조종 바와 이모지 바는 승인된 로그인 멤버에게만 보인다.
- **가입 흐름**: 가입 → 꾸미기 → 시간표. 승인 전에는 상단에 "관리자 승인 대기 중" 배너를 띄운다.
- **꾸미기**: 천천히 도는 3D 미리보기 + 칩 버튼 + 🎲 랜덤. 가입할 때 랜덤 조합을 기본값으로 넣는다.
- **내 시간표**: 월~일 × 06–24 주간 격자에서 드래그로 생성·이동·길이 조절. 종류는 색 칩으로 고르고, 겹치면 빨갛게 표시한다. 모바일에서는 목록 + 폼.
- **관리자**: 승인 대기(배지), 멤버 관리, 백업.
- **모바일**: 드래그 회전, 핀치 확대, 탭한 곳으로 이동해 조종. 접속자 패널은 하단 시트.
- **조종**: 데스크톱은 WASD·방향키 또는 바닥 클릭. 조종 중에는 카메라가 따라간다. `자동으로` 버튼으로 해제.

## 10. 오류 처리

| 상황 | 동작 |
|---|---|
| 소켓 끊김 | 월드는 계속 움직인다(로컬 계산). "재연결 중…" 배지, 자동 재연결, 조종·이모지만 비활성 |
| 에셋 로딩 실패 | 해당 모델을 단순 상자로 대체. 첫 로딩은 진행률 화면 |
| 잘못된 요청 | zod 검증 실패 400, 일정 겹침 409(겹치는 일정 정보 포함), 권한 없음 401/403 |
| WebGL 미지원 | 안내 + "누가 어디 있나" 텍스트 목록(`sampleAt` 결과) |
| 시계 어긋남 | 접속 시 `time` 이벤트로 오프셋 보정 |

## 11. 테스트와 CI

| 대상 | 도구 | 핵심 케이스 |
|---|---|---|
| placement | vitest | 등교 5분 전, 외부 일정 출입·게시판, 20분 미만 빈 시간, 점심 60분 상한, 공원/카페 고정, 좌석 안정성·넘침, 결정성(두 번 계산 동일), KST 자정 경계, 사자 교수님 시간 |
| 서버 REST | vitest + `fastify.inject` | 가입→승인 흐름, 권한 표(구경꾼/본인/남/관리자), 일정 겹침 409, 백업, 필수 환경변수 |
| 실시간 | vitest + socket.io-client | presence 집계, 마지막 탭 조종권, 60초 해제, 이모지·이동 횟수 제한, `world:changed` |
| 웹 UI | vitest + React Testing Library | 시간표 격자 드래그 로직, 꾸미기 폼, 가입 폼 검증 |
| 3D | vitest(순수 로직만) + Playwright 스크린샷 | 컷어웨이 벽 선택 함수, 하늘 색 보간 함수, 캔버스 렌더 스모크 |
| E2E | Playwright | 가입 → 관리자 승인 → 캐릭터 등장 → 조종 → **두 번째 브라우저에서 움직임 확인** |

CI(GitHub Actions, PR마다): `typecheck` → `lint` → `test` → `docker build`. 모두 통과해야 머지할 수 있다.

## 12. 협업 계획

### 12.1 사람과 브랜치
| 브랜치 | 담당 | 역할 한 줄 |
|---|---|---|
| `cw` | 박찬우 | 뼈대·공용 계약·placement 엔진·월드 시뮬레이션·실시간 클라이언트·E2E (통합 책임) |
| `wj` | 이우진 | 서버 전부: DB·인증·승인·API·Socket.IO·Docker |
| `hm` | 박효민 | 캠퍼스 3D: 지형·자연물·건물·컷어웨이·가구·하늘·조명·맵 좌표 데이터 |
| `th` | 김태희 | 캐릭터 3D + 화면 UI: 동물·악세서리·포즈·이름표, 가입·꾸미기·시간표·관리자·오버레이 |

### 12.2 파일 소유 (충돌 방지, `.github/CODEOWNERS`로 강제)
| 경로 | 소유 |
|---|---|
| 루트 설정, `packages/shared/src/{schema,placement,time.ts}`, `apps/web/src/{world/sim,store,api}`, `e2e/`, `.github/` | `cw` |
| `apps/server/**`, `Dockerfile`, `docker-compose.yml`, `.env.example` | `wj` |
| `packages/shared/src/campus/**`, `apps/web/src/world/campus/**`, `apps/web/public/assets/**`, `CREDITS.md` | `hm` |
| `apps/web/src/world/characters/**`, `apps/web/src/ui/**` | `th` |

다른 사람 소유 파일을 고쳐야 하면 그 사람에게 리뷰를 받는다. `packages/shared/src/schema`(공용 계약)를 바꾸는 PR은 **4명 모두에게 알린다**.

### 12.3 모듈 사이 계약 (cw#1에서 먼저 고정)
```ts
// shared/schema — 데이터 계약
type Animal = 'dog' | 'cat' | 'bear' | 'duck';            // lion은 NPC 전용
type Look = { animal; color; head; eyes; neck };           // §6.1 값
type Kind = 'lecture1' | 'lecture2' | 'lecture3' | 'liberal' | 'research' | 'library' | 'external';
type ScheduleItem = { day: 0..6; start: 'HH:MM'; end: 'HH:MM'; kind: Kind; title?: string };
// + REST 요청/응답, 소켓 이벤트 페이로드 (§8.2, §8.3)

// shared/campus — hm이 채우고 cw의 placement가 읽는다
type Campus = {
  places: Record<PlaceId, { building: BuildingId; floor: number; door: NodeId;
                            seats: Seat[]; overflow: Seat[] }>;   // Seat = {pos, facing}
  graph: { nodes: Record<NodeId, [x, z]>; edges: [NodeId, NodeId][] };
  gate: NodeId; parkSpots: Seat[]; benchSpots: Seat[];
  colliders: Collider[];                                        // 조종 충돌용
};

// web/world/characters — th가 만들고 cw의 sim이 쓴다
<Character look={Look | {animal:'lion', ...}} pose={PoseKind}
           name="철수" status="2학년 강의" emote={Emote | null}
           highlight={boolean} ref={Object3D ref /* sim이 위치·방향을 매 프레임 설정 */} />

// web/world/campus — hm이 만들고 cw가 배치한다
<Campus occupiedFloors={Set<string>} onBuildingClick={(id) => void}
        focusedBuilding={BuildingId | null} hiddenAboveFloor={number | null} />
// 좌석 좌표(shared/campus)와 실제 가구 위치가 일치해야 한다 → hm 책임
```
UI 조각(접속자 패널, 이모지 바, 조종 버튼, 게시판 패널)은 th가 **props만 받는 표시용 컴포넌트**로 만들고, cw가 스토어와 소켓에 연결한다.

### 12.4 PR 목록 (총 16개, 인당 4개)

| # | 브랜치 | PR | 선행 |
|---|---|---|---|
| 1 | `cw` | **cw#1 뼈대와 계약**: 모노레포·TS·ESLint·Prettier·vitest·CI·CODEOWNERS·PR 템플릿, shared 스키마·소켓 이벤트 타입·`Campus` 타입과 임시 데이터, 웹/서버 빈 앱 | - |
| 2 | `cw` | **cw#2 placement 엔진**: §7 전체 + 테스트, `computeDay`/`sampleAt`/`boardAt` | cw#1 |
| 3 | `cw` | **cw#3 월드 시뮬레이션**: `GET /world` 스토어, 매 프레임 `sampleAt` → Character 배치, 이동 보간, 출입 페이드, 카메라(오빗·건물 포커스·캐릭터 추적), WebGL 미지원 목록 | cw#2, hm#1, th#1 |
| 4 | `cw` | **cw#4 실시간 클라이언트 + E2E**: 소켓 연결·시계 보정·presence·조종(키보드·클릭·탭, 충돌)·이모지·게시판 연결, Playwright E2E | cw#3, wj#3, th#4 |
| 5 | `wj` | **wj#1 서버 뼈대와 인증**: Fastify·SQLite 마이그레이션·세션·가입·로그인·관리자 로그인·필수 환경변수·시도 제한 | cw#1 |
| 6 | `wj` | **wj#2 데이터 API**: `/world`, `/me`, `/me/schedules`(겹침 409), `/admin/*` 승인·관리·백업 | wj#1 |
| 7 | `wj` | **wj#3 Socket.IO**: presence·조종권·60초 해제·이동 중계 10 Hz·이모지·횟수 제한·`world:changed`·`time` + 통합 테스트 | wj#2 |
| 8 | `wj` | **wj#4 배포**: 웹 정적 서빙, 멀티스테이지 Dockerfile, docker-compose, `.env.example`, README 배포·백업 절차 | wj#3 |
| 9 | `hm` | **hm#1 캠퍼스 바깥**: 지형·길·보도블록·풀·나무·꽃·연못·정문·게시판 모델, KayKit 소품 파스텔화, `shared/campus` 실제 좌표(경로 그래프·장소 문·공원 지점) | cw#1 |
| 10 | `hm` | **hm#2 건물 시스템 + 공학관·연구동**: 모듈 조립, 컷어웨이, 층 숨김, 공학관 3개 층·연구동 2F 가구와 좌석 좌표 | hm#1 |
| 11 | `hm` | **hm#3 본관·카페**: 식당·교양강의실·도서관·카페(테라스) 가구와 좌석 좌표, 건물 클릭 이벤트 | hm#2 |
| 12 | `hm` | **hm#4 하늘·조명·성능**: KST 기반 하늘색·해 위치, 밤 창문 발광·가로등, 인스턴싱 점검, 60 fps 확인 | hm#3 |
| 13 | `th` | **th#1 캐릭터**: 동물 4종 + 사자, 색, 악세서리 3부위, 포즈 8종, 눈 깜빡임·꼬리, 이름표 LOD, 이모지 말풍선, 하이라이트 링, 캐릭터 갤러리 개발 페이지 | cw#1 |
| 14 | `th` | **th#2 가입·로그인·꾸미기**: 모달, 3D 미리보기 꾸미기 화면, 🎲 랜덤, 승인 대기 배너 (API 연결, 서버 전이면 목업) | th#1, wj#1 |
| 15 | `th` | **th#3 시간표 편집**: 주간 격자 드래그(생성·이동·길이·겹침 표시), 종류 칩, 모바일 목록 폼 | th#2, wj#2 |
| 16 | `th` | **th#4 관리자·오버레이**: 관리자 화면, 메인 오버레이 레이아웃, 접속자 패널·이모지 바·조종 버튼·게시판 패널(표시용), 모바일 하단 시트 | th#3 |

### 12.5 진행 순서 (웨이브)
```
웨이브 0   cw#1  ← 모두 이것만 기다린다. 최우선으로 머지
웨이브 1   cw#2 · wj#1 · hm#1 · th#1        (병렬)
웨이브 2   cw#3 · wj#2 · hm#2 · th#2        (병렬)
웨이브 3   wj#3 · hm#3 · th#3
웨이브 4   wj#4 · hm#4 · th#4 → cw#4        (마지막 통합 + E2E)
```
- 앞 PR이 머지되기 전에 다음 작업을 시작해도 된다. 다만 PR은 선행 PR이 머지된 뒤에 연다.
- 서버가 아직 없을 때 UI(th)는 shared 스키마로 만든 목업 응답을 쓰고, 월드(cw·hm·th)는 `shared/campus` 임시 데이터와 고정 시간표 픽스처로 개발한다.

### 12.6 브랜치·PR 규칙
- 각자 개인 브랜치(`cw`/`wj`/`hm`/`th`) 하나를 계속 쓰고, PR은 개인 브랜치 → `main`으로 연다.
- **머지는 "Create a merge commit"**으로 한다. 스쿼시하면 같은 브랜치에서 다음 PR을 낼 때 이미 머지된 커밋이 다시 충돌한다.
- 머지 직후, 그리고 다음 PR을 열기 전에 `git fetch origin && git merge origin/main`으로 개인 브랜치를 갱신한다.
- PR 하나 = §12.4의 한 줄. 제목은 `[cw#2] placement 엔진`처럼 쓴다.
- 머지 조건: CI 통과 + 다른 멤버 1명 승인. 계약(`shared/schema`)이 바뀌면 cw 승인이 필수다.
- `main`에는 직접 push하지 않는다(브랜치 보호).

## 13. 배포

```
cp .env.example .env      # ADMIN_PASSWORD, SESSION_SECRET 채우기
docker compose up -d      # http://localhost:8080
```
- 컨테이너 1개, 프로세스 1개. 볼륨 `world-data:/data`에 `world.db` 하나만 둔다.
- 백업: 관리자 세션으로 `GET /api/admin/backup`.
- 리버스 프록시를 쓰면 WebSocket 업그레이드 헤더를 넘겨야 한다(README에 nginx 예시).

## 14. 에셋 라이선스
- KayKit City Builder Bits 1.0 — Kay Lousberg, CC0 (출처 표기 선택)
- Kenney Furniture Kit — Kenney, CC0
- 출처는 `CREDITS.md`에 기록한다.

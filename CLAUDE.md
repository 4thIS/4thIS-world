# 4thIS-world

4thIS 동아리원이 주간 시간표와 동물 캐릭터를 등록하면, 파스텔 3D 캠퍼스에서 캐릭터들이 지금 한국 시각의
시간표대로 강의실·연구실·식당·공원·카페를 오가는 실시간 웹. 4명이 인당 PR 4개, 총 16개 PR로 완성하는
단기 프로젝트다.

## 먼저 읽을 문서

| 문서                                                      | 내용                                                                              |
| --------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `docs/superpowers/specs/2026-10-21-4this-world-design.md` | 설계(스펙). 기능·규칙·계약의 기준                                                 |
| `docs/superpowers/plans/2026-10-21-00-overview.md`        | 플랜 개요. PR 순서(웨이브), 선행 관계, 검증된 버전, 교차 확인 메모                |
| `docs/superpowers/plans/2026-10-21-<브랜치><번호>-*.md`   | PR 하나당 플랜 하나. **실제 작업 지시서**                                         |
| `docs/prototype/preview-3d.html`                          | 브레인스토밍 때 승인받은 분위기 참고용 프로토타입 (코드를 그대로 가져가지 않는다) |

## 팀과 역할

| 브랜치 | 이름              | 역할                                                                           | 맡은 PR |
| ------ | ----------------- | ------------------------------------------------------------------------------ | ------- |
| `cw`   | 박찬우 (**팀장**) | 뼈대·공용 계약·placement 엔진·월드 시뮬레이션·실시간 클라이언트·E2E, 통합 책임 | cw#1~#4 |
| `wj`   | 이우진            | 서버 전부: DB·인증·승인·API·Socket.IO·Docker                                   | wj#1~#4 |
| `hm`   | 박효민            | 캠퍼스 3D: 지형·건물·컷어웨이·가구·하늘·조명, 맵 좌표 데이터                   | hm#1~#4 |
| `th`   | 김태희            | 캐릭터 3D + 화면 UI: 가입·꾸미기·시간표 편집·관리자·오버레이                   | th#1~#4 |

## 레포 구조

npm workspaces 모노레포. 위치("이 시각에 이 사람은 어디에")는 **모든 브라우저가 같은 규칙으로 계산**하고,
서버는 저장·인증·실시간 중계만 한다.

```
packages/shared/            서버·웹 공용 순수 TS (DOM·Node API 금지)
  src/schema/               zod 스키마·REST 경로·소켓 이벤트        ← 공용 계약 (cw)
  src/campus/               캠퍼스 좌표 데이터와 검사기              ← hm
  src/placement/            시간표 + 시각 → 위치/행동 계산 엔진       ← cw
  src/time.ts · hash.ts     KST 시각, 결정적 난수                    ← cw
apps/server/                Fastify + Socket.IO + SQLite             ← wj
apps/web/src/
  world/contracts.ts        Character·Campus props 계약              ← cw
  world/campus/             캠퍼스 3D                                ← hm
  world/characters/         캐릭터 3D                                ← th
  world/sim/                시간표대로 움직이기·조종·카메라           ← cw
  ui/contracts.ts           오버레이 props 계약                      ← cw
  ui/                       화면 UI                                  ← th
  api/ · store/             REST·소켓 클라이언트, zustand 스토어      ← cw
  dev/campus/ · dev/characters/   단독 개발 페이지 (?dev=...)        ← hm / th
e2e/                        Playwright                               ← cw
Dockerfile · docker-compose.yml · .env.example · docs/deploy.md     ← wj
```

소유자가 아닌 파일은 고치지 않는다. 꼭 필요하면 소유자에게 먼저 말하고 그 사람의 리뷰를 받는다.
`.github/CODEOWNERS`가 리뷰어를 자동으로 지정한다.

## 작업 규칙: 플랜의 체크포인트대로

1. **PR 하나 = 플랜 파일 하나.** 지금 작업할 플랜은 개요의 PR 표에서 내 브랜치·번호로 찾는다.
2. 플랜의 Task와 Step을 **순서대로** 진행하고, 끝낸 Step은 체크박스를 채운다. Step을 건너뛰거나 합치거나 순서를 바꾸지 않는다.
3. **다음 PR의 Task를 이번 PR에 섞지 않는다.** 플랜에 없는 기능, 리팩터링, "하는 김에" 하는 수정은 넣지 않는다.
4. 커밋은 플랜이 말하는 시점과 메시지로 한다(`feat:`/`fix:`/`chore:`/`test:`/`docs:` + 한국어 설명).
5. PR을 열기 전에 반드시 전체 검사를 통과시킨다:
   ```bash
   npm run typecheck && npm run lint && npm run format:check && npm test && npm run build
   ```
6. PR 제목은 `[<브랜치>#<번호>] <플랜 제목>`이다(예: `[cw#2] placement 엔진`). 본문은 PR 템플릿을 채운다.
7. 선행 PR이 머지되기 전에 작업을 시작해도 되지만, **PR은 선행 PR이 머지된 뒤에 연다**.
8. 플랜의 코드가 그대로 동작하지 않으면 플랜을 다시 설계하지 않는다. 가장 작은 수정으로 맞추고, 무엇을 왜 고쳤는지 PR 본문에 적는다.
9. 스펙이나 계약과 다르게 가야 할 것 같으면 **멈추고 팀장에게 묻는다**.

Claude Code로 진행할 때:
`docs/superpowers/plans/2026-10-21-<플랜>.md 를 superpowers:subagent-driven-development 로 실행해줘`

## Git 규칙 (반드시 지킨다)

- **자기 브랜치(`cw`·`wj`·`hm`·`th`)에서만 작업하고 push한다.** 작업 전에 `git branch --show-current`로 확인한다. 내 브랜치가 아니면 아무것도 하지 말고 멈춘다.
- **새 브랜치를 만들지 않는다.** `git checkout -b`, `git switch -c`, `git branch <이름>`을 쓰지 않는다. 기능 브랜치·실험 브랜치·worktree 브랜치도 만들지 않는다.
- **force push를 하지 않는다.** `git push --force`, `--force-with-lease`, `+refspec` 모두 금지다. 이미 push한 커밋을 `rebase`, `reset`, `commit --amend`로 고치지 않는다. 고칠 일이 있으면 새 커밋을 쌓는다.
- **`main`에 직접 커밋하거나 push하지 않는다.** `main`으로 가는 길은 PR뿐이다.
- **머지는 팀장(박찬우)만 한다.** 팀원과 Claude는 `gh pr merge`나 GitHub 머지 버튼을 쓰지 않는다. 머지 방식은 항상 **Create a merge commit**이다(개인 브랜치를 계속 쓰기 때문에 squash·rebase 머지를 쓰지 않는다).
- 머지 소식을 받으면, 그리고 다음 PR을 시작하기 전에 개인 브랜치를 최신으로 맞춘다:
  ```bash
  git fetch origin && git merge origin/main
  ```
  충돌은 자기 브랜치에서 merge 커밋으로 해결한다.
- 브랜치 삭제, 태그 push, `git clean -fdx` 같이 되돌리기 어려운 명령은 쓰지 않는다.
- **커밋과 PR에 Claude를 공동 작성자로 넣지 않는다.** 커밋 메시지에 `Co-Authored-By: Claude …` 줄을 달지 않고, 커밋·PR 본문에 `🤖 Generated with Claude Code` 같은 문구도 넣지 않는다. 작성자는 브랜치 주인 한 명이다.

## 공용 계약을 바꿔야 할 때

`packages/shared/src/schema/*`, `apps/web/src/world/contracts.ts`, `apps/web/src/ui/contracts.ts`는 4명이 함께 쓰는 계약이다.

1. 단톡방에 바꿀 내용(필드 이름·타입)을 먼저 올린다.
2. 계약만 바꾸는 작은 PR로 올리고, 팀장 승인을 받는다.
3. 머지되면 모두 `git merge origin/main`을 한다.

## 코드 규칙

- Node 24 이상, npm workspaces, `package-lock.json` 커밋. TypeScript는 `~5.9.3` 고정. 패키지 버전은 개요의 "검증된 도구 버전"을 따른다.
- 공용 타입·스키마·경로·이벤트는 `@4this/shared`에서만 가져온다. 같은 타입을 다른 곳에 다시 정의하지 않는다.
- 시각 계산은 KST이고 `packages/shared/src/time.ts`만 쓴다. 화면 결과에 영향을 주는 랜덤은 `rand01()`(결정적)을 쓴다.
- 좌표계: 단위 m, +x 동쪽, +z 남쪽(정문), 캠퍼스 x·z ∈ [-25, 25], `facing` = `rotation.y`(0이면 +z), 층 높이 3.2 m.
- Prettier(작은따옴표, 세미콜론, 100자). 주석과 사용자에게 보이는 문구는 한국어.
- 테스트는 vitest. 3D처럼 테스트하기 어려운 부분은 순수 함수로 빼서 테스트한다.

## 자주 쓰는 명령

```bash
npm install
npm run dev          # 서버 :8080 + 웹 :5173
npm test             # 전체 테스트 (워크스페이스별: npm test -w @4this/shared)
npm run typecheck
npm run lint
npm run format       # 고치기 (검사만: npm run format:check)
npm run build        # 웹 빌드
```

개발 페이지: `http://localhost:5173/?dev=campus`, `?dev=characters`, `?dev=sim`

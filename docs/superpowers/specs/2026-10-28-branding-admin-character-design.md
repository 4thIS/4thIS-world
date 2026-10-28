# 브랜딩과 관리자 캐릭터 설계

- 작성일: 2026-10-28 · 상태: 승인됨(팀장) · 구현: 박찬우(`cw`) 한 PR
- 기준 문서: `docs/superpowers/specs/2026-10-21-4this-world-design.md`

## 1. 목표

1. 새 로고(바탕화면 `4thIS-world 로고`)를 사이트에 입힌다: 정문 간판, 파비콘, 첫 소개 모달.
2. 관리자도 캐릭터를 갖는다. 사이트에 하나뿐인 "관리자" 캐릭터가 24시간 광장 한가운데 서 있고, 관리자로 로그인하면 일반 멤버처럼 조종·이모지를 쓴다.

## 2. 브랜딩

| 항목 | 내용 |
|---|---|
| 에셋 | `apps/web/public/brand/`: `logo-wide.png`(가로 로고, 투명), `icon-512.png`, `favicon-32.png`, `favicon-64.png`, `apple-touch-icon.png`(180) |
| 파비콘 | `index.html`에 `<link rel="icon">`·`apple-touch-icon` |
| 정문 간판 | `Gate.tsx`의 글자 간판을 흰 둥근 판 + 가로 로고 텍스처로 바꾼다(앞뒤 양쪽, 비율 로고에 맞춤) |
| 첫 소개 모달 | 들어올 때마다 뜬다. 로고, 환영 문구, 소개 세 줄, `가입하고 내 캐릭터 만들기`·`구경하기`, `오늘 하루 보지 않기` 체크(다음 KST 자정까지 숨김, `localStorage` 키 `4this-intro-hidden-until`, 저장소 실패 시 매번 표시). 다른 모달이 열려 있으면 띄우지 않는다. 상단 바 로고를 누르면 다시 연다 |

## 3. 관리자 캐릭터: 가상 멤버 `'admin'`

- **계약** (`packages/shared`)
  - `ADMIN_ID = 'admin'`, `ADMIN_NAME = '관리자'`, `ADMIN_SPOT = { pos: [0, 3], facing: 0 }`(광장 중앙, 정문 쪽), `DEFAULT_ADMIN_LOOK`(곰·선글라스·나비넥타이)
  - `WorldResponse.admin?: { look }` — 서버는 항상 보낸다. 선택 필드라 예전 픽스처도 통과한다
  - `API.adminLook = '/api/admin/look'`, `AdminLookSchema { look }`(요청·응답 같은 모양)
  - `Pose.placeId`에 `'plaza'` 추가, `adminPose()`: 광장 중앙 `stand`, 상태 문구 "광장"
  - `sampleAt(plan, ADMIN_ID, t)`는 계획과 상관없이 `adminPose()`를 돌려준다(24시간·매일). 그래서 이름표·건물 패널·텍스트 목록·조종 해제 후 복귀가 모두 그대로 동작한다
- **서버**
  - 관리자 생김새는 `settings` 테이블 키 `admin_look`(JSON). 없으면 `DEFAULT_ADMIN_LOOK`
  - `GET /api/world`에 `admin: { look }`
  - `PATCH /api/admin/look`: 관리자만(게스트 401, 멤버 403), zod 검증, 저장 뒤 `world:changed`
  - 소켓: 관리자 세션 소켓을 멤버 `'admin'`으로 취급 → 접속자 목록·조종권·60초 해제·이모지가 일반 멤버와 같다
  - 멤버 표·승인·아이디 검사·백업은 바꾸지 않는다
- **웹**
  - 월드 스토어: `members` 끝에 관리자 가상 멤버를 붙인다(시간표 없음)
  - `myMemberId()`: 관리자 세션이면 `'admin'` → 조종 버튼·이모지 바·발밑 링이 그대로 뜬다
  - `describeWhere`: `'plaza'` → "광장" (상태 문구와 같아 한 번만)
  - 관리자 화면 맨 위 "관리자 캐릭터" 칸: 꾸미기 칩·3D 미리보기·🎲·저장(`PATCH /api/admin/look`)

## 4. 테스트

- shared: `sampleAt`의 관리자 위치(여러 시각·요일), 계약 스키마
- server: `/world`의 기본·저장된 관리자 생김새, `PATCH /api/admin/look` 권한(401/403/200)과 `world:changed`, 관리자 소켓의 presence·조종·이모지
- web: 소개 모달 숨김 기한 계산, 관리자 세션 = 내 캐릭터, 월드 스토어에 관리자 멤버
- E2E: 관리자 로그인 → 광장 중앙 캐릭터 → 조종 → 두 번째 브라우저에서 조종 표시 확인

## 5. 소유 영역 밖 변경 (팀장 승인)

서버(wj): `routes/world.ts`, `routes/admin.ts`, `realtime.ts`, 설정 저장 · UI(th): `UiRoot`, 관리자 화면, 상단 바, 새 소개 모달 · 캠퍼스(hm): `Gate.tsx`

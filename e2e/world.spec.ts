import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import type { WorldDebug } from '../apps/web/src/world/sim/debug';
import { ADMIN_PASSWORD } from './env';

declare global {
  interface Window {
    __world?: WorldDebug;
  }
}

const KST = 9 * 60 * 60 * 1000;

/** 지금(KST) 진행 중인 1시간짜리 강의. 06:05 이전·23:30 이후면 넣을 수 없어 null */
function lectureNow(): { day: number; start: string; end: string; kind: 'lecture1' } | null {
  const kst = new Date(Date.now() + KST);
  const min = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  if (min < 6 * 60 + 5 || min >= 23 * 60 + 30) return null;
  const start = Math.floor(min / 30) * 30;
  const hhmm = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return {
    day: (kst.getUTCDay() + 6) % 7,
    start: hhmm(start),
    end: hhmm(start + 60),
    kind: 'lecture1',
  };
}

/** 구경하는 페이지에서 멤버 캐릭터의 화면 위치 */
const positionOf = (page: Page, id: string) =>
  page.evaluate((id) => window.__world!.positionOf(id), id);
const emoteOf = (page: Page, id: string) => page.evaluate((id) => window.__world!.emoteOf(id), id);

/** 들어올 때마다 뜨는 소개 모달을 이 컨텍스트에서는 건너뛴다 ("오늘 하루 보지 않기"와 같다) */
const skipIntro = (context: BrowserContext) =>
  context.addInitScript(() =>
    localStorage.setItem('4this-intro-hidden-until', String(Date.now() + 86_400_000)),
  );

test('가입 → 관리자 승인 → 캐릭터 등장 → 조종 → 다른 브라우저에서 움직임·이모지 확인', async ({
  browser,
}) => {
  const username = `e2e${Date.now() % 1_000_000}`;

  // 1) 가입 (이 컨텍스트에 세션 쿠키가 생긴다)
  const player = await browser.newContext();
  await skipIntro(player);
  const page = await player.newPage();
  const signup = await page.request.post('/api/auth/signup', {
    data: { username, password: 'pw123456' },
  });
  expect(signup.ok()).toBeTruthy();
  const { me } = (await signup.json()) as { me: { id: string; status: string } };
  expect(me.status).toBe('pending');
  const lecture = lectureNow();
  if (lecture) {
    const put = await page.request.put('/api/me/schedules', { data: { items: [lecture] } });
    expect(put.ok()).toBeTruthy();
  }

  // 2) 관리자 로그인 → 승인
  const admin = await browser.newContext();
  expect(
    (await admin.request.post('/api/auth/admin', { data: { password: ADMIN_PASSWORD } })).ok(),
  ).toBeTruthy();
  expect((await admin.request.post(`/api/admin/members/${me.id}/approve`)).ok()).toBeTruthy();

  // 3) 월드에 등장: 접속자 목록에 이름이 보이고, 소켓이 연결된다
  await page.goto('/');
  await page.waitForFunction(() => window.__world?.connection() === 'connected');
  await expect(page.getByText(username).first()).toBeVisible();
  await page.waitForFunction((id) => window.__world?.members().includes(id), me.id);
  if (lecture) {
    // 지금 강의 중이니 placement가 강의실에 앉힌다
    await expect.poll(() => positionOf(page, me.id).then((p) => p?.visible ?? false)).toBe(true);
  }

  // 4) 두 번째 브라우저(로그인 안 한 구경꾼)
  const viewer = await browser.newContext();
  await skipIntro(viewer);
  const vpage = await viewer.newPage();
  // CI에서 실패하면 원인을 볼 수 있게 구경꾼 페이지의 오류를 테스트 출력에 남긴다
  vpage.on('pageerror', (e) => console.log('[viewer pageerror]', e.message));
  vpage.on('console', (m) => {
    if (m.type() === 'error') console.log('[viewer console]', m.text());
  });
  await vpage.goto('/');
  await vpage.waitForFunction((id) => window.__world?.members().includes(id), me.id);

  // 5) 조종 시작 → 구경꾼 화면에서도 조종 중으로 보인다
  await page.getByRole('button', { name: /조종하기/ }).click();
  await vpage.waitForFunction((id) => window.__world?.controlling().includes(id), me.id);
  await expect.poll(() => positionOf(vpage, me.id).then((p) => p?.visible ?? false)).toBe(true);
  const before = (await positionOf(vpage, me.id))!;

  // 6) W를 누르고 있으면 구경꾼 화면의 위치도 바뀐다.
  // 한 프레임 이동량에 상한이 있어 느린 러너에서는 같은 시간에 덜 걷는다. 시간이 아니라 결과를 기다린다
  await page.keyboard.down('w');
  await expect
    .poll(async () => {
      const after = (await positionOf(vpage, me.id))!;
      return Math.hypot(after.x - before.x, after.z - before.z);
    })
    .toBeGreaterThan(1);
  await page.keyboard.up('w');

  // 7) 이모지가 상대에게 보인다
  await page.getByRole('button', { name: '👋' }).click();
  await expect.poll(() => emoteOf(vpage, me.id)).toBe('👋');

  // 8) 자동으로 돌아가면 조종 표시가 사라진다
  await page.getByRole('button', { name: /자동으로/ }).click();
  await vpage.waitForFunction((id) => !window.__world?.controlling().includes(id), me.id);

  await Promise.all([player.close(), admin.close(), viewer.close()]);
});

test('관리자 캐릭터: 광장 한가운데 서 있고, 관리자로 로그인하면 조종한다', async ({ browser }) => {
  // 1) 구경꾼: 관리자 캐릭터가 광장 중앙(0, 3)에 서 있다
  const viewer = await browser.newContext();
  await skipIntro(viewer);
  const vpage = await viewer.newPage();
  await vpage.goto('/');
  await vpage.waitForFunction(() => window.__world?.members().includes('admin'));
  await expect.poll(() => positionOf(vpage, 'admin').then((p) => p?.visible ?? false)).toBe(true);
  const home = (await positionOf(vpage, 'admin'))!;
  expect(Math.hypot(home.x - 0, home.z - 3)).toBeLessThan(0.5);

  // 2) 관리자 로그인: 소개 모달을 닫고 조종을 시작한다
  const admin = await browser.newContext();
  expect(
    (await admin.request.post('/api/auth/admin', { data: { password: ADMIN_PASSWORD } })).ok(),
  ).toBeTruthy();
  const page = await admin.newPage();
  await page.goto('/');
  await page.getByRole('button', { name: '캠퍼스로 들어가기' }).click();
  await page.waitForFunction(() => window.__world?.connection() === 'connected');
  await page.getByRole('button', { name: /조종하기/ }).click();
  await vpage.waitForFunction(() => window.__world?.controlling().includes('admin'));

  // 3) 구경꾼 화면에서도 움직이고, 이모지가 보인다
  await page.keyboard.down('w');
  await expect
    .poll(async () => {
      const p = (await positionOf(vpage, 'admin'))!;
      return Math.hypot(p.x - home.x, p.z - home.z);
    })
    .toBeGreaterThan(1);
  await page.keyboard.up('w');
  await page.getByRole('button', { name: '👋' }).click();
  await expect.poll(() => emoteOf(vpage, 'admin')).toBe('👋');

  // 4) 놓으면 광장 중앙으로 걸어 돌아간다
  await page.getByRole('button', { name: /자동으로/ }).click();
  await vpage.waitForFunction(() => !window.__world?.controlling().includes('admin'));
  await expect
    .poll(
      async () => {
        const p = (await positionOf(vpage, 'admin'))!;
        return Math.hypot(p.x - 0, p.z - 3);
      },
      { timeout: 20_000 },
    )
    .toBeLessThan(0.5);

  await Promise.all([admin.close(), viewer.close()]);
});

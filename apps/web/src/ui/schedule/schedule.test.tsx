import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScheduleItem } from '@4this/shared';
import { useSession } from '../../store/session';
import { useUi } from '../store';
import { apiError, ME_PENDING, mockApi } from '../testing/mockApi';
import { ScheduleScreen } from './ScheduleScreen';

const LECTURE: ScheduleItem = { day: 0, start: '09:00', end: '10:00', kind: 'lecture1' };

/** 격자 크기를 700×720px로 둔다: 요일 한 칸 100px, 30분 한 칸 20px */
function stubGridRect() {
  const grid = screen.getByTestId('week-grid');
  grid.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 700, height: 720, right: 700, bottom: 720 }) as DOMRect;
  return grid;
}

/** (x, y)에서 눌러 (x2, y2)로 끌고 놓는다 */
function drag(target: Element, from: [number, number], to: [number, number]) {
  fireEvent.pointerDown(target, { button: 0, pointerId: 1, clientX: from[0], clientY: from[1] });
  fireEvent.pointerMove(target, { pointerId: 1, clientX: to[0], clientY: to[1] });
  fireEvent.pointerUp(target, { pointerId: 1, clientX: to[0], clientY: to[1] });
}

async function renderLoaded(items: ScheduleItem[], extra: Parameters<typeof mockApi>[0] = {}) {
  const api = mockApi({ 'GET /api/me/schedules': { body: { items } }, ...extra });
  render(<ScheduleScreen />);
  await screen.findByTestId('week-grid');
  return api;
}

beforeEach(() => {
  useSession.setState({ session: { kind: 'member', me: ME_PENDING }, loading: false });
  useUi.getState().open('schedule');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ScheduleScreen 격자', () => {
  it('불러온 일정을 블록으로 그린다', async () => {
    await renderLoaded([LECTURE]);
    expect(screen.getByLabelText('월 09:00~10:00 1학년 강의')).toBeTruthy();
  });

  it('빈 칸을 끌어 일정을 만든다 (종류는 일정 창에서 고른다)', async () => {
    await renderLoaded([]);
    const grid = stubGridRect();
    drag(grid, [150, 60], [150, 100]);
    const dialog = screen.getByRole('dialog', { name: '새 일정' });
    fireEvent.click(within(dialog).getByRole('button', { name: '연구' }));
    expect(within(dialog).getByText('📍 연구동 2층에서 보내요')).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: '완료' }));
    expect(screen.getByLabelText('화 07:30~09:00 연구')).toBeTruthy();
  });

  it('위에 종류 목록 대신 종류별 위치 안내가 있다', async () => {
    await renderLoaded([]);
    const legend = screen.getByRole('list', { name: '일정 종류별 위치' });
    expect(legend.textContent).toContain('1학년 강의공학관 1층');
    expect(legend.textContent).toContain('외부 일정카페');
    expect(screen.queryByRole('group', { name: '종류' })).toBeNull();
  });

  it('블록을 끌어 다른 요일로 옮긴다', async () => {
    await renderLoaded([LECTURE]);
    stubGridRect();
    const block = screen.getByLabelText('월 09:00~10:00 1학년 강의');
    drag(block, [50, 130], [350, 170]);
    expect(screen.getByLabelText('목 10:00~11:00 1학년 강의')).toBeTruthy();
  });

  it('아래 끝을 끌어 길이를 늘린다', async () => {
    await renderLoaded([LECTURE]);
    stubGridRect();
    const edge = screen
      .getByLabelText('월 09:00~10:00 1학년 강의')
      .querySelector('[data-edge="end"]')!;
    drag(edge, [50, 150], [50, 190]);
    expect(screen.getByLabelText('월 09:00~11:00 1학년 강의')).toBeTruthy();
  });

  it('빈 칸을 끌어 만들면 일정 창이 떠서 종류·제목·시간을 넣는다', async () => {
    await renderLoaded([]);
    const grid = stubGridRect();
    drag(grid, [150, 60], [150, 100]); // 화 07:30~09:00
    const dialog = screen.getByRole('dialog', { name: '새 일정' });
    fireEvent.click(within(dialog).getByRole('button', { name: '교양 강의' }));
    fireEvent.change(within(dialog).getByLabelText(/^제목/), { target: { value: '심리학' } });
    fireEvent.change(within(dialog).getByLabelText('끝'), { target: { value: '8' } }); // 10:00
    fireEvent.click(within(dialog).getByRole('button', { name: '완료' }));
    expect(screen.queryByRole('dialog', { name: '새 일정' })).toBeNull();
    expect(screen.getByLabelText('화 07:30~10:00 교양 강의 심리학')).toBeTruthy();
  });

  it('새로 만든 일정 창에서 취소(또는 Esc)하면 그 일정은 지우고, 시간표 창은 그대로', async () => {
    await renderLoaded([]);
    const grid = stubGridRect();
    drag(grid, [150, 60], [150, 100]);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: '새 일정' })).toBeNull();
    expect(screen.queryByLabelText(/화 07:30/)).toBeNull();
    expect(useUi.getState().screen).toBe('schedule');
  });

  it('블록을 누르면(끌지 않고) 일정 창이 떠서 고치거나 지운다', async () => {
    await renderLoaded([LECTURE]);
    stubGridRect();
    drag(screen.getByLabelText('월 09:00~10:00 1학년 강의'), [50, 130], [50, 130]);
    const dialog = screen.getByRole('dialog', { name: '일정 고치기' });
    fireEvent.change(within(dialog).getByLabelText(/^제목/), { target: { value: '자료구조' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '완료' }));
    expect(screen.getByLabelText('월 09:00~10:00 1학년 강의 자료구조')).toBeTruthy();

    drag(screen.getByLabelText('월 09:00~10:00 1학년 강의 자료구조'), [50, 130], [50, 130]);
    fireEvent.click(
      within(screen.getByRole('dialog', { name: '일정 고치기' })).getByRole('button', {
        name: '삭제',
      }),
    );
    expect(screen.queryByLabelText(/1학년 강의/)).toBeNull();
  });

  it('끝이 시작보다 빠르면 완료를 막고 알려 준다', async () => {
    await renderLoaded([LECTURE]);
    stubGridRect();
    drag(screen.getByLabelText('월 09:00~10:00 1학년 강의'), [50, 130], [50, 130]);
    const dialog = screen.getByRole('dialog', { name: '일정 고치기' });
    fireEvent.change(within(dialog).getByLabelText('끝'), { target: { value: '4' } }); // 08:00
    fireEvent.click(within(dialog).getByRole('button', { name: '완료' }));
    expect(within(dialog).getByRole('alert').textContent).toContain('끝 시각');
  });

  it('겹치면 빨갛게 표시하고 저장을 막는다', async () => {
    await renderLoaded([LECTURE]);
    const grid = stubGridRect();
    drag(grid, [50, 150], [50, 170]); // 월 09:30~10:30
    expect(screen.getByRole('alert').textContent).toContain('겹치는 일정');
    expect(document.querySelectorAll('.sch-block--overlap')).toHaveLength(2);
    expect(screen.getByRole('button', { name: '저장' })).toHaveProperty('disabled', true);
  });

  it('저장하면 PUT으로 통째로 보낸다 (빈 제목은 뺀다)', async () => {
    const { calls } = await renderLoaded([{ ...LECTURE, title: '  ' }], {
      'PUT /api/me/schedules': (body) => ({ body }),
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('저장했어요 ✨')).toBeTruthy();
    expect(calls[1]).toMatchObject({ method: 'PUT', body: { items: [LECTURE] } });
  });

  it('서버가 409 겹침을 주면 알려 준다', async () => {
    await renderLoaded([LECTURE], { 'PUT /api/me/schedules': apiError(409, 'overlap') });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect((await screen.findByRole('alert')).textContent).toBe('겹치는 일정이 있어요.');
  });

  it('가입 흐름이면 저장 후 닫는다', async () => {
    useUi.getState().open('schedule', { onboarding: true });
    await renderLoaded([], { 'PUT /api/me/schedules': (body) => ({ body }) });
    expect(screen.getByText(/마지막 단계/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await vi.waitFor(() => expect(useUi.getState().screen).toBeNull());
  });

  it('불러오기에 실패하면 저장을 막는다 (서버 시간표를 빈 목록으로 덮어쓰지 않게)', async () => {
    mockApi({ 'GET /api/me/schedules': apiError(500, 'internal') });
    render(<ScheduleScreen />);
    expect((await screen.findByRole('alert')).textContent).toBe(
      '서버에 문제가 생겼어요. 잠시 뒤 다시 해 주세요.',
    );
    expect(screen.getByRole('button', { name: '저장' })).toHaveProperty('disabled', true);
  });
});

describe('ScheduleScreen 모바일 (640px 미만)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );
  });

  it('목록 + 폼으로 추가·수정·삭제한다', async () => {
    mockApi({ 'GET /api/me/schedules': { body: { items: [LECTURE] } } });
    render(<ScheduleScreen />);
    expect(await screen.findByText('월 09:00~10:00 · 1학년 강의')).toBeTruthy();
    expect(screen.queryByTestId('week-grid')).toBeNull();

    fireEvent.change(screen.getByLabelText('요일'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('시작'), { target: { value: '14' } }); // 13:00
    fireEvent.change(screen.getByLabelText('끝'), { target: { value: '18' } }); // 15:00
    fireEvent.change(screen.getByLabelText('종류'), { target: { value: 'external' } });
    fireEvent.change(screen.getByLabelText(/^제목/), { target: { value: '알바' } });
    fireEvent.click(screen.getByRole('button', { name: '일정 추가' }));
    expect(screen.getByText('수 13:00~15:00 · 외부 일정 · 알바')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: '수정' })[0]!);
    fireEvent.change(screen.getByLabelText('끝'), { target: { value: '10' } }); // 11:00
    fireEvent.click(screen.getByRole('button', { name: '수정 완료' }));
    expect(screen.getByText('월 09:00~11:00 · 1학년 강의')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: '삭제' })[0]!);
    expect(screen.queryByText('월 09:00~11:00 · 1학년 강의')).toBeNull();
    expect(screen.getByText('수 13:00~15:00 · 외부 일정 · 알바')).toBeTruthy();
  });

  it('끝이 시작보다 빠르면 추가하지 않는다', async () => {
    mockApi({ 'GET /api/me/schedules': { body: { items: [] } } });
    render(<ScheduleScreen />);
    await screen.findByText(/아직 일정이 없어요/);
    fireEvent.change(screen.getByLabelText('시작'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('끝'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: '일정 추가' }));
    expect(screen.getByRole('alert').textContent).toBe('끝 시각이 시작보다 늦어야 해요.');
  });

  it('저장 뒤에는 고치던 일정을 놓아 준다 (서버가 정렬해 돌려줘도 다른 일정을 덮지 않게)', async () => {
    const MON: ScheduleItem = { day: 0, start: '09:00', end: '10:00', kind: 'lecture1' };
    const WED: ScheduleItem = { day: 2, start: '09:00', end: '10:00', kind: 'lecture1' };
    mockApi({
      'GET /api/me/schedules': { body: { items: [MON, WED] } },
      'PUT /api/me/schedules': (body) => ({
        body: {
          items: [...(body as { items: ScheduleItem[] }).items].sort(
            (a, b) => a.day - b.day || a.start.localeCompare(b.start),
          ),
        },
      }),
    });
    render(<ScheduleScreen />);
    await screen.findByText('월 09:00~10:00 · 1학년 강의');

    fireEvent.change(screen.getByLabelText('요일'), { target: { value: '1' } });
    fireEvent.change(screen.getByLabelText('시작'), { target: { value: '6' } }); // 09:00
    fireEvent.change(screen.getByLabelText('끝'), { target: { value: '8' } }); // 10:00
    fireEvent.click(screen.getByRole('button', { name: '일정 추가' }));

    // 목록이 정렬돼 있으니 화요일 줄은 두 번째 수정 버튼이다
    fireEvent.click(screen.getAllByRole('button', { name: '수정' })[1]!);
    expect(screen.getByRole('button', { name: '수정 완료' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await screen.findByText('저장했어요 ✨');

    expect(screen.getByRole('button', { name: '일정 추가' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '수정 완료' })).toBeNull();
    expect(screen.getByText('월 09:00~10:00 · 1학년 강의')).toBeTruthy();
    expect(screen.getByText('화 09:00~10:00 · 1학년 강의')).toBeTruthy();
    expect(screen.getByText('수 09:00~10:00 · 1학년 강의')).toBeTruthy();
  });
});

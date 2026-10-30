import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LOOK, type ScheduleItem } from '@4this/shared';
import { useSession } from '../../store/session';
import { useWorld } from '../../store/world';
import { useUi } from '../store';
import { ME_APPROVED, mockApi } from '../testing/mockApi';
import { ScheduleScreen } from './ScheduleScreen';

const LECTURE: ScheduleItem = { day: 0, start: '09:00', end: '10:00', kind: 'lecture1' };

beforeEach(() => {
  useWorld.setState({
    members: [{ id: 'm9', username: '영희', look: DEFAULT_LOOK, schedules: [LECTURE] }],
  });
  useUi.getState().open('schedule', { member: { id: 'm9', username: '영희' } });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  useUi.getState().close();
  useWorld.setState(useWorld.getInitialState(), true);
});

describe('다른 사람 시간표', () => {
  it('멤버는 읽기만: 제목에 이름, 블록은 보이고 저장 버튼은 없다', () => {
    useSession.setState({ session: { kind: 'member', me: ME_APPROVED }, loading: false });
    render(<ScheduleScreen />);
    expect(screen.getByRole('dialog', { name: '영희의 시간표' })).toBeTruthy();
    expect(screen.getByLabelText('월 09:00~10:00 1학년 강의')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '저장' })).toBeNull();
    expect(screen.getByRole('list', { name: '일정 종류별 위치' })).toBeTruthy();
  });

  it('관리자는 고칠 수 있다: 관리자 API로 불러오고 저장한다', async () => {
    useSession.setState({ session: { kind: 'admin' }, loading: false });
    const api = mockApi({
      'GET /api/admin/members/m9/schedules': { body: { items: [LECTURE] } },
      'PUT /api/admin/members/m9/schedules': (body) => ({ body }),
    });
    render(<ScheduleScreen />);
    expect(await screen.findByLabelText('월 09:00~10:00 1학년 강의')).toBeTruthy();
    expect(screen.getByRole('dialog', { name: '영희의 시간표 (관리자)' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('저장했어요 ✨')).toBeTruthy();
    expect(api.calls.at(-1)).toMatchObject({
      method: 'PUT',
      url: '/api/admin/members/m9/schedules',
      body: { items: [LECTURE] },
    });
  });

  it('구경꾼은 볼 수 없다', () => {
    useSession.setState({ session: { kind: 'guest' }, loading: false });
    render(<ScheduleScreen />);
    expect(screen.getByText('로그인하면 다른 사람 시간표를 볼 수 있어요.')).toBeTruthy();
  });
});

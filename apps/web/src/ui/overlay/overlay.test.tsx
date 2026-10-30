import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PresenceEntry } from '../contracts';
import { useUi } from '../store';
import { BoardPanel } from './BoardPanel';
import { BuildingPanel } from './BuildingPanel';
import { ConnectionBadge } from './ConnectionBadge';
import { ControlButton } from './ControlButton';
import { EmoteBar } from './EmoteBar';
import { MotionBar } from './MotionBar';
import { PresencePanel } from './PresencePanel';
import { TopBar } from './TopBar';

afterEach(cleanup);

const ENTRIES: PresenceEntry[] = [
  {
    id: 'm1',
    username: '철수',
    look: { animal: 'dog', color: 'default', head: 'none', eyes: 'glasses', neck: 'none' },
    status: '공강',
    controlling: false,
    isMe: true,
  },
  {
    id: 'm2',
    username: '지우',
    look: { animal: 'duck', color: 'sky', head: 'cap', eyes: 'none', neck: 'none' },
    status: '2학년 강의',
    controlling: true,
    isMe: false,
  },
];

describe('TopBar', () => {
  it('로고·시각·하늘 아이콘', () => {
    render(<TopBar clock="수 14:10" skyIcon="☀️" onHome={() => {}} />);
    expect(screen.getByText('4thIS-world')).toBeTruthy();
    expect(screen.getByLabelText('지금 시각').textContent).toBe('수 14:10 ☀️');
  });

  it('❔를 누르면 조작법 가이드', () => {
    render(<TopBar clock="수 14:10" skyIcon="☀️" onHome={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '조작법' }));
    expect(useUi.getState().screen).toBe('guide');
    useUi.getState().close();
  });

  it('🔈을 누르면 대사음을 켠다', () => {
    const onToggleSound = vi.fn();
    render(
      <TopBar clock="수 14:10" skyIcon="☀️" onHome={() => {}} onToggleSound={onToggleSound} />,
    );
    fireEvent.click(screen.getByRole('button', { name: '대사음 켜기' }));
    expect(onToggleSound).toHaveBeenCalledOnce();
  });

  it('대사음을 켜면 크기 막대가 나오고, 움직이면 0~1로 알린다', () => {
    const onVolume = vi.fn();
    const props = { clock: '수 14:10', skyIcon: '☀️', onHome: () => {}, onToggleSound: () => {} };
    const { rerender } = render(<TopBar {...props} onVolume={onVolume} />);
    expect(screen.queryByRole('slider', { name: '대사음 크기' })).toBeNull();
    rerender(<TopBar {...props} soundOn volume={0.7} onVolume={onVolume} />);
    const slider = screen.getByRole('slider', { name: '대사음 크기' }) as HTMLInputElement;
    expect(slider.value).toBe('70');
    fireEvent.change(slider, { target: { value: '30' } });
    expect(onVolume).toHaveBeenCalledWith(0.3);
  });

  it('🏠을 누르면 처음 시야로', () => {
    const onHome = vi.fn();
    render(<TopBar clock="수 14:10" skyIcon="☀️" onHome={onHome} />);
    fireEvent.click(screen.getByRole('button', { name: '처음 시야로' }));
    expect(onHome).toHaveBeenCalledOnce();
  });

  it('로고를 누르면 소개를 다시 연다', () => {
    render(<TopBar clock="수 14:10" skyIcon="☀️" onHome={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '4thIS-world 소개' }));
    expect(useUi.getState().screen).toBe('intro');
    useUi.getState().close();
  });
});

describe('PresencePanel', () => {
  const props = {
    entries: ENTRIES,
    offline: [] as typeof ENTRIES,
    spectators: 2,
    collapsed: false,
    onToggle: vi.fn(),
    onSelect: vi.fn(),
  };

  it('접속자 수, 동물 얼굴, 조종 표시, 구경 수', () => {
    render(<PresencePanel {...props} />);
    expect(screen.getByRole('button', { name: /접속 중 2/ })).toBeTruthy();
    const items = screen.getAllByRole('listitem');
    expect(within(items[0]!).getByRole('img', { name: '강아지' })).toBeTruthy();
    expect(items[0]!.textContent).toContain('(나)');
    expect(items[0]!.textContent).toContain('공강');
    expect(items[1]!.textContent).toContain('🎮 조종');
    expect(screen.getByText('👀 구경 중 2')).toBeTruthy();
  });

  it('이름을 누르면 onSelect, 머리를 누르면 onToggle', () => {
    render(<PresencePanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /지우/ }));
    expect(props.onSelect).toHaveBeenCalledWith('m2');
    fireEvent.click(screen.getByRole('button', { name: /접속 중/ }));
    expect(props.onToggle).toHaveBeenCalled();
  });

  it('오프라인 멤버는 아래에 따로, 접었다 펼 수 있고 누르면 onSelect', () => {
    const offline = [{ ...ENTRIES[1]!, id: 'm9', username: '민수', status: '캠퍼스 밖' }];
    const onSelect = vi.fn();
    render(<PresencePanel {...props} offline={offline} onSelect={onSelect} />);
    const list = screen.getByRole('list', { name: '오프라인 멤버' });
    expect(list.textContent).toContain('민수');
    expect(list.textContent).toContain('캠퍼스 밖');
    fireEvent.click(within(list).getByRole('button', { name: /민수/ }));
    expect(onSelect).toHaveBeenCalledWith('m9');
    fireEvent.click(screen.getByRole('button', { name: /오프라인 1/ }));
    expect(screen.queryByRole('list', { name: '오프라인 멤버' })).toBeNull();
  });

  it('로그인했으면 줄마다 📅로 그 사람 시간표를 연다 (관리자 캐릭터 줄은 없다)', () => {
    const onSchedule = vi.fn();
    const withAdmin = [...ENTRIES, { ...ENTRIES[1]!, id: 'admin', username: '관리자' }];
    render(<PresencePanel {...props} entries={withAdmin} onSchedule={onSchedule} />);
    fireEvent.click(screen.getByRole('button', { name: '지우 시간표' }));
    expect(onSchedule).toHaveBeenCalledWith('m2', '지우');
    expect(screen.queryByRole('button', { name: '관리자 시간표' })).toBeNull();
  });

  it('로그인하지 않았으면 📅가 없다', () => {
    render(<PresencePanel {...props} />);
    expect(screen.queryByRole('button', { name: /시간표$/ })).toBeNull();
  });

  it('오프라인 멤버가 없으면 그 칸을 그리지 않는다', () => {
    render(<PresencePanel {...props} />);
    expect(screen.queryByRole('button', { name: /오프라인/ })).toBeNull();
  });

  it('접으면 목록을 숨긴다', () => {
    render(<PresencePanel {...props} collapsed />);
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.getByRole('button', { name: /접속 중 2/ }).getAttribute('aria-expanded')).toBe(
      'false',
    );
  });
});

describe('EmoteBar (이모지 버튼)', () => {
  it('누르면 위로 펼쳐져 8개가 보이고, 고르면 보내고 닫힌다', () => {
    const onEmote = vi.fn();
    render(<EmoteBar disabled={false} onEmote={onEmote} />);
    expect(screen.queryByRole('button', { name: '🎉' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '이모지' }));
    expect(screen.getByRole('group', { name: '이모지 반응' })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^.{1,2}$/u })).toHaveLength(8);
    fireEvent.click(screen.getByRole('button', { name: '🎉' }));
    expect(onEmote).toHaveBeenCalledWith('🎉');
    expect(screen.queryByRole('group', { name: '이모지 반응' })).toBeNull();
  });

  it('바깥을 누르거나 Esc면 닫힌다', () => {
    render(<EmoteBar disabled={false} onEmote={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '이모지' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('group', { name: '이모지 반응' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '이모지' }));
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('group', { name: '이모지 반응' })).toBeNull();
  });

  it('비활성이면 펼칠 수 없다', () => {
    render(<EmoteBar disabled onEmote={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '이모지' }));
    expect(screen.queryByRole('group', { name: '이모지 반응' })).toBeNull();
  });
});

describe('MotionBar (모션 버튼)', () => {
  it('누르면 위로 8개가 펼쳐지고, 고르면 그 모션을 보내고 닫힌다', () => {
    const onMotion = vi.fn();
    render(<MotionBar disabled={false} onMotion={onMotion} />);
    fireEvent.click(screen.getByRole('button', { name: '모션' }));
    const group = screen.getByRole('group', { name: '모션' });
    expect(within(group).getAllByRole('button')).toHaveLength(8);
    fireEvent.click(screen.getByRole('button', { name: '눕기' }));
    expect(onMotion).toHaveBeenCalledWith('lie');
    expect(screen.queryByRole('group', { name: '모션' })).toBeNull();
  });

  it('비활성이면 펼칠 수 없다', () => {
    render(<MotionBar disabled onMotion={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '모션' }));
    expect(screen.queryByRole('group', { name: '모션' })).toBeNull();
  });
});

describe('ControlButton', () => {
  it('조종 전에는 조종하기, 중에는 자동으로', () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    const { rerender } = render(
      <ControlButton controlling={false} disabled={false} onStart={onStart} onStop={onStop} />,
    );
    fireEvent.click(screen.getByRole('button', { name: '🎮 조종하기' }));
    expect(onStart).toHaveBeenCalled();
    rerender(<ControlButton controlling disabled={false} onStart={onStart} onStop={onStop} />);
    fireEvent.click(screen.getByRole('button', { name: '🤖 자동으로' }));
    expect(onStop).toHaveBeenCalled();
  });
});

describe('BoardPanel', () => {
  it('외부 일정 목록과 빈 안내', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <BoardPanel
        entries={[{ memberId: 'm2', username: '지우', title: '알바', until: '18:00' }]}
        onClose={onClose}
      />,
    );
    expect(screen.getByRole('listitem').textContent).toBe('지우 · 알바 (~18:00)');
    fireEvent.click(screen.getByRole('button', { name: '게시판 닫기' }));
    expect(onClose).toHaveBeenCalled();
    rerender(<BoardPanel entries={[]} onClose={onClose} />);
    expect(screen.getByText(/외부 일정 중인 사람이 없어요/)).toBeTruthy();
  });
});

describe('ConnectionBadge', () => {
  it('끊겼을 때만 보인다', () => {
    const { rerender } = render(<ConnectionBadge state="connected" />);
    expect(screen.queryByRole('status')).toBeNull();
    rerender(<ConnectionBadge state="reconnecting" />);
    expect(screen.getByRole('status').textContent).toBe('재연결 중…');
  });
});

describe('BuildingPanel', () => {
  const props = {
    building: 'eng' as const,
    name: '공학관',
    floors: 3,
    hiddenAboveFloor: null,
    onFloor: vi.fn(),
    people: [
      { id: 'm2', username: '지우', status: '3학년 강의', floor: 3 },
      { id: 'm1', username: '철수', status: '1학년 강의', floor: 1 },
    ],
    onClose: vi.fn(),
  };

  it('층 버튼으로 위층을 숨긴다', () => {
    render(<BuildingPanel {...props} />);
    expect(screen.getByRole('button', { name: '전체' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: '2F' }));
    expect(props.onFloor).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByRole('button', { name: '전체' }));
    expect(props.onFloor).toHaveBeenCalledWith(null);
  });

  it('사람을 층 순서로 보여 준다', () => {
    render(<BuildingPanel {...props} />);
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual(['1F 철수 · 1학년 강의', '3F 지우 · 3학년 강의']);
  });

  it('1층 건물은 층 버튼이 없고, 빈 건물은 안내', () => {
    render(<BuildingPanel {...props} floors={1} people={[]} />);
    expect(screen.queryByRole('button', { name: '전체' })).toBeNull();
    expect(screen.getByText('지금 이 건물에 아무도 없어요.')).toBeTruthy();
  });
});

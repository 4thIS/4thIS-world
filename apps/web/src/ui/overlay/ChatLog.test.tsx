import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LOOK } from '@4this/shared';
import type { ChatLogProps } from '../contracts';
import { ChatLog } from './ChatLog';

afterEach(cleanup);

const props = (over: Partial<ChatLogProps> = {}): ChatLogProps => ({
  entries: [
    {
      key: '1',
      time: '14:05',
      username: '철수',
      look: DEFAULT_LOOK,
      text: '안녕하세요',
      isMe: false,
    },
    { key: '2', time: '14:06', username: '나', look: DEFAULT_LOOK, text: '반가워요', isMe: true },
  ],
  open: false,
  unread: false,
  onToggle: vi.fn(),
  ...over,
});

describe('ChatLog', () => {
  it('닫혀 있으면 ▲ 버튼만, 누르면 onToggle', () => {
    const p = props();
    render(<ChatLog {...p} />);
    expect(screen.queryByRole('log')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '채팅 기록 열기' }));
    expect(p.onToggle).toHaveBeenCalledOnce();
  });

  it('열리면 시간·이름·내용이 오래된 것부터 보인다', () => {
    render(<ChatLog {...props({ open: true })} />);
    const log = screen.getByRole('log', { name: '채팅 기록' });
    const rows = within(log).getAllByRole('listitem');
    expect(rows.map((r) => r.textContent)).toEqual(['14:05철수안녕하세요', '14:06나반가워요']);
    expect(screen.getByRole('button', { name: '채팅 기록 닫기' })).toBeTruthy();
  });

  it('비어 있으면 안내, 안 읽은 채팅이 있으면 버튼에 점', () => {
    render(<ChatLog {...props({ open: true, entries: [] })} />);
    expect(screen.getByText('아직 채팅이 없어요. 한마디 남겨 보세요!')).toBeTruthy();
    cleanup();
    render(<ChatLog {...props({ unread: true })} />);
    expect(screen.getByRole('button', { name: '채팅 기록 열기 (새 채팅)' })).toBeTruthy();
  });
});

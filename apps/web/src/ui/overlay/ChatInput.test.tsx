import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CHAT_MAX } from '@4this/shared';
import { ChatInput } from './ChatInput';

afterEach(cleanup);

const input = () => screen.getByRole('textbox', { name: '말풍선 채팅' }) as HTMLInputElement;

describe('ChatInput', () => {
  it('Enter로 보내고 비운다', () => {
    const onSend = vi.fn().mockReturnValue('sent');
    render(<ChatInput disabled={false} onSend={onSend} />);
    fireEvent.change(input(), { target: { value: '안녕' } });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(onSend).toHaveBeenCalledWith('안녕');
    expect(input().value).toBe('');
  });

  it('한글 조합 중 Enter는 보내지 않는다', () => {
    const onSend = vi.fn().mockReturnValue('sent');
    render(<ChatInput disabled={false} onSend={onSend} />);
    fireEvent.change(input(), { target: { value: '안' } });
    fireEvent.keyDown(input(), { key: 'Enter', isComposing: true });
    expect(onSend).not.toHaveBeenCalled();
  });

  it('너무 빨리 보내면 글을 남기고 알려 준다', () => {
    const onSend = vi.fn().mockReturnValue('tooFast');
    render(<ChatInput disabled={false} onSend={onSend} />);
    fireEvent.change(input(), { target: { value: '또' } });
    fireEvent.keyDown(input(), { key: 'Enter' });
    expect(input().value).toBe('또');
    expect(input().className).toContain('ov-chat__input--shake');
  });

  it('Esc는 비우고 빠져나온다', () => {
    render(<ChatInput disabled={false} onSend={vi.fn()} />);
    input().focus();
    fireEvent.change(input(), { target: { value: '쓰다가' } });
    fireEvent.keyDown(input(), { key: 'Escape' });
    expect(input().value).toBe('');
    expect(document.activeElement).not.toBe(input());
  });

  it('30자까지만 쓸 수 있고 남은 글자 수를 보여 준다', () => {
    render(<ChatInput disabled={false} onSend={vi.fn()} />);
    expect(input().maxLength).toBe(CHAT_MAX);
    fireEvent.change(input(), { target: { value: '가'.repeat(25) } });
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('버튼(방금 누른 이모지)에 포커스가 있어도 Enter는 입력칸으로 간다', () => {
    render(
      <>
        <button type="button">👋</button>
        <ChatInput disabled={false} onSend={vi.fn()} />
      </>,
    );
    const button = screen.getByRole('button', { name: '👋' });
    button.focus();
    fireEvent.keyDown(button, { key: 'Enter' });
    expect(document.activeElement).toBe(input());
  });

  it('아무 데서나 Enter를 누르면 입력칸으로 간다 (다른 입력칸에 쓰는 중이면 그대로)', () => {
    render(
      <>
        <input aria-label="다른 칸" />
        <ChatInput disabled={false} onSend={vi.fn()} />
      </>,
    );
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(document.activeElement).toBe(input());
    const other = screen.getByLabelText('다른 칸') as HTMLInputElement;
    other.focus();
    fireEvent.keyDown(other, { key: 'Enter' });
    expect(document.activeElement).toBe(other);
  });
});

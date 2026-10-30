import { useEffect, useLayoutEffect, useRef } from 'react';
import { AnimalFace } from '../common/AnimalFace';
import type { ChatLogProps } from '../contracts';

/** 맨 아래에서 이만큼(px) 안이면 새 채팅이 올 때 따라 내려간다 */
const STICK_PX = 40;

/**
 * 채팅 기록. 채팅 바 바로 오른쪽 삼각형(▲)을 누르면 위로 반투명 창이 펼쳐진다(오래된 것부터, 최신이 맨 아래).
 * 서버가 메모리에 들고 있는 최근 100개라 배포하면 비워진다. 닫혀 있을 때 새 채팅이 오면 ▲에 점.
 */
export function ChatLog({ entries, open, unread, onToggle }: ChatLogProps) {
  const list = useRef<HTMLOListElement>(null);
  const stick = useRef(true);

  // 열 때는 맨 아래부터
  useLayoutEffect(() => {
    if (open && list.current) list.current.scrollTop = list.current.scrollHeight;
    stick.current = true;
  }, [open]);

  // 새 채팅: 맨 아래를 보고 있었으면 따라 내려간다 (위를 읽는 중이면 그대로)
  useEffect(() => {
    if (open && stick.current && list.current) list.current.scrollTop = list.current.scrollHeight;
  }, [entries, open]);

  return (
    <>
      {open && (
        <section className="ov-chatlog" role="log" aria-label="채팅 기록">
          {entries.length === 0 ? (
            <p className="ov-chatlog__empty">아직 채팅이 없어요. 한마디 남겨 보세요!</p>
          ) : (
            <ol
              ref={list}
              className="ov-chatlog__list"
              onScroll={(e) => {
                const el = e.currentTarget;
                stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < STICK_PX;
              }}
            >
              {entries.map((e) => (
                <li
                  key={e.key}
                  className={e.isMe ? 'ov-chatlog__row ov-chatlog__row--me' : 'ov-chatlog__row'}
                >
                  <time className="ov-chatlog__time">{e.time}</time>
                  {e.look && <AnimalFace look={e.look} size={18} />}
                  <b className="ov-chatlog__name">{e.username}</b>
                  <span className="ov-chatlog__text">{e.text}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
      <button
        type="button"
        className="ov-chatlog__toggle"
        aria-label={
          open ? '채팅 기록 닫기' : unread ? '채팅 기록 열기 (새 채팅)' : '채팅 기록 열기'
        }
        aria-expanded={open}
        onClick={onToggle}
      >
        {open ? '▼' : '▲'}
        {unread && !open && <span className="ov-chatlog__dot" aria-hidden="true" />}
      </button>
    </>
  );
}

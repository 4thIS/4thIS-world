import { useEffect, useLayoutEffect, useState } from 'react';
import { useMediaQuery } from '../common/useMediaQuery';
import { useUi } from '../store';
import './guide.css';

/** 화면의 실제 버튼을 가리키는 말풍선. 그 버튼이 있을 때만 그린다 */
interface Callout {
  selector: string;
  text: string;
  /** 말풍선을 버튼 아래(▲)·위(▼)·왼쪽(▶) 어디에 둘지. auto면 화면 아래쪽 버튼은 위, 아니면 왼쪽 */
  side: Side | 'auto';
}

type Side = 'below' | 'above' | 'left';

const ARROWS: Record<Side, string> = { below: '▲', above: '▼', left: '▶' };

const CALLOUTS: Callout[] = [
  { selector: '.ov-topbar__home', text: '처음 시야로', side: 'below' },
  { selector: '.ov-presence__head', text: '이름을 누르면 그 캐릭터로', side: 'auto' },
  { selector: '.ov-control', text: '내 캐릭터 움직이기', side: 'above' },
];

interface Placed {
  text: string;
  side: Side;
  x: number;
  y: number;
}

/** 지금 화면에 있는 버튼들의 위치로 말풍선 자리를 잡는다 */
function placeCallouts(): Placed[] {
  return CALLOUTS.flatMap((c): Placed[] => {
    const el = document.querySelector(c.selector);
    if (!el) return [];
    const r = el.getBoundingClientRect();
    const side: Side =
      c.side !== 'auto' ? c.side : r.top > window.innerHeight / 2 ? 'above' : 'left';
    if (side === 'left') return [{ text: c.text, side, x: r.left, y: r.top + r.height / 2 }];
    return [
      { text: c.text, side, x: r.left + r.width / 2, y: side === 'below' ? r.bottom : r.top },
    ];
  });
}

/**
 * 조작법 힌트 오버레이. 소개 모달을 닫으면 뜨고, 상단 바 ❔로 다시 연다.
 * 아무 곳이나 누르거나 키·휠을 쓰면 닫힌다(그 입력은 월드에 넘기지 않는다).
 */
export function GuideOverlay() {
  const close = useUi((s) => s.close);
  const touch = useMediaQuery('(pointer: coarse)');
  const [callouts, setCallouts] = useState<Placed[]>([]);

  useLayoutEffect(() => {
    const place = () => setCallouts(placeCallouts());
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, []);

  useEffect(() => {
    const dismiss = (e: Event) => {
      // 카메라 키보드 조작·Esc 포커스 해제가 이 입력을 받지 않게 여기서 멈춘다
      e.stopPropagation();
      close();
    };
    const opts = { capture: true };
    window.addEventListener('pointerdown', dismiss, opts);
    window.addEventListener('keydown', dismiss, opts);
    window.addEventListener('wheel', dismiss, opts);
    return () => {
      window.removeEventListener('pointerdown', dismiss, opts);
      window.removeEventListener('keydown', dismiss, opts);
      window.removeEventListener('wheel', dismiss, opts);
    };
  }, [close]);

  return (
    <div className="guide" role="dialog" aria-modal="true" aria-label="조작법">
      <div className="guide__center">
        <h2 className="guide__title">이렇게 둘러봐요</h2>
        <div className="guide__cards">
          {touch ? (
            <>
              <GestureCard kind="one" label="한 손가락" text="돌리기" />
              <GestureCard kind="two" label="두 손가락" text="확대 · 옮기기" />
              <GestureCard kind="double" label="두 번 탭하고 끌기" text="옮기기" />
            </>
          ) : (
            <>
              <MouseCard kind="left" label="왼쪽 드래그" text="돌리기" />
              <MouseCard
                kind="right"
                label="오른쪽 드래그"
                text="옮기기"
                note="더블 클릭 후 드래그도 돼요"
              />
              <MouseCard kind="wheel" label="휠" text="확대 · 축소" />
            </>
          )}
        </div>
        <p className="guide__line">
          {touch
            ? '건물·캐릭터를 누르면 자세히 볼 수 있어요'
            : '⌨️ WASD 이동 · Q/E 회전 · 건물·캐릭터를 눌러 자세히 · Esc 처음 시야'}
        </p>
        <button type="button" className="ui-btn ui-btn--primary guide__ok" onClick={close}>
          알겠어요
        </button>
      </div>

      {callouts.map((c) => (
        <div
          key={c.text}
          className={`guide__callout guide__callout--${c.side}`}
          style={{ left: c.x, top: c.y }}
        >
          <span className="guide__arrow" aria-hidden="true">
            {ARROWS[c.side]}
          </span>
          <span className="guide__bubble">{c.text}</span>
        </div>
      ))}
    </div>
  );
}

/** 움직이는 마우스 그림 + 설명 */
function MouseCard({
  kind,
  label,
  text,
  note,
}: {
  kind: 'left' | 'right' | 'wheel';
  label: string;
  text: string;
  note?: string;
}) {
  const motion = kind === 'left' ? '↻' : kind === 'right' ? '✥' : '±';
  return (
    <figure className="guide__card">
      <div className={`guide-mouse guide-mouse--${kind}`} aria-hidden="true">
        <span className="guide-mouse__btn guide-mouse__btn--left" />
        <span className="guide-mouse__btn guide-mouse__btn--right" />
        <span className="guide-mouse__wheel" />
        <span className="guide-mouse__motion">{motion}</span>
      </div>
      <figcaption>
        <b>{label}</b>
        <span>{text}</span>
        {note && <small>{note}</small>}
      </figcaption>
    </figure>
  );
}

/** 움직이는 손가락 그림 + 설명 */
function GestureCard({
  kind,
  label,
  text,
}: {
  kind: 'one' | 'two' | 'double';
  label: string;
  text: string;
}) {
  return (
    <figure className="guide__card">
      <div className={`guide-touch guide-touch--${kind}`} aria-hidden="true">
        {kind === 'two' ? '✌️' : '☝️'}
      </div>
      <figcaption>
        <b>{label}</b>
        <span>{text}</span>
      </figcaption>
    </figure>
  );
}

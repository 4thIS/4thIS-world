import { useEffect, useId, type ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** 시간표·관리자처럼 넓은 화면 */
  wide?: boolean;
}

/** 월드 위에 뜨는 카드 모달. 바깥을 누르거나 Esc로 닫는다 */
export function Modal({ title, onClose, children, wide = false }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="ui-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={wide ? 'ui-modal ui-modal--wide' : 'ui-modal'}
      >
        <header className="ui-modal__head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="ui-icon-btn" aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}

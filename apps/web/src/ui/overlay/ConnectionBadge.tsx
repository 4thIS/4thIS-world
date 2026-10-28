import type { ConnectionBadgeProps } from '../contracts';

/** 소켓이 끊겼을 때만 보이는 배지 (설계 문서 §10) */
export function ConnectionBadge({ state }: ConnectionBadgeProps) {
  if (state === 'connected') return null;
  return (
    <span className="ov-badge" role="status">
      재연결 중…
    </span>
  );
}

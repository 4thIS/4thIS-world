import { KIND_INFO, KINDS } from '@4this/shared';
import { kindPlace } from './kindPlaces';

/** 일정 종류마다 캐릭터가 가는 곳: '● 1학년 강의 · 공학관 1층' */
export function KindLegend() {
  return (
    <ul className="sch-legend" aria-label="일정 종류별 위치">
      {KINDS.map((k) => (
        <li key={k}>
          <span className="sch-dot" style={{ background: KIND_INFO[k].color }} />
          <b>{KIND_INFO[k].label}</b>
          <span className="sch-legend__place">{kindPlace(k)}</span>
        </li>
      ))}
    </ul>
  );
}

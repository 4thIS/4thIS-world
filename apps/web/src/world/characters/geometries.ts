import {
  CapsuleGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * 지오메트리 캐시. 모든 캐릭터가 같은 모양을 공유하므로 처음 한 번만 만든다.
 * 컴포넌트는 `<mesh geometry={geo.sphere(0.5)} />`처럼 쓰고, Character 뿌리에
 * `dispose={null}`을 걸어 언마운트 때 공유 지오메트리가 지워지지 않게 한다.
 */
const cache = new Map<string, BufferGeometry>();

export function cachedGeometry<T extends BufferGeometry>(key: string, make: () => T): T {
  let g = cache.get(key);
  if (!g) {
    g = make();
    cache.set(key, g);
  }
  return g as T;
}

export const geo = {
  sphere: (r: number, w = 18, h = 14) =>
    cachedGeometry(`sphere:${r}:${w}:${h}`, () => new SphereGeometry(r, w, h)),
  /** 위쪽만 남긴 반구 모자 (thetaLength = 위에서부터 덮는 각) */
  dome: (r: number, thetaLength: number) =>
    cachedGeometry(
      `dome:${r}:${thetaLength}`,
      () => new SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, thetaLength),
    ),
  capsule: (r: number, len: number) =>
    cachedGeometry(`capsule:${r}:${len}`, () => new CapsuleGeometry(r, len, 4, 10)),
  cone: (r: number, h: number, seg = 12) =>
    cachedGeometry(`cone:${r}:${h}:${seg}`, () => new ConeGeometry(r, h, seg)),
  cylinder: (rTop: number, rBottom: number, h: number, seg = 24) =>
    cachedGeometry(
      `cyl:${rTop}:${rBottom}:${h}:${seg}`,
      () => new CylinderGeometry(rTop, rBottom, h, seg),
    ),
  /** 앞쪽(+z) 반원판. 모자 챙 */
  halfDisc: (r: number, h: number) =>
    cachedGeometry(
      `halfDisc:${r}:${h}`,
      () => new CylinderGeometry(r, r, h, 24, 1, false, -Math.PI / 2, Math.PI),
    ),
  torus: (r: number, tube: number, arc = Math.PI * 2) =>
    cachedGeometry(`torus:${r}:${tube}:${arc}`, () => new TorusGeometry(r, tube, 8, 28, arc)),
  circle: (r: number) => cachedGeometry(`circle:${r}`, () => new CircleGeometry(r, 18)),
  ring: (inner: number, outer: number) =>
    cachedGeometry(`ring:${inner}:${outer}`, () => new RingGeometry(inner, outer, 40)),
  ico: (r: number) => cachedGeometry(`ico:${r}`, () => new IcosahedronGeometry(r, 1)),
  roundedBox: (w: number, h: number, d: number, radius: number) =>
    cachedGeometry(
      `rbox:${w}:${h}:${d}:${radius}`,
      () => new RoundedBoxGeometry(w, h, d, 3, radius),
    ),
  /** 고양이 꼬리: 엉덩이에서 위로 말려 올라가는 곡선 (꼬리 피벗 기준) */
  catTail: () =>
    cachedGeometry(
      'catTail',
      () =>
        new TubeGeometry(
          new CatmullRomCurve3([
            new Vector3(0, -0.1, 0.03),
            new Vector3(0, -0.05, -0.27),
            new Vector3(0, 0.35, -0.32),
            new Vector3(0.1, 0.5, -0.17),
          ]),
          20,
          0.06,
          8,
        ),
    ),
};

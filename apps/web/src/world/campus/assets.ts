/**
 * 3D 모델 목록. 파일은 apps/web/public/assets/ 에 있다 (CREDITS.md 참고).
 * - scale: 원본 크기에 곱하는 배율 (Kenney는 KENNEY_SCALE, 의자는 앉는 면 기준)
 * - yaw: 모델 앞면이 +z(facing 0)를 보도록 더하는 회전 (라디안)
 * - box: 로딩 실패 때 대신 그리는 상자 크기 [가로 x, 높이 y, 깊이 z] (m, 배율 적용 후)
 * - seatRaw: 앉는 면 높이 (원본 단위). 앉는 모델은 seatRaw × scale = SEAT_HEIGHT가 되게 배율을 정한다
 */

/** 캐릭터(th)가 앉을 때 엉덩이 높이. 벤치·의자의 앉는 면을 여기에 맞춘다 (m) */
export const SEAT_HEIGHT = 0.45;

export interface ModelSpec {
  url: string;
  scale: number;
  yaw: number;
  box: readonly [w: number, h: number, d: number];
  /** KayKit처럼 공용 텍스처를 쓰는 모델이면 true (텍스처를 파스텔화), 아니면 재질 색을 파스텔화 */
  textured: boolean;
  /** 파스텔화한 뒤 곱할 색 (덤불을 더 초록으로 등). 없으면 흰색 */
  tint?: string;
  seatRaw?: number;
}

const kaykit = (
  file: string,
  scale: number,
  box: ModelSpec['box'],
  extra: Partial<ModelSpec> = {},
): ModelSpec => ({
  url: `/assets/kaykit/${file}.gltf`,
  scale,
  yaw: 0,
  box,
  textured: true,
  ...extra,
});

/** Kenney Furniture Kit은 원본이 작아서 모두 이 배율로 키운다 (책상 높이 약 0.77 m) */
export const KENNEY_SCALE = 2;

const kenney = (file: string, box: ModelSpec['box'], yaw = 0): ModelSpec => ({
  url: `/assets/kenney/${file}.glb`,
  scale: KENNEY_SCALE,
  yaw,
  box,
  textured: false,
});

/** Kenney 의자: 앉는 면(원본 seatRaw)이 SEAT_HEIGHT에 오도록 배율을 따로 정한다 */
const kenneyChair = (file: string, seatRaw: number, rawBox: ModelSpec['box']): ModelSpec => {
  const scale = SEAT_HEIGHT / seatRaw;
  return {
    ...kenney(file, [rawBox[0] * scale, rawBox[1] * scale, rawBox[2] * scale]),
    scale,
    seatRaw,
  };
};

export const MODELS = {
  // 앉는 면(원본 0.1)이 SEAT_HEIGHT가 되는 배율 4.5
  bench: kaykit('bench', SEAT_HEIGHT / 0.1, [1.8, 0.45, 0.68], { seatRaw: 0.1 }),
  streetlight: kaykit('streetlight', 3.8, [1, 3.65, 0.27]),
  bush: kaykit('bush', 3.4, [0.65, 1.3, 0.68], { tint: '#d4f2c8' }),
  trash: kaykit('trash_A', 5, [0.64, 0.26, 0.67]),
  desk: kenney('desk', [1.47, 0.77, 0.78]),
  chairDesk: kenneyChair('chairDesk', 0.247, [0.335, 0.608, 0.314]),
  laptop: kenney('laptop', [0.53, 0.32, 0.48]),
  computerScreen: kenney('computerScreen', [0.79, 0.59, 0.21]),
  computerKeyboard: kenney('computerKeyboard', [0.56, 0.06, 0.24]),
  bookcaseOpen: kenney('bookcaseOpen', [0.8, 1.76, 0.5]),
  bookcaseClosedWide: kenney('bookcaseClosedWide', [1.6, 1.58, 0.5]),
  books: kenney('books', [0.3, 0.21, 0.19]),
  pottedPlant: kenney('pottedPlant', [0.42, 1.31, 0.48]),
  plantSmall: kenney('plantSmall1', [0.19, 0.28, 0.19]),
  trashcan: kenney('trashcan', [0.42, 0.86, 0.47]),
  chair: kenneyChair('chair', 0.24, [0.2, 0.47, 0.2]),
  chairRounded: kenneyChair('chairRounded', 0.22, [0.2, 0.455, 0.2]),
  kitchenBar: kenney('kitchenBar', [0.86, 0.84, 0.42]),
  kitchenCoffeeMachine: kenney('kitchenCoffeeMachine', [0.38, 0.35, 0.48]),
  stoolBar: kenney('stoolBar', [0.53, 0.87, 0.46]),
  lampRoundTable: kenney('lampRoundTable', [0.3, 0.63, 0.35]),
} satisfies Record<string, ModelSpec>;

export type ModelName = keyof typeof MODELS;

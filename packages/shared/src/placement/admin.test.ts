import { describe, expect, it } from 'vitest';
import { CAMPUS } from '../campus/data';
import { LookSchema } from '../schema/look';
import { WorldResponseSchema } from '../schema/api';
import { ADMIN_ID, ADMIN_SPOT, DEFAULT_ADMIN_LOOK, adminPose } from './admin';
import { computeDay, sampleAt } from './index';

const at = (iso: string) => Date.parse(iso);

describe('관리자 캐릭터 위치', () => {
  const plan = computeDay({
    date: '2026-10-28',
    campus: CAMPUS,
    members: [{ id: ADMIN_ID, username: '관리자', look: DEFAULT_ADMIN_LOOK, schedules: [] }],
  });

  it('언제든 광장 한가운데에 서 있다 (새벽·낮·밤·주말)', () => {
    for (const iso of [
      '2026-10-28T03:00:00+09:00',
      '2026-10-28T12:30:00+09:00',
      '2026-10-28T23:59:00+09:00',
      '2026-10-31T15:00:00+09:00',
    ]) {
      const pose = sampleAt(plan, ADMIN_ID, at(iso));
      expect(pose).toEqual(adminPose());
    }
  });

  it('광장 중앙, 정문 쪽을 보고 선 포즈', () => {
    const pose = adminPose();
    expect(pose.position).toEqual([ADMIN_SPOT.pos[0], 0, ADMIN_SPOT.pos[1]]);
    expect(pose).toMatchObject({ pose: 'stand', placeId: 'plaza', floor: 1, opacity: 1 });
    expect(CAMPUS.graph.nodes.plaza).toEqual(ADMIN_SPOT.pos);
  });

  it('기본 생김새는 올바른 Look', () => {
    expect(LookSchema.safeParse(DEFAULT_ADMIN_LOOK).success).toBe(true);
  });
});

describe('WorldResponseSchema', () => {
  it('admin은 선택 필드다 (예전 응답도 통과)', () => {
    expect(WorldResponseSchema.safeParse({ serverTime: 1, members: [] }).success).toBe(true);
    const withAdmin = { serverTime: 1, members: [], admin: { look: DEFAULT_ADMIN_LOOK } };
    expect(WorldResponseSchema.parse(withAdmin).admin?.look).toEqual(DEFAULT_ADMIN_LOOK);
  });
});

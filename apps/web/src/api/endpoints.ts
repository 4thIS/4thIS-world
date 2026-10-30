import {
  WeatherResponseSchema,
  AdminLookSchema,
  AdminMemberSchema,
  AdminMembersResponseSchema,
  API,
  MeSchema,
  OkSchema,
  SchedulesResponseSchema,
  SessionSchema,
  WorldResponseSchema,
  type AdminLook,
  type AdminLoginRequest,
  type AdminPatchMemberRequest,
  type LoginRequest,
  type PatchMeRequest,
  type PutSchedulesRequest,
  type SignupRequest,
} from '@4this/shared';
import { request } from './http';

/** 서버 REST 전부. 화면 코드는 fetch 대신 이것만 쓴다 */
export const api = {
  world: () => request('GET', API.world, WorldResponseSchema),
  weather: () => request('GET', API.weather, WeatherResponseSchema),
  session: () => request('GET', API.session, SessionSchema),
  signup: (body: SignupRequest) => request('POST', API.signup, SessionSchema, body),
  login: (body: LoginRequest) => request('POST', API.login, SessionSchema, body),
  logout: () => request('POST', API.logout, OkSchema),
  adminLogin: (body: AdminLoginRequest) => request('POST', API.adminLogin, SessionSchema, body),
  me: () => request('GET', API.me, MeSchema),
  patchMe: (body: PatchMeRequest) => request('PATCH', API.me, MeSchema, body),
  deleteMe: () => request('DELETE', API.me, OkSchema),
  mySchedules: () => request('GET', API.mySchedules, SchedulesResponseSchema),
  putMySchedules: (body: PutSchedulesRequest) =>
    request('PUT', API.mySchedules, SchedulesResponseSchema, body),
  /** 관리자: 다른 사람 시간표 */
  adminSchedules: (id: string) => request('GET', API.adminSchedules(id), SchedulesResponseSchema),
  putAdminSchedules: (id: string, body: PutSchedulesRequest) =>
    request('PUT', API.adminSchedules(id), SchedulesResponseSchema, body),
  adminMembers: () => request('GET', API.adminMembers, AdminMembersResponseSchema),
  adminApprove: (id: string) => request('POST', API.adminApprove(id), AdminMemberSchema),
  adminReject: (id: string) => request('POST', API.adminReject(id), AdminMemberSchema),
  adminPatch: (id: string, body: AdminPatchMemberRequest) =>
    request('PATCH', API.adminMember(id), AdminMemberSchema, body),
  adminDelete: (id: string) => request('DELETE', API.adminMember(id), OkSchema),
  /** 관리자 캐릭터 생김새 (관리자만) */
  adminLook: (body: AdminLook) => request('PATCH', API.adminLook, AdminLookSchema, body),
  /** 백업은 파일 다운로드라 링크로 연다: <a href={api.backupUrl} download> */
  backupUrl: API.adminBackup,
};

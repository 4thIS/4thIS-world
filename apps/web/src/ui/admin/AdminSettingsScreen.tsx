import { useEffect, useState } from 'react';
import {
  WEAPONS,
  kstDate,
  kstMidnight,
  type AdminSettings,
  type PatchAdminSettings,
  type WeatherMode,
  type Weapon,
} from '@4this/shared';
import { api } from '../../api/endpoints';
import { useSession } from '../../store/session';
import { worldNow } from '../../store/world';
import { Modal } from '../common/Modal';
import { errorMessage } from '../errors';
import { WEAPON_LABELS } from '../overlay/WeaponBar';
import { useUi } from '../store';
import './admin.css';

const WEATHER_OPTIONS: { mode: WeatherMode; label: string }[] = [
  { mode: 'auto', label: '🛰️ 실제 날씨' },
  { mode: 'clear', label: '☀️ 맑음' },
  { mode: 'cloudy', label: '☁️ 흐림' },
  { mode: 'rain', label: '🌧️ 비' },
  { mode: 'snow', label: '🌨️ 눈' },
];

/** epoch ms → 'HH:MM' (KST) */
function hhmm(t: number): string {
  const m = Math.floor((t - kstMidnight(kstDate(t))) / 60_000);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** 오늘(실제 KST 날짜) 'HH:MM'이 되도록 캠퍼스 시계를 옮길 양 (ms) */
export function offsetFor(time: string, now = Date.now()): number {
  const [h, m] = time.split(':').map(Number);
  return kstMidnight(kstDate(now)) + ((h ?? 0) * 60 + (m ?? 0)) * 60_000 - now;
}

/**
 * 관리자 설정 (사이트 전체에 바로 반영): 장난감 쏘기는 하나만 켜거나 끄고,
 * 날씨는 실제 날씨 또는 고정, 시간은 실제 시각 또는 원하는 시각으로 옮긴다.
 */
export function AdminSettingsScreen() {
  const isAdmin = useSession((s) => s.session.kind === 'admin');
  const close = useUi((s) => s.close);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    api
      .adminSettings()
      .then((s) => alive && setSettings(s))
      .catch((err: unknown) => alive && setError(errorMessage(err)));
    return () => {
      alive = false;
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <Modal title="관리자 설정" onClose={close}>
        <p className="ui-note">관리자로 로그인해야 볼 수 있어요.</p>
      </Modal>
    );
  }

  const save = async (patch: PatchAdminSettings) => {
    setBusy(true);
    setError(null);
    try {
      setSettings(await api.patchAdminSettings(patch));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const weapon = settings?.weapon ?? null;
  const pickWeapon = (w: Weapon | null) => void save({ weapon: w });

  return (
    <Modal title="관리자 설정" onClose={close}>
      <div className="ui-form">
        {error && (
          <p className="ui-alert" role="alert">
            {error}
          </p>
        )}
        {!settings ? (
          !error && <p className="ui-note">불러오는 중…</p>
        ) : (
          <>
            <fieldset className="ui-chips adm-set" disabled={busy}>
              <legend>장난감 쏘기 (하나만)</legend>
              <button
                type="button"
                className="ui-chip"
                aria-pressed={weapon === null}
                onClick={() => pickWeapon(null)}
              >
                끄기
              </button>
              {WEAPONS.map((w) => (
                <button
                  key={w}
                  type="button"
                  className="ui-chip"
                  aria-pressed={weapon === w}
                  onClick={() => pickWeapon(w)}
                >
                  {WEAPON_LABELS[w].icon} {WEAPON_LABELS[w].name}
                </button>
              ))}
              <small className="adm-set__note">조종 중인 멤버가 버튼이나 F 키로 쏠 수 있어요</small>
            </fieldset>

            <fieldset className="ui-chips adm-set" disabled={busy}>
              <legend>날씨</legend>
              {WEATHER_OPTIONS.map((o) => (
                <button
                  key={o.mode}
                  type="button"
                  className="ui-chip"
                  aria-pressed={settings.weather === o.mode}
                  onClick={() => void save({ weather: o.mode })}
                >
                  {o.label}
                </button>
              ))}
              <small className="adm-set__note">고정하면 모든 사람의 캠퍼스가 그 날씨가 돼요</small>
            </fieldset>

            <fieldset className="adm-set" disabled={busy}>
              <legend>시간</legend>
              <p className="ui-note">
                지금 캠퍼스 시각 <b>{hhmm(worldNow())}</b>
                {settings.clockOffsetMs !== 0 && ' (옮겨 둠)'}
              </p>
              <div className="ui-row">
                <button
                  type="button"
                  className="ui-chip"
                  aria-pressed={settings.clockOffsetMs === 0}
                  onClick={() => void save({ clockOffsetMs: 0 })}
                >
                  🕒 실제 시각
                </button>
                <input
                  type="time"
                  className="ui-input adm-set__time"
                  aria-label="옮길 시각"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
                <button
                  type="button"
                  className="ui-btn ui-btn--small"
                  disabled={!time}
                  onClick={() => void save({ clockOffsetMs: offsetFor(time) })}
                >
                  이 시각으로
                </button>
              </div>
              <small className="adm-set__note">
                옮기면 모든 사람의 캠퍼스가 그 시각부터 흘러가요 (시간표·하늘·조명)
              </small>
            </fieldset>
          </>
        )}
      </div>
    </Modal>
  );
}

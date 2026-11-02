import { useEffect } from 'react';
import { kstMinutes } from '@4this/shared';
import { ambientMix, nextChirpIn } from '../../sound/ambient';
import { playSfx, setAmbient } from '../../sound/audio';
import { useWeather } from '../../store/weather';
import { useWorld } from '../../store/world';

/** 날씨·시각에 따라 빗소리·바람·새소리·귀뚜라미를 깐다 (1초마다 맞춘다) */
export function AmbientSound() {
  useEffect(() => {
    let nextChirp = 0;
    const tick = () => {
      const now = performance.now() / 1000;
      const mix = ambientMix(useWeather.getState().now, kstMinutes(useWorld.getState().now()) / 60);
      setAmbient(mix);
      if (mix.birds && now >= nextChirp) {
        playSfx('chirp', 0.5, 0.9 + Math.random() * 0.25);
        nextChirp = now + nextChirpIn();
      }
      if (mix.crickets && Math.random() < 0.6) playSfx('cricket', 0.5, 0.97 + Math.random() * 0.06);
    };
    const id = setInterval(tick, 1000);
    return () => {
      clearInterval(id);
      setAmbient({ rain: 0, wind: 0, birds: false, crickets: false });
    };
  }, []);
  return null;
}

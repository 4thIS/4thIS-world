# 말풍선 대사음 재료: 자음 10묶음 × 모음 7 = 70글자를 MeloTTS(한국어, MIT)로 읽혀 한 파일(sprite)로 묶는다
import numpy as np, soundfile as sf, torch, torchaudio
from melo.api import TTS

INITIALS = ['ㄱ','ㄴ','ㄷ','ㄹ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ','ㅎ']
I_INDEX = {'ㄱ':0,'ㄴ':2,'ㄷ':3,'ㄹ':5,'ㅁ':6,'ㅂ':7,'ㅅ':9,'ㅇ':11,'ㅈ':12,'ㅎ':18}
VOWELS = ['ㅏ','ㅓ','ㅗ','ㅜ','ㅡ','ㅣ','ㅔ']
V_INDEX = {'ㅏ':0,'ㅓ':4,'ㅗ':8,'ㅜ':13,'ㅡ':18,'ㅣ':20,'ㅔ':5}
SR = 22050
SLOT = 0.25      # 한 글자 자리 (초)
LEAD = 0.04      # 자리 안에서 소리 시작 (MP3 앞부분 지연 여유)
CLIP = 0.2       # 글자 소리 길이

tts = TTS(language='KR', device='cpu')
spk = tts.hps.data.spk2id['KR']
src_sr = tts.hps.data.sampling_rate

def syllable(i, v):
    return chr(0xAC00 + (I_INDEX[i] * 21 + V_INDEX[v]) * 28)

out = np.zeros(int(SR * SLOT * len(INITIALS) * len(VOWELS)), dtype=np.float32)
keys = []
k = 0
for ci in INITIALS:
    for vi in VOWELS:
        ch = syllable(ci, vi)
        audio = tts.tts_to_file(ch + '.', spk, None, speed=1.0, quiet=True)
        a = torchaudio.functional.resample(torch.tensor(audio, dtype=torch.float32), src_sr, SR).numpy()
        peak = np.max(np.abs(a)) or 1.0
        on = np.where(np.abs(a) > peak * 0.08)[0]
        start = max(0, on[0] - int(0.005 * SR)) if len(on) else 0
        clip = a[start:start + int(CLIP * SR)].copy()
        fade = int(0.03 * SR)
        clip[-fade:] *= np.linspace(1, 0, fade)
        clip = clip / (np.max(np.abs(clip)) or 1.0) * 0.9
        pos = int(SR * (k * SLOT + LEAD))
        out[pos:pos + len(clip)] = clip
        keys.append(ch)
        k += 1
        print(k, ch, flush=True)

# 64 KB 안팎. apps/web/public/sound/voice.mp3 로 복사한다 (자리 계산은 apps/web/src/sound/voice.ts와 같아야 한다)
sf.write('voice.mp3', out, SR, format='MP3', compression_level=0.95)
print('done')

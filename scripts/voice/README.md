# 말풍선 대사음 재료 만들기

`apps/web/public/sound/voice.mp3`는 오픈소스 TTS **MeloTTS**(한국어 모델, MIT 라이선스: https://huggingface.co/myshell-ai/MeloTTS-Korean)로 70글자(자음 10묶음 × 모음 7)를 읽혀 한 파일에 0.25초 간격으로 붙인 것이다. 사이트는 이 조각을 아주 짧게, 빠르고 높게 재생해 알아들을 수 없는 대사음을 만든다(`apps/web/src/sound/voice.ts`).

다시 만들 때 (로컬에서 한 번만, 사이트에는 들어가지 않는다):

```bash
uv venv --python 3.12 .venv
uv pip install --python .venv/Scripts/python.exe torch torchaudio --index-url https://download.pytorch.org/whl/cpu
# 파이썬 3.12에서 빌드되는 버전으로 덮어쓴다
printf "fugashi>=1.4\ntransformers==4.44.2\ntokenizers>=0.19,<0.20\n" > overrides.txt
uv pip install --python .venv/Scripts/python.exe --override overrides.txt "git+https://github.com/myshell-ai/MeloTTS.git"
uv pip install --python .venv/Scripts/python.exe python-mecab-ko
.venv/Scripts/python.exe gen_voice.py
```

윈도에서는 일본어 MeCab과 한국어 mecab이 같은 폴더 이름으로 부딪혀서 다음을 손봤다(로컬 가상환경만):

- `mecab-python3`를 지우고 `python-mecab-ko`만 둔다. `site-packages/eunjeon.py`에 `from mecab import MeCab as Mecab` 한 줄 (g2pkk가 윈도에서 eunjeon을 찾는다)
- `melo/text/cleaner.py`는 한국어만 import, `korean.py`·`english.py`의 `from .japanese import distribute_phone`은 같은 함수를 담은 `distribute.py`에서 가져오게

자리 규칙(`SLOT` 0.25초, `LEAD` 0.04초, 글자 순서: ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅎ × ㅏㅓㅗㅜㅡㅣㅔ)을 바꾸면 `voice.ts`도 같이 바꾼다.

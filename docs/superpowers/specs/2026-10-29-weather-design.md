# 실시간 날씨 설계

- 작성일: 2026-10-29 · 상태: 승인됨(팀장, B안) · 구현: 박찬우(`cw`) 한 PR

## 날씨 받기 (서버)

- Open-Meteo(키 없음), 좌표 기본 **명지전문대학 37.5844, 126.9251** (`WEATHER_LAT`·`WEATHER_LON`, `WEATHER=off`, `NODE_ENV=test`면 끔)
- `WeatherService`가 10분마다 받는다. 실패하면 이전 값 유지, 한 번도 못 받았으면 맑음
- `GET /api/weather` → `{ now: { kind, intensity, precipitation, temperature, code }, hours[24], updatedAt }`. 바뀌면 소켓 `weather:changed`
- WMO 코드 → `clear`·`cloudy`·`rain`·`snow` (`weatherKindOf`), 세기 0.2~1 (`intensityOf`)

## 동선 (placement)

`ComputeDayInput.wetHours`(오늘 0~23시 비·눈 여부). 자유 시간의 공원 조각이 비·눈 시간에 걸치면 실내로: 통학생은 카페, 기숙사생은 휴게실. 일정·점심은 그대로. 비 오는 시간이 바뀌면 계획을 다시 만든다.

## 화면

- 하늘: `withWeather(sky, now)`가 시각 하늘에 회색빛을 섞고 해를 약하게 (밤엔 어두운 남회색)
- 비: 빗줄기(최대 1400), 잔디가 살짝 어둡게 / 눈: 눈송이(최대 800)가 흔들리며 내리고 잔디가 하얗게, 많이 쌓이면 풀잎을 숨기고 지붕에 눈판(컷어웨이 중인 건물은 빼고)
- 파티클은 건물 위를 비워 실내에는 내리지 않는다
- 우산: 비·눈 올 때 건물 밖 1층에서 서거나 걷는 캐릭터 (`needsUmbrella`)
- 상단 바: 🌧️·❄️·☁️, 마우스를 올리면 "서대문구 · 비 2.1mm · 12°C"
- 시연: `?weather=rain|snow|cloudy|clear` (내 화면만, 하루 종일 그 날씨)

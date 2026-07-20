[닷 사이먼 (Dot Simon) — 신규 게임]  dot-games-host 추가용  2026-07-20

■ 무엇
  틱택토와 '완전히 동일한 골격'으로 만든 4구역 패턴 기억 게임(사이먼).
  · 인코딩: 틱택토의 EA/encodeFrame(CELL 열우선·600hex) 그대로 사용 — 불변식 준수.
  · DotPad: 동일 SDK 연결/키/그래픽·텍스트 출력, displayAllUp/Down 펄스.
  · TTS: 공용 /tts.js (TW_TTS) 사용. 소리는 Web Audio 톤(구역별 고유 음), 별도 음원 불필요.
  · 한/영 지원: ?lang=en 이면 영어 UI+영어 음성(TW_TTS.setLang), 없으면 한국어(틱택토와 동일 기본).

■ 설치 (dot-games-host 저장소)
  1) 이 zip 의 'dotsimon/' 폴더를 저장소 루트에 그대로 추가(틱택토/robo77 과 같은 위치).
     dotsimon/index.html
     dotsimon/dotpad-sdk/DotPadSDK-3.0.0.js   (틱택토 것과 동일 버전 복사본)
  2) 배포(dot-games-host 의 기존 배포 방식대로). 접속 확인: <게임호스트도메인>/dotsimon/index.html?embed=1&preview=0
  ※ 루트의 /tts.js, /api/tts 는 공용이라 그대로 사용(추가 작업 없음).

■ 게임 등록 (tw-app 의 games 테이블 — 틱택토처럼)
  · 동봉 SQL(dotsimon-register.sql) 참고. embed_url 의 도메인은 틱택토 embed_url 에서 복사.
  · 리스트 이미지: 히어로 1200x420, 썸네일 600x800 (관리자 업로더 사용 또는 hero_url/thumb_url 직접 지정).
  · detail(JSON)에 영어 제목/설명(titleEn/subtitleEn)·난이도/시간(diffEn/timeEn)·조작키(keysKo/En) 포함 → 영어 전환 시 정상 표기.

■ 조작
  화면/키보드: 1 2 3 4 또는 방향키로 구역 이동 + Enter/Space 선택, R 다시 듣기, N 새 게임.
  DotPad: F1~F4 = 네 구역, PanningAll = 순서 다시 듣기, LPF1 = 새 게임.

■ 진행
  라운드마다 순서가 1개씩 늘어남. 순서 감상(소리+핀 융기) → 따라 입력 → 정답이면 레벨업, 오답이면
  종료 후 "N단계까지 성공" 음성. 첫 시작은 시작 버튼/엔터(오디오 정책상 사용자 동작으로 오디오 해제).

■ 검증(전달 전)
  · 인라인 JS 문법 OK(node --check). encodeFrame → 600hex 확인. 구역 좌표 60x40 범위 내.
  · 인코딩 로직은 틱택토 소스와 동일(복사) → DotPad 출력 호환.
  · 실제 DotPad 실기 테스트는 배포 후 진행 권장(블루투스는 크롬/엣지).

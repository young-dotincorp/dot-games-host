[닷 배틀십 (Dot Battleship)] dot-games-host · 외부 자산 분리 표준  2026-07-20

■ 게임: 숨은 함선 격침(솔로)
  5×5 바다에 배 3척(3칸·2칸·2칸, 총 7칸)이 무작위로 숨음. 커서를 옮겨 발사 → 명중/빗나감/격침을
  소리+촉각+음성으로 안내. 모두 격침하면 승리(적은 발사 = 고득점). 시간 압박 없음(턴제·자기 페이스).

■ 촉각/음성(시각장애 최적화)
  · 발사 때마다 "3행 2열, 명중!" 처럼 좌표+결과 음성 → 눈 없이 위치 추적.
  · DotPad: 명중=칸 채움, 빗나감=십자 점, 커서=칸 내부 사각. 남은 배 수는 점자 숫자로 표시.
  · 효과음: 명중 고음/격침 2음/빗나감 저음/승리 3음(Web Audio, 음원 불필요).

■ 조작
  화면/키보드: 방향키 이동(좌표 음성), Enter/Space 발사, C 현재 칸, R 현황, N 새 게임.
  DotPad: Panning 이동, F1 발사, F2 현재 칸, F3 현황, PanningAll 개요, LPF1 새 게임.

■ 구조(신규 표준)
  dotbattle/
    index.html                 (코드; 자산은 assets/ 상대경로 참조)
    assets/                     (선택 — 지금은 CSS 바다 배경. 이미지 주시면 여기에 넣고 wiring)
    dotpad-sdk/DotPadSDK-3.0.0.js
  · 지금은 배경/마커가 CSS 라 '이미지 없이도 완전히 동작'합니다. 아트는 나중에 입히면 됩니다.

■ 배포
  dot-games-host 저장소에 'dotbattle/' 폴더 추가 → 재배포.
  확인: dot-games-host.vercel.app/dotbattle/index.html?embed=1&preview=0

■ 인코딩/불변식: EA·encodeFrame(600hex) 그대로. (5×5, 각 칸 12×8핀)

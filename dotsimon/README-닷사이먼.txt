[닷 사이먼 (Dot Simon)] dot-games-host · 배경/버튼 이미지 + 촉각 최적화 반영본  2026-07-20

■ 이번 반영
  1) 배경: 아케이드 배경(bg.webp)을 .stage 전체에 center/cover 로 적용(틱택토와 동일 방식).
  2) 버튼: 빨강/노랑/파랑/초록 원형 버튼 이미지 적용.
     · 업로드본은 모서리에 체크무늬가 박힌 RGB라, '원형으로 잘라 모서리를 투명 처리'했습니다.
     · 용량 절감 위해 WebP 로 변환(배경 212KB, 버튼 각 ~23KB). 최신 브라우저(크롬/엣지) 대상.
     · 색-구역 매핑: 초록=1(왼위), 빨강=2(오른위), 노랑=3(왼아래), 파랑=4(오른아래).
     · 평소엔 어둡게(dim), 켜질 때 밝아지며 빛나는 링(glow) — 소리+촉각과 시각이 함께.
  3) (직전 반영) 촉각 속도: 기본 '느리게'(핀 유지 ~2.1s) + 단계별 번호 음성 + 켜진 구역만 융기.

■ 파일 구성 (dotsimon/)
  index.html
  bg.webp            (1800x1120 배경)
  btn-green.webp / btn-red.webp / btn-yellow.webp / btn-blue.webp  (원형·투명 모서리)
  dotpad-sdk/DotPadSDK-3.0.0.js

■ 배포
  dot-games-host 저장소의 'dotsimon/' 폴더를 이 zip 내용으로 '통째로' 교체(이미지 5개 포함) → 재배포 → 하드 새로고침.
  ※ index.html 만 바꾸면 이미지가 없어 배경/버튼이 안 보입니다 — 폴더째 올려 주세요.
  게임 등록(games 테이블)·리스트용 히어로/썸네일은 그대로 두면 됩니다.

■ 확인
  dot-games-host.vercel.app/dotsimon/index.html?embed=1&preview=0
  → 아케이드 배경 위에 네 개의 원형 버튼(초록/빨강/노랑/파랑)이 2x2로. 재생 때 해당 버튼이 밝게 빛남.

■ 인코딩/불변식: EA·encodeFrame(600hex) 그대로.

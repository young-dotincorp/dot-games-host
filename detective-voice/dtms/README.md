# Detective Voice — DTMS 파일 폴더

Dot Pad에 자동으로 출력될 촉각 일러스트(.dtms) 14장을 **정확한 파일명**으로 이 폴더에 저장.

## 파일명 (이대로 정확하게)

### 화면 (1장)
- `splash.dtms` — 시작 화면 (CRT TV / 타이틀)

### 장면 (3장)
- `wine_bar.dtms` — 와인바 사건 현장 평면도
- `alley.dtms` — 가게 앞 골목
- `morgue.dtms` — 부검실

### 단서 (6장)
- `ev_broken_bottle.dtms` — 깨진 와인병
- `ev_receipt.dtms` — 23:42 POS 영수증
- `ev_text.dtms` — 휴대폰 메시지
- `ev_inventory.dtms` — 와인 재고 장부
- `ev_cctv.dtms` — 편의점 CCTV 화면
- `ev_autopsy.dtms` — 부검 보고서

### NPC (4장)
- `npc_park.dtms` — 박준영 (Park Jun-young)
- `npc_kim.dtms` — 김유진 (Kim Yu-jin)
- `npc_lee.dtms` — 이민지 (Lee Min-ji)
- `npc_choi.dtms` — 최동수 (Choi Dong-soo)

## 동작 방식

게임이 다음 화면으로 진입할 때 자동으로 해당 DTMS 파일을 fetch해서 Dot Pad에 출력해요:
- **사건 브리핑** → `splash.dtms`
- **현장 조사 화면** → `wine_bar.dtms`
- **단서 클릭** → 해당 단서 dtms (예: `ev_receipt.dtms`)
- **NPC 심문** → 해당 NPC dtms (예: `npc_park.dtms`)

Dot Pad 미연결 또는 dtms 파일 없음 → 조용히 패스 (게임은 그대로 진행).

## DTMS 파일 구조 (참고)

각 파일은 JSON 형식이고, 게임은 첫 페이지의 `graphic.data`를 그래픽 영역에, `braille.data` 또는 `text.data`(있으면)를 점자 영역에 출력해요.

```json
{
  "title": "ev_receipt",
  "device": "dotpad320",
  "items": [
    {
      "page": 1,
      "graphic": { "data": "0000000080484466..." },
      "braille": { "data": "..." }
    }
  ]
}
```

여러 페이지 dtms도 지원 가능 (향후 키 입력으로 페이지 넘기기 — Phase 2).

## 연결 환경

- **Chrome 또는 Edge 데스크톱**만 동작 (Safari/iOS는 Web Bluetooth 미지원)
- HTTPS 필수 — 깃헙 페이지(https://baekjunjoo.github.io/...) 자동 호환
- 로컬 테스트는 `python3 -m http.server` 또는 `npx serve`로 띄워야 함 (`file://`에서는 Web Bluetooth 불가)

## 게임 안에서 사용

1. SETUP 모달 열기 (헤더 ⚙ 또는 첫 진입 시 자동)
2. "🔌 Dot Pad" 섹션에서 `Connect via Bluetooth` 클릭 → 페어링
3. 게임 시작 → 화면 진입마다 자동으로 Dot Pad에 촉각 일러스트 표시

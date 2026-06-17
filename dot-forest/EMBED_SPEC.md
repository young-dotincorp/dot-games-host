# Dot Forest — Tactile World(TW) 임베드 통합 스펙

> **대상:** 프론트엔드 개발자 / **목적:** `forest_pro`(Dot Forest: Lumi & Dotlings)를
> Tactile World 허브 사이트에 `<iframe>`으로 안전하게 임베드하기 위한 구현 규격.
> 본 문서는 *무엇을·어디서·어떻게* 바꿔야 하는지를 실제 파일·셀렉터 기준으로 명시합니다.

- **저장소:** `github.com/byeol-coder/forest_pro`
- **현재 상태:** 단독 실행은 정상. 임베드 파라미터(`?embed`, `?preview`)·부모 통신(`postMessage`)·반응형 풀필 레이아웃은 **미구현 → 신규 작업**.
- **스택:** Three.js + Vite, 정적 자산(상대경로), DotPad Web Bluetooth(`DotPadSDK-3_0_0.js`).

---

## 1. URL 파라미터 규격

| 파라미터 | 기본값 | 동작 | 우선 적용 위치 |
|---|---|---|---|
| `?embed=1` | `0`(미임베드) | 임베드 모드 진입. 타이틀(선택) 화면·헤더/푸터 최소화, 나가기 버튼을 `exit` 전송으로 변경 | 부트 단계(아래 §2) |
| `?preview=0` | `1`(표시) | `DOT PAD PREVIEW` 스트립(`.tactile-dock`) 미렌더 | 부트 단계(아래 §3) |
| `?lang=ko\|en` | `ko` | 초기 언어 강제(선택). 부모가 `tw:setLang`로도 변경 가능 | i18n 초기화 |

구현 기준(부트 1회 파싱, 전역 플래그화):

```js
// 새 파일 권장: embed.js  (index.html에서 screens.js 보다 먼저 로드)
const Q = new URLSearchParams(location.search);
window.TW = {
  embed:   Q.get('embed')   === '1',
  preview: Q.get('preview') !== '0',   // 기본 표시, ?preview=0 일 때만 숨김
  lang:    Q.get('lang') || null,
};
document.documentElement.classList.toggle('is-embed', window.TW.embed);
document.documentElement.classList.toggle('no-preview', !window.TW.preview);
```

> 클래스 토글 방식을 쓰면 표시/숨김은 **CSS로** 처리되어 게임 로직(`script.js`)을 건드리지 않습니다.

---

## 2. 임베드 모드 (`?embed=1`)

### 2-1. 선택(타이틀) 메뉴 숨김
TW에서 게임 선택은 부모 허브가 담당하므로 자식의 타이틀/선택 화면은 건너뜁니다.

- **대상:** `#screen-title`(`.title-screen`), 그 안의 시작 핫스팟 `.dot-forest-start-hotspot[data-nav="game"]`, 보조 메뉴 `.intro-controls`.
- **동작:** 임베드 시 부트에서 곧장 게임 화면으로 진입.
  `screens.js`의 마지막 `show('title')`를 분기:
  ```js
  // screens.js 하단
  show(window.TW?.embed ? 'game' : 'title');
  ```
- **CSS(보강, 선택):** `html.is-embed #screen-title { display:none; }`

### 2-2. 헤더/푸터 등 불필요 UI 최소화
TW가 자체 상단/하단 크롬을 제공하므로 게임 자체 헤더는 최소화합니다.

- **게임 HUD:** `index.html:66` `.hud` — 임베드에서는 점수·빛 게이지 등 *플레이 필수 정보만* 남기고 잉여 버튼 축소.
  - 유지: `.hud-left`(나가기 버튼은 §2-3 규칙으로 변경), 점수 `#scoreText`, 빛 게이지 `#forestLightMeter`, 정보 듣기 `.info-keys`.
  - 숨김 권장: 전체화면 `#fullscreenBtn`(임베드에선 부모가 처리), 설정 진입 `.icon-btn[data-nav="settings"]`(선택 — 부모 메뉴로 대체 가능).
- **CSS 예:**
  ```css
  html.is-embed #fullscreenBtn { display:none; }
  ```
- **모바일 배너:** `#mobileBanner`(전체화면 오버레이)는 임베드에서 부모 레이아웃을 가리므로 `html.is-embed #mobileBanner{display:none!important}` 처리.

### 2-3. 나가기(뒤로가기) 버튼 기능 변경
- **대상:** `index.html:68`
  `<button class="icon-btn" data-nav="title" aria-label="타이틀 화면으로 나가기">☰</button>`
- **현재:** `screens.js`가 `[data-nav]` 클릭 시 `show('title')` 호출 → 임베드에선 숨긴 타이틀로 가버리는 잘못된 동작.
- **요구 동작(택1, A 권장):**
  - **A. 부모로 `exit` 전송:** 클릭 시 화면 전환 대신 `postMessage('dotforest:exit')`(§5)만 보냄. `aria-label`을 "게임 종료하고 목록으로"로 교체.
  - **B. 숨김:** 부모가 자체 뒤로가기 크롬을 제공하면 버튼 자체를 숨김(`html.is-embed .icon-btn[data-nav="title"]{display:none}`).
- **구현:** `screens.js` 클릭 핸들러에 가드 추가:
  ```js
  document.addEventListener('click', (e) => {
    const nav = e.target.closest('[data-nav]');
    if (!nav) return;
    // 임베드에서 'title' 이동은 부모 종료 신호로 치환
    if (window.TW?.embed && nav.dataset.nav === 'title') {
      e.preventDefault();
      TWBridge.exit('user');          // §5
      return;
    }
    show(nav.dataset.nav);
  });
  ```

---

## 3. 프리뷰 토글 (`?preview=0`)

- **대상:** `index.html:146` `<aside class="tactile-dock">` (제목 `촉각 지도 60×40 DotPad` + `#tactileCanvas` + `.legend`).
- **요구:** `?preview=0`일 때 **렌더 자체를 생략**하여 레이아웃 공간을 차지하지 않게 함.
- **구현(CSS 우선, 공간 회수 보장):**
  ```css
  html.no-preview .tactile-dock { display:none !important; }
  ```
- **주의:** `#tactileCanvas`로의 미러 그리기 루프가 있다면 숨김 시 그리기를 건너뛰도록 가드(불필요한 연산 방지). **단, 실제 DotPad 하드웨어 출력(`sendDotPadFrame`)은 프리뷰 토글과 무관하게 계속 동작해야 함** — `?preview=0`은 *화면 미리보기만* 끄는 것이지 촉각 출력을 끄는 것이 아님.

---

## 4. 크기·반응형 (부모 영역 풀필)

고정 px 레이아웃을 부모가 제공하는 영역에 꽉 차는 반응형으로 전환합니다.

- **루트 채움:**
  ```css
  html, body { margin:0; height:100%; }
  .app { width:100%; height:100%; min-height:100dvh; }
  ```
- **게임 캔버스:** `#gameCanvas`(`.game-canvas`)는 부모 stage를 100% 채우도록(`width:100%;height:100%`) 하고, 고정 width/height 속성 제거.
- **3D 리사이즈 동기화:** `script.js`의 `onResize()`(약 `script.js:1614`)가 렌더러/카메라를 컨테이너 크기에 맞추는지 확인.
  - 임베드 컨테이너 크기는 윈도우 `resize`만으로 안 잡힐 수 있으므로 **`ResizeObserver`** 로 `.game-canvas`를 관찰해 `onResize()`를 호출(없으면 추가).
  - 기존 패턴 재활용: `window.dispatchEvent(new Event('resize'))`로 트리거 가능(`screens.js:30` 참고).
- **검증:** iframe을 임의 비율(가로형·세로형·정사각)로 리사이즈해도 캔버스 왜곡/여백/스크롤바가 없어야 함.

---

## 5. 부모-자식 통신 (postMessage)

`ready` / `resize` / `exit` 3종을 **반드시** 지원합니다. 네임스페이스 접두사 `dotforest:`로 충돌을 방지하고, **오리진 검증**을 의무화합니다.

### 5-1. 메시지 스키마

**자식 → 부모(TW)**

| type | 시점 | payload |
|---|---|---|
| `dotforest:ready` | 게임 초기화·첫 프레임 준비 완료 | `{ game:'dot-forest', version:'1.0.0' }` |
| `dotforest:resize` | 콘텐츠 권장 크기 변동 시(선택) | `{ width:number, height:number }` |
| `dotforest:exit` | 사용자가 나가기/종료 트리거 | `{ reason:'user' }` |

**부모(TW) → 자식(권장 지원)**

| type | 동작 |
|---|---|
| `tw:pause` / `tw:resume` | 렌더 루프·오디오·TTS 일시정지/재개(탭 비활성·모달 등) |
| `tw:setLang` | `{ lang:'ko'\|'en' }` 로 언어 전환(`#langToggle` 클릭과 동일 경로) |

### 5-2. 자식 측 구현(신규 `embed.js`)

```js
const TW_ORIGIN = 'https://tactile-world.example';  // 실제 TW 오리진으로 교체. '*' 금지.

const TWBridge = {
  post(type, payload = {}) {
    if (window.parent === window) return;            // 단독 실행이면 no-op
    window.parent.postMessage({ type, payload }, TW_ORIGIN);
  },
  ready()        { this.post('dotforest:ready', { game:'dot-forest', version:'1.0.0' }); },
  resize(w, h)   { this.post('dotforest:resize', { width:w, height:h }); },
  exit(reason)   { this.post('dotforest:exit', { reason }); },
};
window.TWBridge = TWBridge;

// 부모 → 자식 수신(오리진 검증 필수)
window.addEventListener('message', (e) => {
  if (e.origin !== TW_ORIGIN) return;
  const { type, payload } = e.data || {};
  if (type === 'tw:pause')   window.DotForest?.bridge?.pause?.();
  if (type === 'tw:resume')  window.DotForest?.bridge?.resume?.();
  if (type === 'tw:setLang') {
    const lt = document.getElementById('langToggle');
    const cur = (document.documentElement.lang || 'ko');
    if (lt && payload?.lang && payload.lang !== cur) lt.click();
  }
});

// 초기화 완료 후 1회
TWBridge.ready();   // 게임 부트 완료 콜백 안에서 호출하는 것이 정확
```

### 5-3. 부모(TW) 측 참고 구현

```js
const frame = document.querySelector('#dotforest-frame');  // src=".../forest_pro/?embed=1"
window.addEventListener('message', (e) => {
  if (e.origin !== 'https://byeol-coder.github.io') return;   // 자식 오리진 검증
  const { type, payload } = e.data || {};
  if (type === 'dotforest:ready')  { /* 로딩 스피너 제거 */ }
  if (type === 'dotforest:resize') { /* 필요 시 iframe 높이 조정 */ }
  if (type === 'dotforest:exit')   { /* iframe 언마운트 → 게임 목록 복귀 */ }
});
```

> **보안:** 양측 모두 `postMessage`의 `targetOrigin`과 수신 `event.origin`을 명시·검증합니다. `'*'` 사용 금지.

---

## 6. 빌드 방식 — 게임당 독립 폴더

의존성 충돌·자산 경로 문제를 막기 위해 **게임 1개 = 자기완결적 폴더 1개**로 빌드합니다.

- **권장 산출 구조:**
  ```
  games/
    dot-forest/
      index.html
      assets/  models/  backgrounds/   (모두 폴더 내부, 상대경로만)
      *.js  *.css
      .nojekyll
  ```
- **Vite:** `vite.config.js`에 `base: './'`(또는 GitHub Pages 서브경로면 `'/forest_pro/'`)를 명시해 빌드 결과의 상대경로를 보장.
- **GitHub Pages:** 산출 폴더에 `.nojekyll` 포함, Pages 소스를 "GitHub Actions"로 설정.
- **자산 중복 정리(중요 — 현재 ~50MB 낭비):** 코드는 다음만 참조합니다.
  - 사용: `./models/lumi_walk.glb`(`script.js:496`), `./backgrounds/*.png`(`index.html:163` 등), `./assets/*`.
  - **미사용(제거 검토 대상):** 루트의 `lumi_walk.glb`·`lumi_run.glb`·`dotring.glb`(+ `models/lumi_run.glb`, `models/dotring.glb`는 코드 미참조), 루트의 `flower-garden.png`·`forest-home.png`·`lumi-hero.png`·`night-plaza.png`·`river-bridge.png`.
  - 제거 전 `grep -rn "<파일명>" .`로 어떤 CSS/JS에서도 참조하지 않는지 최종 확인 후 삭제.

---

## 7. 기타 준수 사항

### 7-1. DotPad Web Bluetooth 표준
- 연결: `connectDotPad()` → `DotPadSDK-3_0_0.js`. 미연결 시 `dotpad-adapter.js`의 `window.DotPadBridge` 시뮬레이션으로 폴백.
- 출력 지점: `sendDotPadFrame(matrix)`(60×40 → 300 byte pack → 600자 hex). **임베드/프리뷰 토글과 무관하게 항상 동작.**
- **iframe 권한:** Web Bluetooth는 `iframe`에서 Permissions Policy가 필요합니다. 부모는 반드시
  `<iframe ... allow="bluetooth">` 를 지정해야 하며, 연결 트리거는 사용자 제스처(버튼 클릭) 안에서 호출되어야 함.

### 7-2. 상대 경로 자산
- 모든 자산은 `./...` 상대경로 유지(현재 대체로 준수). 절대경로·만료되는 CDN URL 금지.

### 7-3. 접근성(ARIA)
- 임베드로 UI를 숨길 때 **포커스가 숨겨진 요소에 갇히지 않도록** 처리: 숨김 요소는 `display:none`(포커스 트리에서 제외)으로 제거. `visibility:hidden`만으로는 스크린리더가 인지할 수 있음.
- 게임 진입 시 포커스 타깃 `#gameHeading`으로 이동(현 `screens.js` 로직 유지).
- `aria-live` 내레이션·자막 미러(`narrative-engine.js`)는 임베드에서도 유지.
- 부모 페이지는 `<iframe title="Dot Forest 촉각 게임">` 제목을 제공.

---

## 8. 수용 기준 (QA 체크리스트)

- [ ] `?embed=1` 진입 시 타이틀/선택 화면이 보이지 않고 곧장 게임 화면.
- [ ] `?embed=1`에서 나가기 버튼이 타이틀로 가지 않고 `dotforest:exit`를 부모로 전송.
- [ ] `?embed=1`에서 전체화면 버튼·모바일 배너 등 잉여 크롬이 표시되지 않음.
- [ ] `?preview=0` 시 `.tactile-dock` 스트립이 **공간까지 사라짐**(레이아웃 회수 확인).
- [ ] `?preview=0`이어도 실제 DotPad 하드웨어 출력은 정상 동작.
- [ ] iframe을 가로/세로/정사각 임의 비율로 리사이즈해도 캔버스 왜곡·여백·스크롤바 없음.
- [ ] 초기화 완료 시 `dotforest:ready` 1회 수신(부모 스피너 제거 확인).
- [ ] 부모의 `tw:pause`/`tw:resume`로 렌더·오디오가 멈췄다 재개됨.
- [ ] 부모의 `tw:setLang`로 ko/en 전환 동작.
- [ ] 모든 `postMessage`가 오리진 검증을 통과하고 `'*'`를 쓰지 않음.
- [ ] `allow="bluetooth"` 부여 시 iframe 내에서 DotPad 연결 성공.
- [ ] 빌드 산출 폴더가 자기완결(상대경로) + `.nojekyll` 포함, 단독 배포 가능.
- [ ] 키보드 포커스가 숨겨진 UI에 갇히지 않음(스크린리더 점검 포함).

---

## 9. 작업 위치 요약 (파일 매핑)

| 작업 | 파일 / 위치 |
|---|---|
| URL 파라미터 파싱·전역 플래그 | **신규** `embed.js`(screens.js 앞 로드) |
| 임베드 시 game 직행 | `screens.js` 하단 `show(...)` |
| 나가기 버튼 → exit 치환 | `screens.js` `[data-nav]` 클릭 핸들러 / `index.html:68` |
| 프리뷰 숨김 | CSS(`html.no-preview .tactile-dock`) / `index.html:146` |
| 헤더·배너 최소화 | CSS(`html.is-embed ...`) / `index.html:66`(`.hud`), `#mobileBanner`, `#fullscreenBtn` |
| 반응형 풀필 + ResizeObserver | `style.css` 루트, `script.js` `onResize()`(~1614) |
| postMessage 브리지 | **신규** `embed.js`(`TWBridge`) |
| 빌드 base / 폴더 분리 / 중복 자산 정리 | `vite.config.js`, 저장소 루트 |

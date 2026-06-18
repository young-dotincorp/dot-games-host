# Dot Ocean SDK

An accessible tactile ocean game you drop into any page. The same world is delivered
through three channels at once — **visuals, spatial audio, and a 60×40 Dot Pad tactile
feed** — so blind and sighted players play together.

## Why it won't break your platform

- **Shadow DOM isolation** — the game renders inside a shadow root. The host page's CSS
  can't reach in, and the game's CSS can't leak out. Even a hostile global stylesheet
  (`* { color:red !important }`) leaves the widget untouched.
- **No build step** — one self-contained `dot-ocean.js` (CSS injected into the shadow,
  fish art inlined as base64, React bundled in). Just a `<script>`.
- **No namespace pollution** — it registers one custom element, `<dot-ocean>`. Events come
  off the element, not a global.

## 1. Declarative (recommended) — zero JS

```html
<script src="dot-ocean.js"></script>
<dot-ocean lang="ko" style="display:block;height:620px"></dot-ocean>
```

Attributes: `lang="ko|en"`, `high-contrast`, `reduced-motion`.
Give the element a height (or it falls back to `min-height:420px`).

Listen for gameplay events on the element:

```js
document.querySelector('dot-ocean')
  .addEventListener('dotocean:event', (e) => console.log(e.detail));
  // detail: { type:'discover'|'eat'|'levelup'|'danger', key?, level? }
```

## 2. Programmatic

```html
<div id="ocean" style="height:620px"></div>
<script src="dot-ocean.js"></script>
<script>
  const game = DotOcean.mount('#ocean', { lang:'ko', audioCues:true, captions:true,
    onEvent: (e) => console.log(e) });
  // game.destroy(); game.dotpad;
</script>
```

ESM / bundler: `import { mount } from '@dot-inc/dot-ocean'`.
CDN: `https://cdn.jsdelivr.net/npm/@dot-inc/dot-ocean/dist-sdk/dot-ocean.js`

## 3. Connecting a real Dot Pad (adapter injection)

The game calls `adapter.render(grid)` with a 60×40 matrix (`0` empty, `1` raised,
`2` player, `3` danger) whenever the tactile view changes. Default is a simulated pad.

```js
class WebBluetoothDotPad {
  connected = false;
  async connect() {
    this.device = await navigator.bluetooth.requestDevice({ filters:[{ namePrefix:'DotPad' }] });
    // connect GATT, cache characteristic...
    this.connected = true; return true;
  }
  render(grid) { if (!this.connected) return; /* packToDotPadFrame(grid) -> writeValue */ }
  disconnect() { this.device?.gatt?.disconnect(); this.connected = false; }
}

// custom element:
const el = document.querySelector('dot-ocean');
el.dotpad = new WebBluetoothDotPad();          // before it connects
await el.instance.dotpad.connect();            // from a user gesture (Bluetooth requires it)

// or programmatic:
const game = DotOcean.mount('#ocean', { dotpad: new WebBluetoothDotPad() });
await game.dotpad.connect();
```

Bluetooth needs HTTPS + a user gesture. Inside a cross-origin iframe it's usually blocked,
so for real hardware embed top-level or same-origin (e.g., directly on your hub).

## API

```ts
DotOcean.mount(target: string | HTMLElement, options?: DotOceanOptions): DotOceanInstance
// <dot-ocean lang reduced-motion high-contrast>  (el.dotpad = adapter; 'dotocean:event')

interface DotOceanOptions {
  lang?: 'ko'|'en'; sound?: boolean; tts?: boolean; audioCues?: boolean; captions?: boolean;
  verbose?: boolean; highContrast?: boolean; reducedMotion?: boolean;
  dotpad?: DotPadAdapter; onEvent?: (e: DotOceanEvent) => void;
}
interface DotOceanInstance { destroy(): void; readonly dotpad: DotPadAdapter; getElement(): HTMLElement; }
interface DotPadAdapter { readonly connected: boolean; connect(): Promise<boolean>; render(grid:number[][]): void; disconnect(): void; }
```

## Build from source

```bash
npm install
npm run build:lib   # -> dist-sdk/dot-ocean.js (IIFE) + dot-ocean.mjs (ESM)
npm run build       # -> dist/index.html (standalone full-page demo)
```

## Accessibility

Keyboard: arrows / WASD move · **Space** scan nearest · **Q** survey surroundings ·
**Esc** close. Every visual has an audio + tactile + text equivalent. Styles never touch
the host page's `body`, fonts, or layout.

## Troubleshooting — "the game doesn't show"

Ordered by how common it is. Open the browser console first; the SDK logs `[Dot Ocean] …` hints.

1. **Container has no height.** The #1 cause. A `<div>` with no height renders the game at 0px.
   `<dot-ocean>` falls back to `min-height:420px`, but always give an explicit height:
   `<dot-ocean style="height:620px">` or `#ocean { height: 620px }`. The SDK warns in the
   console when its box is under 40px tall.
2. **Script didn't load (404 / wrong path).** Symptom: `DotOcean is not defined`, or
   `<dot-ocean>` stays empty. Check the `<script src>` path and that the host serves `.js`
   with `Content-Type: text/javascript`.
3. **`mount()` ran before the script.** Put the `mount(...)` call *after* the SDK `<script>`,
   or use the `<dot-ocean>` element (needs no JS). `mount` throws a clear "target not found"
   if the selector matches nothing yet (SPA: mount in an effect after the node exists, and
   call `instance.destroy()` on unmount).
4. **Content-Security-Policy.** Strict CSP can block it three ways:
   - `script-src` — allowlist the SDK URL (or self-host).
   - `style-src` — the SDK injects a `<style>` into the shadow root, so allow `'unsafe-inline'`
     (or a nonce) for styles, else it renders unstyled.
   - `img-src` — fish art is inlined as `data:` URIs, so include `img-src data:` or the fish go blank.
   The `<dot-ocean>` element itself needs no inline script, which keeps `script-src` strict-friendly.
5. **WebGL unavailable** (old GPU, hardware-acceleration off, locked-down browser). The game
   doesn't go blank — it shows a "3D unavailable" message and the encyclopedia / quiz / Dot Pad
   keep working. The console logs the reason.
6. **Sandboxed cross-origin iframe.** `<iframe sandbox>` without `allow-scripts` blocks everything;
   Web Bluetooth (real Dot Pad) is also blocked cross-origin. For hardware, embed top-level or same-origin.
7. **SSR frameworks.** Importing the package on the server is safe (the custom element registers only
   in the browser), but only *render* it client-side (`'use client'` / `dynamic(..., { ssr:false })`).

Quick checks: `typeof DotOcean` should be `"object"`; `customElements.get('dot-ocean')` should be defined;
`DotOcean.version` tells you which build is live.

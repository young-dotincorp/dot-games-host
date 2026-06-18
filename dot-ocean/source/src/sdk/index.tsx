import { createRoot, type Root } from 'react-dom/client';
import { AppProvider, type InitialSettings } from '../state/AppContext';
import { ErrorBoundary } from '../components/ErrorBoundary';
import App from '../App';
import { SimulatedDotPad, WebBluetoothDotPad, type DotPadAdapter, type DotOceanEvent } from './DotPadAdapter';
import { parseEmbedParams } from '../embed/embedParams';
import css from '../styles.css?inline';

export interface DotOceanOptions extends InitialSettings {
  /** A real Dot Pad device adapter. Defaults to SimulatedDotPad.
   *  Pass `new WebBluetoothDotPad()` (or use `useBluetooth: true`) to enable real device output. */
  dotpad?: DotPadAdapter;
  /** Shortcut: when true, automatically uses WebBluetoothDotPad. */
  useBluetooth?: boolean;
  /** Fired on gameplay events (discover / eat / levelup / danger). */
  onEvent?: (e: DotOceanEvent) => void;
  /** Override embed/preview params. If omitted, parsed from the page URL. */
  embed?: boolean;
  showPreview?: boolean;
}

export interface DotOceanInstance {
  destroy(): void;
  readonly dotpad: DotPadAdapter;
  /** The internal root element inside the shadow tree. */
  getElement(): HTMLElement;
}

export const version = '3.1.0';

// Render the game inside a Shadow DOM so the host page's CSS can never reach in,
// and our CSS can never escape. `hostEl` becomes the shadow host.
function renderInShadow(hostEl: HTMLElement, options: DotOceanOptions): DotOceanInstance {
  const shadow = hostEl.shadowRoot ?? hostEl.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = css;                 // styles live inside the shadow tree only
  shadow.appendChild(style);
  const root = document.createElement('div');
  root.className = 'dot-ocean-root';
  shadow.appendChild(root);

  const adapter = options.dotpad ?? (options.useBluetooth ? new WebBluetoothDotPad() : new SimulatedDotPad());
  const urlParams = parseEmbedParams();
  const embedParams = {
    embed: options.embed ?? urlParams.embed,
    showPreview: options.showPreview ?? urlParams.showPreview,
    lang: urlParams.lang,
    hc: urlParams.hc,
    rm: urlParams.rm,
    gameId: urlParams.gameId,
  };
  const reactRoot: Root = createRoot(root);
  reactRoot.render(
    <ErrorBoundary>
      <AppProvider initial={options} adapter={adapter} onEvent={options.onEvent} embedParams={embedParams}>
        <App />
      </AppProvider>
    </ErrorBoundary>,
  );

  return {
    destroy() { reactRoot.unmount(); shadow.innerHTML = ''; },
    get dotpad() { return adapter; },
    getElement() { return root; },
  };
}

// Warn (dev aid) if the widget ends up with no height — the #1 "nothing shows" cause.
function warnIfCollapsed(el: HTMLElement): void {
  if (typeof requestAnimationFrame === 'undefined') return;
  requestAnimationFrame(() => {
    const h = el.getBoundingClientRect().height;
    if (h < 40) console.warn(`[Dot Ocean] container height is ${Math.round(h)}px — the game may be invisible. Give it a height, e.g. style="height:620px".`);
  });
}

/**
 * Programmatic mount. Creates an isolated Shadow-DOM widget inside `target`.
 *   DotOcean.mount('#ocean', { lang: 'ko', dotpad: myDevice, onEvent: console.log });
 * `target` should be a sized block element; the game fills it.
 */
export function mount(target: string | HTMLElement, options: DotOceanOptions = {}): DotOceanInstance {
  const host = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
  if (!host) throw new Error(`DotOcean.mount: target not found (${String(target)})`);
  const wrap = document.createElement('div');
  wrap.setAttribute('data-dot-ocean', '');
  wrap.style.cssText = 'display:block;width:100%;height:100%';
  host.appendChild(wrap);
  const inner = renderInShadow(wrap, options);
  warnIfCollapsed(wrap);
  return {
    destroy() { inner.destroy(); wrap.remove(); },
    get dotpad() { return inner.dotpad; },
    getElement() { return inner.getElement(); },
  };
}

// Declarative custom element: <dot-ocean lang="ko" style="height:620px"></dot-ocean>
// Registered lazily and guarded so importing this module under SSR (no DOM) is safe.
function registerElement(): void {
  if (typeof HTMLElement === 'undefined' || typeof customElements === 'undefined') return;
  if (customElements.get('dot-ocean')) return;
  class DotOceanElement extends HTMLElement {
    private _inst?: DotOceanInstance;
    dotpad?: DotPadAdapter;
    connectedCallback(): void {
      if (this._inst) return;
      const opts: DotOceanOptions = {
        lang: (this.getAttribute('lang') as 'ko' | 'en') || undefined,
        highContrast: this.hasAttribute('high-contrast') || undefined,
        reducedMotion: this.hasAttribute('reduced-motion') || undefined,
        dotpad: this.dotpad,
        useBluetooth: this.hasAttribute('use-bluetooth'),
        embed: this.hasAttribute('embed'),
        showPreview: !this.hasAttribute('no-preview'),
        onEvent: (e) => this.dispatchEvent(new CustomEvent('dotocean:event', { detail: e, bubbles: true, composed: true })),
      };
      this._inst = renderInShadow(this, opts);
      warnIfCollapsed(this);
    }
    disconnectedCallback(): void { this._inst?.destroy(); this._inst = undefined; }
    get instance(): DotOceanInstance | undefined { return this._inst; }
  }
  customElements.define('dot-ocean', DotOceanElement);
}
registerElement();

export const DotOcean = { mount, version, register: registerElement };
export { SimulatedDotPad, WebBluetoothDotPad };
export type { DotPadAdapter, DotOceanEvent };
export default DotOcean;

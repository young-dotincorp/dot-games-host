// postMessage bridge between the embedded game (iframe) and the host platform.
//
// Game → Host: status/event messages (one-way)
// Host → Game: control commands
//
// Security: only messages with `type` strings that begin with 'ocean:' are processed.
// The host origin is NOT verified (set to '*') because the iframe's origin can vary.
// If you need strict origin checking, set ALLOWED_ORIGINS below.

export type GameToHost =
  | { type: 'ocean:ready';          version: string; embed: boolean }
  | { type: 'ocean:stats';          level: number; discovered: number; total: number; xp: number }
  | { type: 'ocean:discover';       key: string; name: string }
  | { type: 'ocean:dotpad:status';  status: 'connected' | 'disconnected' | 'error' | 'unsupported'; detail?: string }
  | { type: 'ocean:error';          message: string };

export type HostToGame =
  | { type: 'ocean:lang';          lang: 'ko' | 'en' }
  | { type: 'ocean:hc';            enabled: boolean }
  | { type: 'ocean:rm';            enabled: boolean }
  | { type: 'ocean:pause';         paused: boolean }
  | { type: 'ocean:connect-dotpad' }    // prompts in-game connect UI (BLE picker still needs user click inside iframe)
  | { type: 'ocean:show-dotpad' };      // opens the Dot Pad panel

type HostMessageHandler = (msg: HostToGame) => void;

class PostMessageBridge {
  private handler: HostMessageHandler | null = null;
  private active = false;

  private readonly onMessage = (e: MessageEvent) => {
    if (!e.data || typeof e.data.type !== 'string') return;
    if (!String(e.data.type).startsWith('ocean:')) return;
    this.handler?.(e.data as HostToGame);
  };

  /** Send a message up to the host platform (no-op if not in an iframe). */
  send(msg: GameToHost): void {
    if (typeof window === 'undefined' || window === window.parent) return;
    try { window.parent.postMessage(msg, '*'); } catch { }
  }

  /** Register a handler for incoming host messages. Returns a cleanup fn. */
  listen(handler: HostMessageHandler): () => void {
    this.handler = handler;
    if (!this.active) {
      this.active = true;
      window.addEventListener('message', this.onMessage);
    }
    return () => {
      this.handler = null;
      window.removeEventListener('message', this.onMessage);
      this.active = false;
    };
  }
}

export const bridge = new PostMessageBridge();

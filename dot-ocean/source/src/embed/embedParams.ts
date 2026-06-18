// Parse URL query parameters for embed/platform mode.
// The game can be loaded standalone or embedded via <iframe src="...?embed=1&preview=0">.

export interface EmbedParams {
  /** ?embed=1 → platform iframe mode: no auto-tutorial, minimal chrome */
  embed: boolean;
  /** ?preview=0 → hide on-screen Dot Pad preview strip; real device output is UNAFFECTED */
  showPreview: boolean;
  /** ?lang=ko|en → language override */
  lang: 'ko' | 'en' | null;
  /** ?hc=1 → force high contrast */
  hc: boolean;
  /** ?rm=1 → force reduced motion */
  rm: boolean;
  /** ?game=dot-ocean → opaque identifier for the host platform */
  gameId: string | null;
}

export function parseEmbedParams(): EmbedParams {
  if (typeof window === 'undefined') {
    return { embed: false, showPreview: true, lang: null, hc: false, rm: false, gameId: null };
  }
  const p = new URLSearchParams(window.location.search);
  const rawLang = p.get('lang');
  return {
    embed: p.get('embed') === '1',
    showPreview: p.get('preview') !== '0',
    lang: rawLang === 'en' ? 'en' : rawLang === 'ko' ? 'ko' : null,
    hc: p.get('hc') === '1',
    rm: p.get('rm') === '1',
    gameId: p.get('game') ?? null,
  };
}

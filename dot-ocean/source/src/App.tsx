import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from './state/AppContext';
import { byKey, text, sizeScale } from './data/species';
import type { GameStats, CueInfo, SurveyItem, RadarData } from './engine/game';
import { TopBar } from './components/TopBar';
import { FloatingNav } from './components/FloatingNav';
import { GameCanvas } from './components/GameCanvas';
import { TactilePopup } from './components/TactilePopup';
import { RadarPad } from './components/RadarPad';
import { SettingsPanel } from './components/SettingsPanel';
import { Encyclopedia } from './components/Encyclopedia';
import { Mission } from './components/Mission';
import { Quiz } from './components/Quiz';
import { Tutorial } from './components/Tutorial';
import { DotMatrix } from './components/DotMatrix';
import { bridge } from './embed/postMessageBridge';

type Overlay = 'none' | 'tutorial' | 'settings' | 'encyclopedia' | 'mission' | 'quiz' | 'dotpad';

export default function App() {
  const a = useApp();
  const { ui, lang, highContrast, reducedMotion, showPreview, embedMode } = a;
  const [overlay, setOverlay] = useState<Overlay>(embedMode ? 'none' : 'tutorial');
  const [stats, setStats] = useState<GameStats>({ level: 1, xp: 0, xpNext: 200, sizeFactor: 1, discovered: 0, total: 1 });
  const [discovered, setDiscovered] = useState<Set<string>>(new Set());
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [radar, setRadar] = useState<number[][] | null>(null);
  const [padMode, setPadMode] = useState<'focus' | 'radar'>('radar');
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const lastFocus = useRef<string | null>(null);
  const scanRef = useRef<() => void>(() => {});
  const surveyRef = useRef<() => void>(() => {});

  const paused = overlay !== 'none';
  const blocking = paused;

  const dirText = useCallback((i: number) => ui.dir8[i] ?? '', [ui]);
  const distText = useCallback((d: 'near' | 'mid' | 'far') => (d === 'near' ? ui.distNear : d === 'mid' ? ui.distMid : ui.distFar), [ui]);
  const say = useCallback((msg: string) => { a.announce(msg); a.speak(msg); }, [a]);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  // postMessage: announce ready + listen for host commands
  useEffect(() => {
    bridge.send({ type: 'ocean:ready', version: '3.1.0', embed: embedMode });
    const cleanup = bridge.listen((msg) => {
      switch (msg.type) {
        case 'ocean:lang':        a.setLang(msg.lang); break;
        case 'ocean:hc':          a.setHighContrast(msg.enabled); break;
        case 'ocean:rm':          a.setReducedMotion(msg.enabled); break;
        case 'ocean:pause':       setOverlay(msg.paused ? 'settings' : 'none'); break;
        case 'ocean:show-dotpad': setOverlay('dotpad'); break;
        case 'ocean:connect-dotpad': setOverlay('dotpad'); break;
      }
    });
    return cleanup;
  }, [embedMode, a]);

  // postMessage: relay game stats upstream
  useEffect(() => {
    bridge.send({ type: 'ocean:stats', level: stats.level, discovered: stats.discovered, total: stats.total, xp: stats.xp });
  }, [stats]);

  // postMessage: relay Dot Pad connection status
  useEffect(() => {
    bridge.send({
      type: 'ocean:dotpad:status',
      status: a.dotpadStatus === 'connected' ? 'connected'
            : a.dotpadStatus === 'unsupported' ? 'unsupported'
            : a.dotpadStatus === 'error' ? 'error'
            : 'disconnected',
      detail: a.dotpadStatusDetail,
    });
  }, [a.dotpadStatus, a.dotpadStatusDetail]);

  // Loading veil: clears on first stats frame or after fallback timeout
  const markReady = useCallback(() => { if (!readyRef.current) { readyRef.current = true; setReady(true); } }, []);
  const onStats = useCallback((s: GameStats) => { setStats(s); markReady(); }, [markReady]);
  useEffect(() => { const t = setTimeout(markReady, 2500); return () => clearTimeout(t); }, [markReady]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && overlay !== 'tutorial') setOverlay('none'); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [overlay]);

  const onDiscover = useCallback((key: string, info?: CueInfo) => {
    setDiscovered((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    const s = byKey[key]; if (!s) return;
    const name = text(s, lang).name;
    bridge.send({ type: 'ocean:discover', key, name });
    a.sfx('discover');
    a.hostEvent?.({ type: 'discover', key });
    say(info ? ui.annDiscover(name, dirText(info.dir), distText(info.dist)) : ui.evDiscover(name));
  }, [a, ui, lang, dirText, distText, say]);

  const onFocus = useCallback((key: string | null) => {
    setFocusKey(key);
    if (key) { lastFocus.current = key; setPadMode('focus'); }
    else setPadMode('radar');
  }, []);

  const onEvent = useCallback((kind: 'eat' | 'levelup' | 'danger', key: string, level?: number, info?: CueInfo) => {
    const s = byKey[key];
    a.hostEvent?.({ type: kind, key, level });
    if (kind === 'eat') { a.sfx('eat'); if (a.verbose && s) say(ui.evEat(text(s, lang).name)); }
    else if (kind === 'levelup') { a.sfx('levelup'); say(ui.evLevelUp(level ?? stats.level)); }
    else if (kind === 'danger' && s) {
      a.sfx('danger');
      const name = text(s, lang).name;
      say(info ? ui.annDanger(name, dirText(info.dir)) : ui.evDanger(name));
    }
  }, [a, ui, lang, stats.level, dirText, say]);

  const onRadar = useCallback((d: RadarData) => {
    setRadar(d.grid);          // → screen preview (only shown when showPreview=true)
    a.dotpad.render(d.grid);   // → real Dot Pad device (always, regardless of showPreview)
  }, [a]);

  const onSurvey = useCallback((items: SurveyItem[], edges: number[]) => {
    if (!items.length && !edges.length) { say(ui.annNothing); return; }
    const parts: string[] = [];
    for (const it of items) {
      const s = byKey[it.key]; if (!s) continue;
      parts.push(ui.annSurveyItem(text(s, lang).name, dirText(it.dir), distText(it.dist), it.danger));
    }
    for (const e of edges) parts.push(ui.annEdge(dirText(e)));
    say(`${ui.annSurveyHead} ${parts.join(', ')}`);
  }, [ui, lang, dirText, distText, say]);

  const registerScan = useCallback((fn: () => void) => { scanRef.current = fn; }, []);
  const registerSurvey = useCallback((fn: () => void) => { surveyRef.current = fn; }, []);

  const openTutorialDone = useCallback(() => { a.initAudio(); a.sfx('select'); setOverlay('none'); }, [a]);

  const focusSpecies = lastFocus.current ? byKey[lastFocus.current] : null;

  return (
    <div className={'app' + (highContrast ? ' hc' : '') + (reducedMotion ? ' reduce' : '') + (embedMode ? ' embed' : '')}>
      <div className="game-layer" aria-hidden={blocking ? true : undefined}>
        <GameCanvas
          paused={paused}
          onStats={onStats}
          onDiscover={onDiscover}
          onFocus={onFocus}
          onEvent={onEvent}
          onRadar={onRadar}
          onSurvey={onSurvey}
          registerScan={registerScan}
          registerSurvey={registerSurvey}
        />
      </div>

      {!ready && (
        <div className="loading-veil" role="status" aria-live="polite">
          <span className="loader-orb" aria-hidden="true" />
          <span className="loader-text">{ui.loading}</span>
        </div>
      )}

      <TopBar level={stats.level} xp={stats.xp} xpNext={stats.xpNext}
        discovered={stats.discovered} total={stats.total}
        onSettings={() => { a.sfx('select'); setOverlay('settings'); }} />

      <FloatingNav
        onEncyclopedia={() => { a.sfx('select'); setOverlay('encyclopedia'); }}
        onMission={() => { a.sfx('select'); setOverlay('mission'); }}
        onQuiz={() => { a.sfx('select'); setOverlay('quiz'); }}
        onDotpad={() => { a.sfx('select'); setOverlay('dotpad'); }}
        onTutorial={() => { a.sfx('select'); setOverlay('tutorial'); }}
      />

      {/* Dot Pad on-screen preview — hidden when showPreview=false (real device output unaffected) */}
      {showPreview && overlay === 'none' && (
        focusKey
          ? <TactilePopup speciesKey={focusKey} />
          : (
            <div className="radar-mini glass" role="img" aria-label={ui.radarHint}>
              <div className="radar-mini-head"><span aria-hidden="true">⠿</span> {ui.radarMode}</div>
              <RadarPad grid={radar} ariaLabel={ui.radarHint} />
              <div className="dotpad-cap"><span className="sim">{ui.simLabel}</span><span className="res">60 × 40</span></div>
            </div>
          )
      )}

      {/* essential controls */}
      {overlay === 'none' && (
        <div className="play-controls">
          <button className="ctrl-btn" onClick={() => { surveyRef.current(); }} aria-label={ui.keySurvey}>
            <span aria-hidden="true">📡</span><small>{ui.surveyBtn}</small>
          </button>
          <button className="scan-fab" onClick={() => scanRef.current()} aria-label={ui.keyScan}>⌖</button>
        </div>
      )}

      {/* captions */}
      {overlay === 'none' && a.captions && a.caption && (
        <div className="caption-bar" aria-hidden="true">{a.caption}</div>
      )}

      {overlay === 'tutorial' && <Tutorial onDone={openTutorialDone} />}
      {overlay === 'settings' && <SettingsPanel onClose={() => setOverlay('none')} />}
      {overlay === 'encyclopedia' && <Encyclopedia discovered={discovered} onClose={() => setOverlay('none')} />}
      {overlay === 'mission' && <Mission discovered={discovered} level={stats.level} onClose={() => setOverlay('none')} />}
      {overlay === 'quiz' && <Quiz discovered={discovered} onClose={() => setOverlay('none')} />}
      {overlay === 'dotpad' && (
        <div className="overlay-scrim center" onClick={() => setOverlay('none')}>
          <div className="dotpad-modal glass" role="dialog" aria-label={ui.navDotpad} onClick={(e) => e.stopPropagation()}>
            <div className="panel-head">
              <h2>Dot Pad</h2>
              <button className="icon-btn" onClick={() => setOverlay('none')} aria-label={ui.close}>✕</button>
            </div>

            {/* Connection section */}
            <DotPadConnectSection />

            <div className="layer-toggle">
              <button aria-pressed={padMode === 'radar'} onClick={() => setPadMode('radar')}>{ui.radarMode}</button>
              <button aria-pressed={padMode === 'focus'} onClick={() => setPadMode('focus')} disabled={!focusSpecies}>{ui.focusMode}</button>
            </div>
            {padMode === 'radar' ? (
              <>
                <RadarPad grid={radar} ariaLabel={ui.radarHint} />
                <div className="dotpad-cap"><span className="sim">{ui.simLabel}</span><span className="res">60 × 40</span></div>
                <p className="empty small">{ui.radarHint}</p>
              </>
            ) : focusSpecies ? (
              <>
                <DotMatrix speciesKey={focusSpecies.key} scale={sizeScale(focusSpecies.sizeCm)} ariaLabel={`${text(focusSpecies, lang).name}`} />
                <div className="dotpad-cap"><span className="sim">{ui.simLabel}</span><span className="res">60 × 40</span></div>
                <button className="btn-primary touch-btn" onClick={() => {
                  const k = lastFocus.current; if (!k) return;
                  a.sfx('send');
                  const t = text(byKey[k], lang);
                  say(`${t.name}. ${t.tactile}`);
                }}>
                  ✋ {ui.touchWithDotpad}
                </button>
              </>
            ) : (
              <p className="empty small">{lang === 'ko' ? '가까운 생물에 다가가면 여기에 촉각 미리보기가 떠요.' : 'Approach a creature to see its tactile preview here.'}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Dot Pad connection UI with real BLE flow and ARIA status announcements. */
function DotPadConnectSection() {
  const a = useApp();
  const { ui, lang } = a;
  const [busy, setBusy] = useState(false);

  const statusLabel: Record<string, string> = {
    idle: '',
    scanning: lang === 'ko' ? '기기 검색 중...' : 'Scanning for device…',
    connecting: lang === 'ko' ? '연결 중...' : 'Connecting…',
    connected: lang === 'ko' ? '연결됨' : 'Connected',
    disconnected: lang === 'ko' ? '연결 해제됨' : 'Disconnected',
    error: a.dotpadStatusDetail ?? (lang === 'ko' ? '연결 오류' : 'Connection error'),
    unsupported: lang === 'ko'
      ? 'Web Bluetooth를 지원하지 않는 브라우저입니다. Chrome 또는 Edge를 사용해 주세요.'
      : 'Web Bluetooth is not supported. Please use Chrome or Edge.',
  };

  const handleConnect = async () => {
    if (busy || a.dotpadConnected) return;
    setBusy(true);
    a.initAudio();
    const ok = await a.dotpad.connect();
    setBusy(false);
    if (ok) { a.sfx('send'); a.announce(ui.evConnected); a.speak(ui.evConnected); }
    else if (a.dotpadStatus === 'error' || a.dotpadStatus === 'unsupported') {
      const msg = statusLabel[a.dotpadStatus] ?? '';
      a.announce(msg); a.speak(msg);
    }
  };

  const handleDisconnect = () => {
    a.dotpad.disconnect();
    const msg = lang === 'ko' ? 'Dot Pad 연결이 해제되었습니다.' : 'Dot Pad disconnected.';
    a.announce(msg); a.speak(msg);
  };

  return (
    <div className="dotpad-connect-section" aria-live="polite">
      <div className="dotpad-row">
        <span className={'dot-status' + (a.dotpadConnected ? ' on' : '')}>
          {a.dotpadConnected ? ui.connected : ui.off}
        </span>
        {a.dotpadConnected ? (
          <button className="btn-ghost btn-sm" onClick={handleDisconnect}>
            ✕ {lang === 'ko' ? '연결 해제' : 'Disconnect'}
          </button>
        ) : (
          <button
            className={'btn-ghost' + (busy ? ' loading' : '')}
            onClick={handleConnect}
            disabled={busy}
            aria-busy={busy}
          >
            {busy ? '⠿ ' : '🔗 '}{busy ? (lang === 'ko' ? '연결 중...' : 'Connecting…') : ui.connect}
          </button>
        )}
      </div>
      {(a.dotpadStatus === 'error' || a.dotpadStatus === 'unsupported') && (
        <p className="dotpad-error" role="alert">
          {statusLabel[a.dotpadStatus]}
        </p>
      )}
      {(a.dotpadStatus === 'scanning' || a.dotpadStatus === 'connecting') && (
        <p className="dotpad-hint" aria-live="polite">{statusLabel[a.dotpadStatus]}</p>
      )}
    </div>
  );
}

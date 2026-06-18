import { useEffect, useRef, useState } from 'react';
import { OceanGame, type GameStats, type CueInfo, type SurveyItem, type RadarData } from '../engine/game';
import { useApp } from '../state/AppContext';

interface Props {
  paused: boolean;
  onStats: (s: GameStats) => void;
  onDiscover: (key: string, info?: CueInfo) => void;
  onFocus: (key: string | null) => void;
  onEvent: (kind: 'eat' | 'levelup' | 'danger', key: string, level?: number, info?: CueInfo) => void;
  onRadar: (data: RadarData) => void;
  onSurvey: (items: SurveyItem[], edges: number[]) => void;
  registerScan: (fn: () => void) => void;
  registerSurvey: (fn: () => void) => void;
}

function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch { return false; }
}

export function GameCanvas({ paused, onStats, onDiscover, onFocus, onEvent, onRadar, onSurvey, registerScan, registerSurvey }: Props) {
  const { highContrast, reducedMotion, audioCues, cue } = useApp();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<OceanGame | null>(null);
  const [failed, setFailed] = useState(false);

  const flags = useRef({ highContrast, reducedMotion, paused, audioCues });
  flags.current = { highContrast, reducedMotion, paused, audioCues };

  const cbs = useRef({ onStats, onDiscover, onFocus, onEvent, onRadar, onSurvey, cue });
  cbs.current = { onStats, onDiscover, onFocus, onEvent, onRadar, onSurvey, cue };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!webglAvailable()) {
      console.warn('[Dot Ocean] WebGL is unavailable in this browser/context — showing the non-3D fallback (encyclopedia, quiz and Dot Pad still work).');
      setFailed(true); registerScan(() => {}); registerSurvey(() => {}); return;
    }

    let game: OceanGame;
    try {
      game = new OceanGame(
        canvas,
        {
          highContrast: () => flags.current.highContrast,
          reducedMotion: () => flags.current.reducedMotion,
          paused: () => flags.current.paused,
          audioCues: () => flags.current.audioCues,
        },
        {
          onStats: (s) => cbs.current.onStats(s),
          onDiscover: (k, i) => cbs.current.onDiscover(k, i),
          onFocus: (k) => cbs.current.onFocus(k),
          onEvent: (kind, k, lv, i) => cbs.current.onEvent(kind, k, lv, i),
          onRadar: (d) => cbs.current.onRadar(d),
          onSurvey: (items, edges) => cbs.current.onSurvey(items, edges),
          onCue: (pan, pitch, danger) => cbs.current.cue(pan, pitch, danger),
        },
      );
      game.start();
    } catch (e) {
      console.error('OceanGame init failed:', e);
      setFailed(true);
      registerScan(() => {});
      registerSurvey(() => {});
      return;
    }
    gameRef.current = game;
    registerScan(() => game.scanNearest());
    registerSurvey(() => game.survey());

    const kd = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();
      if (e.key === ' ') { game.scanNearest(); return; }
      if (e.key === 'q' || e.key === 'Q') { game.survey(); return; }
      game.setKey(e.key, true);
    };
    const ku = (e: KeyboardEvent) => game.setKey(e.key, false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);

    const toCanvas = (clientX: number, clientY: number) => {
      const r = canvas.getBoundingClientRect();
      const x = ((clientX - r.left) / r.width) * 2 - 1;
      const y = ((clientY - r.top) / r.height) * 2 - 1;
      const m = Math.hypot(x, y) || 1; const k = Math.min(1, m) / m;
      return { x: x * k, y: y * k };
    };
    let dragging = false;
    const pd = (e: PointerEvent) => { dragging = true; game.setPointer(toCanvas(e.clientX, e.clientY)); };
    const pm = (e: PointerEvent) => { if (dragging) game.setPointer(toCanvas(e.clientX, e.clientY)); };
    const pu = () => { dragging = false; game.setPointer(null); };
    canvas.addEventListener('pointerdown', pd);
    canvas.addEventListener('pointermove', pm);
    window.addEventListener('pointerup', pu);

    return () => {
      game.stop();
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      canvas.removeEventListener('pointerdown', pd);
      canvas.removeEventListener('pointermove', pm);
      window.removeEventListener('pointerup', pu);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="sea-canvas"
        style={failed ? { display: 'none' } : undefined}
        tabIndex={0}
        aria-label="바다 탐험 화면. 화살표 키 또는 WASD로 이동하고, Space로 가장 가까운 생물을 스캔하세요."
      />
      {failed && (
        <div className="sea-fallback" role="status">
          <div className="sea-fallback-inner">
            <div className="sf-badge">🌊 Dot Ocean</div>
            <p>이 브라우저에서는 3D 바다 화면(WebGL)을 켤 수 없어요. 백과사전·퀴즈·Dot Pad 촉각 기능은 그대로 사용할 수 있어요.</p>
            <p className="en">3D ocean (WebGL) is unavailable in this browser. Encyclopedia, Quiz and Dot Pad still work.</p>
          </div>
        </div>
      )}
    </>
  );
}

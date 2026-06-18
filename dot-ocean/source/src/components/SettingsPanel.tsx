import { useState } from 'react';
import { useApp } from '../state/AppContext';

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (b: boolean) => void }) {
  const { ui } = useApp();
  return (
    <button className="row-toggle" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span className="rt-label">{label}</span>
      <span className={'switch' + (on ? ' on' : '')}><i /></span>
      <span className="rt-state">{on ? ui.on : ui.off}</span>
    </button>
  );
}

function DotPadConnectRow() {
  const a = useApp();
  const { ui, lang } = a;
  const [busy, setBusy] = useState(false);

  const handleConnect = async () => {
    if (busy || a.dotpadConnected) return;
    setBusy(true);
    a.initAudio();
    const ok = await a.dotpad.connect();
    setBusy(false);
    if (ok) { a.sfx('send'); a.announce(ui.evConnected); a.speak(ui.evConnected); }
    else if (a.dotpadStatusDetail) {
      a.announce(a.dotpadStatusDetail);
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
        <span className={'dot-status' + (a.dotpadConnected ? ' on' : '')}>{a.dotpadConnected ? ui.connected : ui.off}</span>
        {a.dotpadConnected ? (
          <button className="btn-ghost btn-sm" onClick={handleDisconnect}>
            ✕ {lang === 'ko' ? '연결 해제' : 'Disconnect'}
          </button>
        ) : (
          <button className={'btn-ghost' + (busy ? ' loading' : '')} onClick={handleConnect} disabled={busy} aria-busy={busy}>
            {busy ? '⠿ ' : '🔗 '}{busy ? (lang === 'ko' ? '연결 중...' : 'Connecting…') : ui.connect}
          </button>
        )}
      </div>
      {(a.dotpadStatus === 'error' || a.dotpadStatus === 'unsupported') && (
        <p className="dotpad-error" role="alert" style={{ fontSize: '12px', color: 'var(--coral)', marginTop: '6px' }}>
          {a.dotpadStatusDetail ?? (lang === 'ko' ? '연결 오류' : 'Connection error')}
        </p>
      )}
    </div>
  );
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const a = useApp();
  const { ui } = a;
  return (
    <div className="overlay-scrim" onClick={onClose}>
      <aside className="settings-panel glass" role="dialog" aria-label={ui.settingsTitle} onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <h2>{ui.settingsTitle}</h2>
          <button className="icon-btn" onClick={onClose} aria-label={ui.close}>✕</button>
        </div>

        <div className="settings-group">
          <Toggle label={ui.sound} on={a.sound} onChange={a.setSound} />
          <Toggle label={ui.audioCues} on={a.audioCues} onChange={a.setAudioCues} />
          <Toggle label={ui.tts} on={a.tts} onChange={(v) => { a.setTts(v); if (v) a.speak(ui.tts); }} />
          <Toggle label={ui.verbose} on={a.verbose} onChange={a.setVerbose} />
          <Toggle label={ui.captions} on={a.captions} onChange={a.setCaptions} />
          <Toggle label={ui.highContrast} on={a.highContrast} onChange={a.setHighContrast} />
          <Toggle label={ui.reducedMotion} on={a.reducedMotion} onChange={a.setReducedMotion} />
        </div>

        <div className="settings-group">
          <div className="group-label">{ui.dotpadStatus}</div>
          <DotPadConnectRow />
        </div>

        <div className="settings-group">
          <div className="group-label">{ui.language}</div>
          <div className="lang-toggle">
            <button className={a.lang === 'ko' ? 'on' : ''} aria-pressed={a.lang === 'ko'} onClick={() => a.setLang('ko')}>한국어</button>
            <button className={a.lang === 'en' ? 'on' : ''} aria-pressed={a.lang === 'en'} onClick={() => a.setLang('en')}>English</button>
          </div>
        </div>

        <div className="settings-group">
          <div className="group-label">{ui.keyboardGuide}</div>
          <ul className="key-guide">
            <li><kbd>← ↑ → ↓</kbd> / <kbd>W A S D</kbd><span>{ui.keyMove}</span></li>
            <li><kbd>Space</kbd><span>{ui.keyScan}</span></li>
            <li><kbd>Q</kbd><span>{ui.surveyBtn}</span></li>
            <li><kbd>Esc</kbd><span>{ui.keyClose}</span></li>
          </ul>
        </div>
      </aside>
    </div>
  );
}

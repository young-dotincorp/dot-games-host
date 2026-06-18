import { useApp } from '../state/AppContext';

interface Props {
  level: number; xp: number; xpNext: number; discovered: number; total: number;
  onSettings: () => void;
}

export function TopBar({ level, xp, xpNext, discovered, total, onSettings }: Props) {
  const { ui } = useApp();
  const pct = Math.max(0, Math.min(100, (xp / xpNext) * 100));
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">🪸</span>
        <span className="brand-name">{ui.appName}</span>
      </div>

      <div className="xp-cluster" aria-label={`${ui.level}${level}, XP ${xp} / ${xpNext}`}>
        <span className="lv-chip">{ui.level}{level}</span>
        <div className="xp-track"><i style={{ width: pct + '%' }} /></div>
        <span className="xp-num">{xp} / {xpNext}</span>
      </div>

      <div className="topbar-right">
        <div className="found-chip" aria-label={`${ui.discovered} ${discovered} / ${total}`}>
          <span aria-hidden="true">📖</span>
          <b>{discovered}</b><small>/ {total}</small>
        </div>
        <button className="icon-btn" onClick={onSettings} aria-label={ui.settingsTitle}>⚙️</button>
      </div>
    </header>
  );
}

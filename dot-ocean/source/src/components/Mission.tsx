import { DISCOVERABLE, byKey } from '../data/species';
import { useApp } from '../state/AppContext';

interface Props { discovered: Set<string>; level: number; onClose: () => void; }

export function Mission({ discovered, level, onClose }: Props) {
  const { ui, lang } = useApp();
  const dangerFound = DISCOVERABLE.some((s) => discovered.has(s.key) && s.danger >= 2);

  const missions = [
    { ko: '첫 번째 바다 생물 발견하기', en: 'Discover your first sea creature', cur: Math.min(discovered.size, 1), goal: 1 },
    { ko: '바다 생물 3종 발견하기', en: 'Discover 3 sea creatures', cur: Math.min(discovered.size, 3), goal: 3 },
    { ko: '위험한 생물 만나기 (독성/포식자)', en: 'Meet a dangerous creature (toxic/predator)', cur: dangerFound ? 1 : 0, goal: 1 },
    { ko: '레벨 5 도달하기', en: 'Reach level 5', cur: Math.min(level, 5), goal: 5 },
    { ko: `모든 생물 발견하기`, en: 'Discover every creature', cur: discovered.size, goal: DISCOVERABLE.length },
  ];

  return (
    <div className="mode-screen">
      <div className="mode-head">
        <h1>{ui.missionTitle}</h1>
        <button className="icon-btn" onClick={onClose} aria-label={ui.close}>✕</button>
      </div>
      <p className="mode-intro">{ui.missionIntro}</p>
      <ul className="mission-list">
        {missions.map((m, i) => {
          const done = m.cur >= m.goal;
          return (
            <li key={i} className={'mission-item' + (done ? ' done' : '')}>
              <span className="mi-check" aria-hidden="true">{done ? '✓' : ''}</span>
              <div className="mi-body">
                <span className="mi-title">{lang === 'ko' ? m.ko : m.en}</span>
                <span className="mi-prog">{done ? ui.missionDone : ui.missionProgress(m.cur, m.goal)}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mode-hint">{lang === 'ko'
        ? `발견한 생물: ${[...discovered].map((k) => byKey[k]?.ko.name).filter(Boolean).join(', ') || '없음'}`
        : `Discovered: ${[...discovered].map((k) => byKey[k]?.en.name).filter(Boolean).join(', ') || 'none'}`}</p>
    </div>
  );
}

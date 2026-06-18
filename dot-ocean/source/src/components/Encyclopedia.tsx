import { useMemo, useState } from 'react';
import { DISCOVERABLE, byKey, text, sizeScale, CATEGORIES, type Species, type Category } from '../data/species';
import { useApp } from '../state/AppContext';
import { DotMatrix } from './DotMatrix';

const dangerColor = ['var(--d0)', 'var(--d1)', 'var(--d2)', 'var(--d3)'];
const levelColor = ['var(--bio)', 'var(--amber)', 'var(--coral)'];

function Detail({ s, onBack }: { s: Species; onBack: () => void }) {
  const a = useApp();
  const { ui, lang } = a;
  const t = text(s, lang);
  const sc = sizeScale(s.sizeCm);
  const [layer, setLayer] = useState<'sil' | 'parts'>('sil');
  return (
    <div className="ency-detail">
      <button className="btn-ghost back-btn" onClick={onBack}>← {ui.back}</button>
      <div className="detail-head">
        <h3>{t.name}<small>{lang === 'ko' ? s.en.name : s.ko.name} · {s.sizeCm} cm</small></h3>
        <div className="detail-badges">
          <span className="pill" style={{ background: levelColor[s.tactileLevel - 1] + '22', color: levelColor[s.tactileLevel - 1] }}>
            {ui.tactileLevel}: {ui.tactileLevels[s.tactileLevel - 1]}
          </span>
          <span className="pill" style={{ background: dangerColor[s.danger] + '22', color: dangerColor[s.danger] }}>{ui.danger[s.danger]}</span>
        </div>
      </div>

      <div className="dotpad-shell">
        <DotMatrix speciesKey={s.key} layer={layer} scale={sc} ariaLabel={`${t.name}, ${t.tactile}`} />
        <div className="dotpad-cap">
          <span className="sim">{ui.simLabel}</span><span className="res">60 × 40</span>
        </div>
        <div className="layer-toggle">
          <button aria-pressed={layer === 'sil'} onClick={() => setLayer('sil')}>{ui.silhouette}</button>
          <button aria-pressed={layer === 'parts'} onClick={() => setLayer('parts')}>{ui.partsLayer}</button>
        </div>
      </div>

      <p className="tactile-line">“{t.tactile}”</p>

      <div className="sr-desc" role="group" aria-label={ui.srDescTitle}>
        <p>{t.sr}</p>
        <button className="btn-ghost" onClick={() => { a.sfx('send'); a.announce(t.sr); a.speak(t.sr); }}>
          🔊 {ui.hearDescription}
        </button>
      </div>

      <div className="facts">
        <div className="fact"><div className="k">{ui.scientific}</div><div className="v em">{s.scientific}</div></div>
        <div className="fact"><div className="k">{ui.classification}</div><div className="v">{t.classification}</div></div>
        <div className="fact"><div className="k">{ui.bodyShape}</div><div className="v">{t.bodyShape}</div></div>
        <div className="fact"><div className="k">{ui.size}</div><div className="v">{s.sizeCm} cm</div></div>
        <div className="fact"><div className="k">{ui.tailShape}</div><div className="v">{t.tailShape}</div></div>
        <div className="fact"><div className="k">{ui.finPos}</div><div className="v">{t.finPos}</div></div>
        <div className="fact"><div className="k">{ui.habitat}</div><div className="v">{t.habitat}</div></div>
        <div className="fact"><div className="k">{ui.region}</div><div className="v">{t.region}</div></div>
      </div>

      <div className="fact wide"><div className="k">{ui.ecology}</div><div className="v">{t.ecology}</div></div>

      <div className="fact wide">
        <div className="k">{ui.features}</div>
        <ul className="feat-list">{t.features.map((f, i) => <li key={i}>{f}</li>)}</ul>
      </div>

      <div className="foodchain">
        <div className="k">{ui.foodchain}</div>
        <div className="fc-row">
          <span className="fc-cell">{t.prey}</span>
          <span className="fc-arrow">→ {t.name} →</span>
          <span className="fc-cell">{t.predator}</span>
        </div>
        <div className="fc-legend"><span>{ui.eats}</span><span>{ui.eatenBy}</span></div>
      </div>

      <button className="btn-primary touch-btn" onClick={() => { a.sfx('send'); const msg = `${t.name} ${ui.sentToPad}`; a.announce(msg); a.speak(`${t.name}. ${t.tactile}`); }}>
        ✋ {ui.touchWithDotpad}
      </button>
    </div>
  );
}

export function Encyclopedia({ discovered, onClose }: { discovered: Set<string>; onClose: () => void }) {
  const a = useApp();
  const { ui, lang } = a;
  const [selected, setSelected] = useState<string | null>(null);
  const [cat, setCat] = useState<Category | 'all'>('all');
  const [diff, setDiff] = useState<number>(0); // 0 = all
  const [query, setQuery] = useState('');

  const total = DISCOVERABLE.length;
  const found = DISCOVERABLE.filter((s) => discovered.has(s.key)).length;

  // categories present in the catalogue, in display order
  const cats = useMemo(() => CATEGORIES.filter((c) => DISCOVERABLE.some((s) => s.category === c)), []);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DISCOVERABLE.filter((s) => {
      if (cat !== 'all' && s.category !== cat) return false;
      if (diff !== 0 && s.tactileLevel !== diff) return false;
      if (q) {
        if (!discovered.has(s.key)) return false; // can't search hidden names
        return s.ko.name.toLowerCase().includes(q) || s.en.name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [cat, diff, query, discovered]);

  const allDone = found === total;

  return (
    <div className="mode-screen">
      <div className="mode-head">
        <h1>{ui.encyTitle}</h1>
        <div className="mode-progress" aria-label={`${ui.encyProgress} ${found} / ${total}`}>
          <div className="mp-track"><i style={{ width: (found / total) * 100 + '%' }} /></div>
          <span>{found} / {total}</span>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label={ui.close}>✕</button>
      </div>

      {selected ? (
        <Detail s={byKey[selected]} onBack={() => { a.sfx('select'); setSelected(null); }} />
      ) : found === 0 ? (
        <p className="empty">{ui.encyEmpty}</p>
      ) : (
        <div className="ency-browse">
          {allDone && (
            <div className="all-found" role="status">
              <span className="af-mark" aria-hidden="true">🏆</span>
              <div><strong>{ui.allFound}</strong><p>{ui.allFoundHint}</p></div>
            </div>
          )}

          <div className="ency-toolbar">
            <input
              className="ency-search" type="search" value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={ui.searchPlaceholder} aria-label={ui.searchPlaceholder}
            />
            <div className="filter-row" role="group" aria-label={ui.navEncyclopedia}>
              <button className={'chip' + (cat === 'all' ? ' on' : '')} aria-pressed={cat === 'all'} onClick={() => { a.sfx('select'); setCat('all'); }}>{ui.filterAll}</button>
              {cats.map((c) => (
                <button key={c} className={'chip' + (cat === c ? ' on' : '')} aria-pressed={cat === c} onClick={() => { a.sfx('select'); setCat(c); }}>{ui.categories[c]}</button>
              ))}
            </div>
            <div className="filter-row" role="group" aria-label={ui.tactileLevel}>
              <button className={'chip sm' + (diff === 0 ? ' on' : '')} aria-pressed={diff === 0} onClick={() => setDiff(0)}>{ui.tactileLevel}: {ui.filterAll}</button>
              {[1, 2, 3].map((d) => (
                <button key={d} className={'chip sm' + (diff === d ? ' on' : '')} aria-pressed={diff === d} onClick={() => setDiff(d)}>{ui.tactileLevels[d - 1]}</button>
              ))}
            </div>
            <span className="ency-count" aria-live="polite">{ui.resultCount(list.length)}</span>
          </div>

          {list.length === 0 ? (
            <p className="empty">{ui.noResults}</p>
          ) : (
            <div className="ency-grid">
              {list.map((s) => {
                const known = discovered.has(s.key);
                const t = text(s, lang);
                if (!known) {
                  return (
                    <div key={s.key} className="ency-card locked" aria-label={`${ui.undiscovered}. ${ui.lockedHint}`}>
                      <div className="ec-mini lockmark" aria-hidden="true">?</div>
                      <h4>???</h4><span className="en">{ui.undiscovered}</span>
                    </div>
                  );
                }
                return (
                  <button key={s.key} className="ency-card" onClick={() => { a.sfx('select'); setSelected(s.key); }}
                    aria-label={`${t.name}, ${ui.categories[s.category]}, ${ui.danger[s.danger]}, ${ui.tactileLevel} ${ui.tactileLevels[s.tactileLevel - 1]}. ${t.tactile}`}>
                    <div className="ec-mini"><DotMatrix speciesKey={s.key} animate={false} scale={sizeScale(s.sizeCm)} ariaLabel="" /></div>
                    <h4>{t.name}<span className="pill sm" style={{ background: dangerColor[s.danger] + '22', color: dangerColor[s.danger] }}>{ui.danger[s.danger]}</span></h4>
                    <span className="en">{lang === 'ko' ? s.en.name : s.ko.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

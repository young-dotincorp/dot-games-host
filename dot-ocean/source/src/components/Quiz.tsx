import { useCallback, useEffect, useState } from 'react';
import { DISCOVERABLE, SPECIES, text, sizeScale, type Species, type Lang } from '../data/species';
import { useApp } from '../state/AppContext';
import { DotMatrix } from './DotMatrix';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// A spoken clue that never names the species (used for the description quiz).
function clueOf(s: Species, lang: Lang): string {
  const t = text(s, lang);
  return lang === 'ko'
    ? `${t.bodyShape} 몸이에요. ${t.tactile}. 주로 ${t.habitat}에 살아요.`
    : `A ${t.bodyShape.toLowerCase()} body. ${t.tactile}. Usually found in ${t.habitat.toLowerCase()}.`;
}

interface Round { answer: Species; options: Species[]; }
type Mode = 'shape' | 'desc';

export function Quiz({ discovered, onClose }: { discovered: Set<string>; onClose: () => void }) {
  const a = useApp();
  const { ui, lang } = a;
  const pool = DISCOVERABLE.filter((s) => discovered.has(s.key));
  const enough = pool.length >= 3;

  const [mode, setMode] = useState<Mode>('shape');
  const [round, setRound] = useState<Round | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const newRound = useCallback((m: Mode) => {
    if (pool.length < 3) return;
    const answer = pool[Math.floor(Math.random() * pool.length)];
    const distractors = shuffle(pool.filter((s) => s.key !== answer.key));
    let opts = distractors.slice(0, 3);
    if (opts.length < 3) {
      const extra = shuffle(SPECIES.filter((s) => s.key !== answer.key && !opts.includes(s)));
      opts = [...opts, ...extra].slice(0, 3);
    }
    setRound({ answer, options: shuffle([answer, ...opts]) });
    setPicked(null);
    const q = m === 'desc' ? ui.quizDescQuestion : ui.quizQuestion;
    const spoken = m === 'desc' ? `${q} ${clueOf(answer, lang)}` : q;
    a.announce(spoken); a.speak(spoken);
  }, [pool, a, ui, lang]);

  useEffect(() => { if (enough && !round) newRound(mode); }, [enough, round, newRound, mode]);

  const switchMode = (m: Mode) => { if (m === mode) return; a.sfx('select'); setMode(m); newRound(m); };

  const choose = (key: string) => {
    if (!round || picked) return;
    setPicked(key);
    const correct = key === round.answer.key;
    const name = text(round.answer, lang).name;
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
    a.sfx(correct ? 'levelup' : 'danger');
    const msg = correct ? ui.quizCorrect(name) : ui.quizWrong(name);
    a.announce(msg); a.speak(msg);
  };

  return (
    <div className="mode-screen">
      <div className="mode-head">
        <h1>{ui.quizTitle}</h1>
        {enough && <span className="quiz-score" aria-label={ui.quizScore(score.correct, score.total)}>{ui.quizScore(score.correct, score.total)}</span>}
        <button className="icon-btn" onClick={onClose} aria-label={ui.close}>✕</button>
      </div>

      {!enough ? (
        <p className="empty">{ui.quizNeed}</p>
      ) : round ? (
        <div className="quiz-body">
          <div className="layer-toggle quiz-mode" role="group" aria-label={ui.quizTitle}>
            <button aria-pressed={mode === 'shape'} onClick={() => switchMode('shape')}>⠿ {ui.quizModeShape}</button>
            <button aria-pressed={mode === 'desc'} onClick={() => switchMode('desc')}>🔊 {ui.quizModeDesc}</button>
          </div>

          <p className="quiz-q">{mode === 'desc' ? ui.quizDescQuestion : ui.quizQuestion}</p>

          {mode === 'shape' ? (
            <>
              <div className="dotpad-shell quiz-pad">
                <DotMatrix speciesKey={round.answer.key} scale={sizeScale(round.answer.sizeCm)} ariaLabel={lang === 'ko' ? '정체를 맞혀야 하는 촉각 실루엣입니다.' : 'A tactile silhouette to identify.'} />
                <div className="dotpad-cap"><span className="sim">{ui.simLabel}</span><span className="res">60 × 40</span></div>
              </div>
              <div className="quiz-actions">
                <button className="btn-ghost" onClick={() => { const t = text(round.answer, lang); a.sfx('send'); a.speak(t.tactile); a.announce(t.tactile); }}>
                  ✋ {ui.quizListen}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="quiz-clue" role="img" aria-label={clueOf(round.answer, lang)}>
                <span className="qc-icon" aria-hidden="true">🔊</span>
                <p>{clueOf(round.answer, lang)}</p>
              </div>
              <div className="quiz-actions">
                <button className="btn-ghost" onClick={() => { const c = clueOf(round.answer, lang); a.sfx('send'); a.speak(c); a.announce(c); }}>
                  🔊 {ui.quizListenDesc}
                </button>
              </div>
            </>
          )}

          <div className="quiz-options" role="group" aria-label={mode === 'desc' ? ui.quizDescQuestion : ui.quizQuestion}>
            {round.options.map((o) => {
              const t = text(o, lang);
              const state = picked ? (o.key === round.answer.key ? ' correct' : o.key === picked ? ' wrong' : ' faded') : '';
              return (
                <button key={o.key} className={'quiz-opt' + state} onClick={() => choose(o.key)} disabled={!!picked}
                  aria-label={t.name}>
                  {t.name}
                  {picked && o.key === round.answer.key && <span aria-hidden="true"> ✓</span>}
                  {picked && o.key === picked && o.key !== round.answer.key && <span aria-hidden="true"> ✕</span>}
                </button>
              );
            })}
          </div>

          {picked && (
            <div className="quiz-reveal">
              <p className={picked === round.answer.key ? 'ok' : 'no'}>
                {picked === round.answer.key ? ui.quizCorrect(text(round.answer, lang).name) : ui.quizWrong(text(round.answer, lang).name)}
              </p>
              <p className="quiz-fact">“{text(round.answer, lang).tactile}”</p>
              <button className="btn-primary" onClick={() => { a.sfx('select'); newRound(mode); }}>{ui.quizNext} →</button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

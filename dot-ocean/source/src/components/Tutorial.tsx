import { useState } from 'react';
import { useApp } from '../state/AppContext';

export function Tutorial({ onDone }: { onDone: () => void }) {
  const { ui } = useApp();
  const [i, setI] = useState(0);
  const steps = ui.tutSteps;
  const last = i === steps.length - 1;
  return (
    <div className="overlay-scrim center">
      <div className="tutorial glass" role="dialog" aria-label={ui.tutTitle}>
        <h2>{ui.tutTitle}</h2>
        <div className="tut-dots" aria-hidden="true">
          {steps.map((_, k) => <span key={k} className={k === i ? 'on' : ''} />)}
        </div>
        <div className="tut-step">
          <span className="tut-num" aria-hidden="true">{i + 1}</span>
          <h3>{steps[i].t}</h3>
          <p>{steps[i].d}</p>
        </div>
        <button className="btn-primary" onClick={() => { if (last) onDone(); else setI(i + 1); }}>
          {last ? ui.tutStart : ui.tutNext}
        </button>
      </div>
    </div>
  );
}

import { GW, GH } from '../engine/dotMatrix';

// grid values: 0 empty, 1 creature, 2 player, 3 danger
export function RadarPad({ grid, ariaLabel }: { grid: number[][] | null; ariaLabel?: string }) {
  const cells: React.ReactNode[] = [];
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const v = grid?.[y]?.[x] ?? 0;
      const cls = v === 2 ? ' player' : v === 3 ? ' danger' : v === 1 ? ' up' : '';
      cells.push(<span key={y * GW + x} className={'dm-dot radar' + cls} />);
    }
  }
  return (
    <div className="dm-frame" role="img" aria-label={ariaLabel ?? 'tactile radar of nearby creatures'}>
      {cells}
    </div>
  );
}

import { useMemo } from 'react';
import { pattern, HIGHLIGHTS, GW, GH } from '../engine/dotMatrix';

interface Props {
  speciesKey: string;
  layer?: 'sil' | 'parts';
  animate?: boolean;
  scale?: number;
  ariaLabel?: string;
}

export function DotMatrix({ speciesKey, layer = 'sil', animate = true, scale = 1, ariaLabel }: Props) {
  const grid = useMemo(() => pattern(speciesKey, scale), [speciesKey, scale]);
  const hlSet = useMemo(() => {
    const set = new Set<number>();
    if (layer === 'parts') {
      const hl = HIGHLIGHTS[speciesKey];
      const cx = (GW - 1) / 2, cy = (GH - 1) / 2;
      if (hl) for (const cells of Object.values(hl)) for (const [x, y] of cells) {
        const sx = Math.round(cx + (x - cx) * scale);
        const sy = Math.round(cy + (y - cy) * scale);
        if (sx >= 0 && sx < GW && sy >= 0 && sy < GH) set.add(sy * GW + sx);
      }
    }
    return set;
  }, [speciesKey, layer, scale]);

  const cells: React.ReactNode[] = [];
  for (let y = 0; y < GH; y++) {
    for (let x = 0; x < GW; x++) {
      const on = grid[y][x] === 1;
      const hl = on && hlSet.has(y * GW + x);
      const delay = animate ? Math.hypot(x - 30, y - 20) * 8 : 0;
      cells.push(
        <span
          key={y * GW + x}
          className={'dm-dot' + (on ? ' up' : '') + (hl ? ' hl' : '')}
          style={animate ? { transitionDelay: delay + 'ms' } : undefined}
        />,
      );
    }
  }
  return (
    <div className="dm-frame" role="img" aria-label={ariaLabel ?? `${speciesKey} tactile pattern, 60 by 40 dots`}>
      {cells}
    </div>
  );
}

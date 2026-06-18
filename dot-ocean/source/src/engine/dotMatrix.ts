import { ALL_GRIDS } from '../data/species';

export const GW = 60;
export const GH = 40;
export type Grid = number[][];

function blank(): Grid {
  return Array.from({ length: GH }, () => new Array<number>(GW).fill(0));
}

const cache: Record<string, Grid> = {};

function base(key: string): Grid {
  if (cache[key]) return cache[key];
  const rows = ALL_GRIDS[key] ?? ALL_GRIDS.growthfish;
  const g = blank();
  for (let y = 0; y < GH && y < rows.length; y++) {
    const row = rows[y];
    for (let x = 0; x < GW && x < row.length; x++) g[y][x] = row[x] === '1' ? 1 : 0;
  }
  cache[key] = g;
  return g;
}

// Optional size-scaled silhouette (bigger creature -> bigger tactile footprint).
export function pattern(key: string, scale = 1): Grid {
  const b = base(key);
  if (Math.abs(scale - 1) < 0.02) return b;
  const ck = `${key}@${scale.toFixed(2)}`;
  if (cache[ck]) return cache[ck];
  const cx = (GW - 1) / 2, cy = (GH - 1) / 2;
  const out = blank();
  for (let y = 0; y < GH; y++)
    for (let x = 0; x < GW; x++) {
      const sx = Math.round(cx + (x - cx) / scale);
      const sy = Math.round(cy + (y - cy) / scale);
      if (sx >= 0 && sx < GW && sy >= 0 && sy < GH && b[sy][sx] === 1) out[y][x] = 1;
    }
  cache[ck] = out;
  return out;
}

// No per-part highlight layer for art-derived silhouettes.
export const HIGHLIGHTS: Record<string, Record<string, [number, number][]>> = {};

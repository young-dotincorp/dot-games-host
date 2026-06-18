// ---------------------------------------------------------------------------
// Procedural 60x40 tactile silhouette generator.
//
// Dot Pad tactile graphics are produced entirely from code: a compact "shape
// descriptor" (body archetype + tail / fin / feature modifiers) is rasterised
// into a 60x40 grid of raised dots. No external image files are involved, so
// the species catalogue can grow without commissioning art, and every creature
// gets a clean, simplified, touch-distinguishable silhouette.
//
// Convention: creatures face RIGHT (head at higher x). The body is centred
// vertically (cy ~= 19.5); tails extend to the left, snouts to the right.
// ---------------------------------------------------------------------------

export const W = 60;
export const H = 40;
export type Grid = number[][];

export type ShapeKind =
  | 'fish'        // generic streamlined fish (reef fish, tuna, clownfish ...)
  | 'round'       // near-circular body (puffer, pufferish, sunfish, urchin)
  | 'disk'        // tall flattened disc (angelfish, butterflyfish, tang)
  | 'elongated'   // long slim body (barracuda, trumpetfish)
  | 'eel'         // sinuous snake body (moray)
  | 'ray'         // diamond wing body (manta, stingray)
  | 'shark'       // shark profile, tall dorsal, crescent tail
  | 'whale'       // huge rounded body, horizontal fluke
  | 'dolphin'     // sleek body, hooked dorsal, beak, fluke
  | 'jelly'       // dome bell + trailing tentacles
  | 'octopus'     // round mantle + radiating arms
  | 'squid'       // tapered mantle + side fins + tentacle bundle
  | 'seahorse'    // upright curved body + snout
  | 'turtle'      // oval shell + four flippers + head
  | 'crab'        // wide carapace + legs + claws
  | 'shrimp'      // curved segmented body + fan tail
  | 'star'        // five-armed star
  | 'lionfish'    // body with radiating venomous spines
  | 'swordfish';  // torpedo body + long bill

export type TailKind = 'forked' | 'fan' | 'round' | 'crescent' | 'fluke' | 'whip' | 'pointed' | 'none';
export type DorsalKind = 'none' | 'low' | 'tall' | 'sail' | 'ridge' | 'banner';
export type Feature =
  | 'stripes' | 'spots' | 'spikes' | 'snout' | 'beak' | 'hammer'
  | 'lure' | 'barbel' | 'patch' | 'shell-spiral';

export interface TactileShape {
  kind: ShapeKind;
  /** body length as a fraction of usable width (0..1). */
  len?: number;
  /** body height as a fraction of usable height (0..1). */
  girth?: number;
  tail?: TailKind;
  dorsal?: DorsalKind;
  /** lower (pelvic / anal) fin. */
  pelvic?: boolean;
  /** small side (pectoral) fin. */
  pectoral?: boolean;
  feature?: Feature[];
  /** mirror horizontally so the creature faces left. */
  flip?: boolean;
}

// ---- primitives -----------------------------------------------------------

export function blank(): Grid {
  return Array.from({ length: H }, () => new Array<number>(W).fill(0));
}
function px(g: Grid, x: number, y: number, v = 1): void {
  const xi = Math.round(x), yi = Math.round(y);
  if (xi >= 0 && xi < W && yi >= 0 && yi < H) g[yi][xi] = v;
}
function fillEllipse(g: Grid, cx: number, cy: number, rx: number, ry: number, v = 1): void {
  if (rx <= 0 || ry <= 0) return;
  const x0 = Math.max(0, Math.floor(cx - rx)), x1 = Math.min(W - 1, Math.ceil(cx + rx));
  const y0 = Math.max(0, Math.floor(cy - ry)), y1 = Math.min(H - 1, Math.ceil(cy + ry));
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) g[y][x] = v;
    }
}
function disc(g: Grid, cx: number, cy: number, r: number, v = 1): void { fillEllipse(g, cx, cy, r, r, v); }
function tri(g: Grid, ax: number, ay: number, bx: number, by: number, cx: number, cy: number, v = 1): void {
  const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)));
  const maxY = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy)));
  const edges: [number, number, number, number][] = [[ax, ay, bx, by], [bx, by, cx, cy], [cx, cy, ax, ay]];
  for (let y = minY; y <= maxY; y++) {
    const xs: number[] = [];
    for (const [x0, y0, x1, y1] of edges) {
      if ((y0 <= y && y1 > y) || (y1 <= y && y0 > y)) {
        xs.push(x0 + ((y - y0) / (y1 - y0)) * (x1 - x0));
      }
    }
    if (xs.length >= 2) {
      xs.sort((a, b) => a - b);
      for (let x = Math.max(0, Math.floor(xs[0])); x <= Math.min(W - 1, Math.ceil(xs[xs.length - 1])); x++) g[y][x] = v;
    }
  }
}
function thickLine(g: Grid, x0: number, y0: number, x1: number, y1: number, r: number, v = 1): void {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    disc(g, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, v);
  }
}
function eye(g: Grid, x: number, y: number, r = 1): void { disc(g, x, y, r, 0); }

// ---- tail / fin attachments ------------------------------------------------

function addTail(g: Grid, kind: TailKind, ax: number, cy: number, bh: number): void {
  switch (kind) {
    case 'forked': {
      const tx = ax - bh * 1.05;
      tri(g, ax, cy, tx, cy - bh * 1.05, ax - 1, cy - 0.5);
      tri(g, ax, cy, tx, cy + bh * 1.05, ax - 1, cy + 0.5);
      break;
    }
    case 'crescent': {
      const tx = ax - bh * 1.5;
      tri(g, ax, cy, tx, cy - bh * 1.4, ax - 1, cy - 0.5);
      tri(g, ax, cy, tx, cy + bh * 1.4, ax - 1, cy + 0.5);
      break;
    }
    case 'fan': {
      fillEllipse(g, ax - bh * 0.5, cy, bh * 0.6, bh * 1.0);
      tri(g, ax, cy - bh * 0.4, ax, cy + bh * 0.4, ax - bh, cy);
      break;
    }
    case 'round': {
      fillEllipse(g, ax - bh * 0.45, cy, bh * 0.55, bh * 0.8);
      break;
    }
    case 'fluke': { // horizontal whale/dolphin tail
      const tx = ax - bh * 0.9;
      tri(g, ax, cy, tx, cy - bh * 1.15, tx + bh * 0.5, cy);
      tri(g, ax, cy, tx, cy + bh * 1.15, tx + bh * 0.5, cy);
      break;
    }
    case 'whip': {
      thickLine(g, ax, cy, ax - bh * 2.6, cy + bh * 0.2, 0.7);
      break;
    }
    case 'pointed': {
      tri(g, ax, cy - bh * 0.5, ax, cy + bh * 0.5, ax - bh * 0.9, cy);
      break;
    }
    case 'none': default: break;
  }
}

function addDorsal(g: Grid, kind: DorsalKind, cx: number, topY: number, bw: number): void {
  switch (kind) {
    case 'low': tri(g, cx - bw * 0.2, topY + 0.5, cx + bw * 0.2, topY + 0.5, cx, topY - 3); break;
    case 'tall': tri(g, cx - bw * 0.22, topY + 1, cx + bw * 0.12, topY + 1, cx - bw * 0.05, topY - 7); break;
    case 'ridge': tri(g, cx - bw * 0.35, topY + 0.5, cx + bw * 0.35, topY + 0.5, cx, topY - 2); break;
    case 'sail': {
      for (let i = -3; i <= 3; i++) {
        const x = cx + i * (bw * 0.13);
        thickLine(g, x, topY + 1, x, topY - (4 - Math.abs(i) * 0.5), 0.5);
      }
      break;
    }
    case 'banner': thickLine(g, cx, topY, cx + 2, topY - 14, 0.8); break;
    case 'none': default: break;
  }
}

function addStripes(g: Grid, cx: number, cy: number, bw: number, bh: number, n = 3): void {
  for (let i = 0; i < n; i++) {
    const x = cx - bw * 0.5 + (bw / (n + 1)) * (i + 1);
    for (let y = Math.round(cy - bh); y <= Math.round(cy + bh); y++) {
      if (y >= 0 && y < H && g[y]?.[Math.round(x)] === 1) { px(g, x, y, 0); px(g, x + 0.5, y, 0); }
    }
  }
}
function addSpikes(g: Grid, cx: number, cy: number, rx: number, ry: number): void {
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 7) {
    const ex = cx + Math.cos(a) * rx, ey = cy + Math.sin(a) * ry;
    thickLine(g, cx + Math.cos(a) * rx * 0.8, cy + Math.sin(a) * ry * 0.8, ex + Math.cos(a) * 3.5, ey + Math.sin(a) * 3.5, 0.55);
  }
}

// ---- archetype builders ----------------------------------------------------

function buildFish(s: TactileShape): Grid {
  const g = blank();
  const cy = 19.5;
  const len = (s.len ?? 0.62) * W;
  const bh = (s.girth ?? 0.42) * (H / 2);
  const cx = 30, rx = len / 2, ry = bh;
  const nose = cx + rx, tail = cx - rx;
  fillEllipse(g, cx, cy, rx, ry);
  addTail(g, s.tail ?? 'forked', tail, cy, bh);
  addDorsal(g, s.dorsal ?? 'low', cx - 1, cy - ry, rx * 2);
  if (s.pelvic) tri(g, cx - rx * 0.1, cy + ry * 0.7, cx + rx * 0.4, cy + ry * 0.7, cx + rx * 0.15, cy + ry + 3);
  if (s.pectoral) tri(g, cx + rx * 0.2, cy, cx + rx * 0.55, cy + 1, cx + rx * 0.15, cy + ry * 0.7);
  if (s.feature?.includes('snout')) tri(g, nose - 1, cy - ry * 0.5, nose - 1, cy + ry * 0.5, nose + 6, cy);
  if (s.feature?.includes('beak')) { fillEllipse(g, nose, cy, 2.5, ry * 0.6); eye(g, nose, cy, 0.6); }
  if (s.feature?.includes('stripes')) addStripes(g, cx, cy, rx * 2, ry, 3);
  if (s.feature?.includes('spots')) for (const [dx, dy] of [[-0.3, -0.3], [0.1, 0.2], [-0.1, 0.4], [0.3, -0.1]]) eye(g, cx + dx * rx, cy + dy * ry, 0.8);
  eye(g, nose - ry * 0.7, cy - ry * 0.25, 1);
  return g;
}

function buildRound(s: TactileShape): Grid {
  const g = blank();
  const cy = 19.5, cx = 28;
  const r = (s.girth ?? 0.78) * (H / 2);
  fillEllipse(g, cx, cy, r * (s.len ? s.len * 1.3 : 1.05), r);
  addTail(g, s.tail ?? 'fan', cx - r * 1.05, cy, r * 0.5);
  if (s.feature?.includes('spikes')) addSpikes(g, cx, cy, r * (s.len ? s.len * 1.3 : 1.05), r);
  if (s.feature?.includes('shell-spiral')) for (let i = 0; i < 4; i++) eye(g, cx - i * 2, cy, 0.9);
  if (s.feature?.includes('lure')) { thickLine(g, cx + r * 0.9, cy - r * 0.5, cx + r * 1.4, cy - r * 1.3, 0.5); disc(g, cx + r * 1.4, cy - r * 1.35, 1.4); }
  eye(g, cx + r * 0.55, cy - r * 0.2, 1.1);
  return g;
}

function buildDisk(s: TactileShape): Grid {
  const g = blank();
  const cy = 19.5, cx = 29;
  const ry = (s.girth ?? 0.9) * (H / 2);
  const rx = (s.len ?? 0.42) * W / 2 + 2;
  fillEllipse(g, cx, cy, rx, ry);
  addTail(g, s.tail ?? 'fan', cx - rx, cy, ry * 0.45);
  addDorsal(g, s.dorsal ?? 'ridge', cx, cy - ry, rx * 2);
  if (s.dorsal === 'banner') thickLine(g, cx + 1, cy - ry, cx + 4, cy - ry - 13, 0.9);
  tri(g, cx - rx * 0.2, cy + ry * 0.6, cx + rx * 0.5, cy + ry * 0.6, cx + rx * 0.1, cy + ry + 4); // anal fin
  if (s.feature?.includes('stripes')) addStripes(g, cx, cy, rx * 2, ry, 4);
  eye(g, cx + rx * 0.6, cy - ry * 0.25, 1.1);
  return g;
}

function buildElongated(s: TactileShape): Grid {
  const g = blank();
  const cy = 19.5;
  const rx = (s.len ?? 0.86) * W / 2;
  const ry = (s.girth ?? 0.2) * (H / 2);
  const cx = 30;
  fillEllipse(g, cx, cy, rx, ry);
  addTail(g, s.tail ?? 'forked', cx - rx, cy, ry * 2.2);
  addDorsal(g, s.dorsal ?? 'none', cx, cy - ry, rx);
  if (s.feature?.includes('snout')) tri(g, cx + rx - 1, cy - ry, cx + rx - 1, cy + ry, cx + rx + 8, cy);
  eye(g, cx + rx * 0.78, cy - ry * 0.3, 1);
  return g;
}

function buildEel(s: TactileShape): Grid {
  const g = blank();
  const r = (s.girth ?? 0.16) * (H / 2) + 1.5;
  const pts: [number, number][] = [[8, 26], [16, 20], [26, 24], [36, 16], [46, 21], [52, 17]];
  for (let i = 0; i < pts.length - 1; i++) {
    const rr = r * (1 - i * 0.07);
    thickLine(g, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], rr);
  }
  // head bulge + tail taper
  fillEllipse(g, 52, 17, r + 1, r + 0.5);
  if (s.feature?.includes('snout')) tri(g, 54, 15, 55, 19, 58, 17);
  eye(g, 53, 15.5, 0.8);
  return g;
}

function buildRay(s: TactileShape): Grid {
  const g = blank();
  const cy = 19.5, cx = 27;
  const wingX = (s.len ?? 0.78) * W / 2;
  const wingY = (s.girth ?? 0.62) * (H / 2);
  // diamond wings
  tri(g, cx, cy - wingY, cx + wingX, cy, cx, cy + wingY);
  tri(g, cx, cy - wingY, cx - wingX, cy, cx, cy + wingY);
  fillEllipse(g, cx, cy, wingX * 0.34, wingY * 0.7); // central body
  addTail(g, s.tail ?? 'whip', cx - wingX, cy, wingY * 0.5);
  if (s.feature?.includes('spots')) for (let i = 0; i < 4; i++) eye(g, cx + (i - 1.5) * 4, cy, 0.9);
  return g;
}

function buildShark(s: TactileShape): Grid {
  const g = blank();
  const cy = 19, cx = 30;
  const rx = (s.len ?? 0.74) * W / 2;
  const ry = (s.girth ?? 0.34) * (H / 2);
  fillEllipse(g, cx, cy, rx, ry);
  tri(g, cx + rx * 0.55, cy - ry * 0.4, cx + rx * 0.55, cy + ry * 0.4, cx + rx + 5, cy + 1); // snout
  addTail(g, s.tail ?? 'crescent', cx - rx, cy, ry * 1.4);
  // tall dorsal
  tri(g, cx - rx * 0.1, cy - ry, cx + rx * 0.3, cy - ry, cx + rx * 0.05, cy - ry - 8);
  tri(g, cx + rx * 0.1, cy + ry * 0.9, cx + rx * 0.4, cy + ry * 0.9, cx + rx * 0.25, cy + ry + 4); // pectoral
  if (s.feature?.includes('hammer')) { tri(g, cx + rx - 2, cy - 7, cx + rx - 2, cy + 7, cx + rx + 6, cy - 6); tri(g, cx + rx - 2, cy - 7, cx + rx - 2, cy + 7, cx + rx + 6, cy + 6); }
  if (s.feature?.includes('spots')) for (let i = 0; i < 6; i++) eye(g, cx - rx * 0.4 + i * 5, cy - 2 + (i % 2) * 4, 0.8);
  eye(g, cx + rx * 0.62, cy - ry * 0.3, 1);
  return g;
}

function buildWhale(s: TactileShape): Grid {
  const g = blank();
  const cy = 19.5, cx = 31;
  const rx = (s.len ?? 0.78) * W / 2;
  const ry = (s.girth ?? 0.56) * (H / 2);
  fillEllipse(g, cx, cy, rx, ry);
  addTail(g, 'fluke', cx - rx, cy, ry * 0.9);
  tri(g, cx, cy + ry * 0.7, cx + rx * 0.3, cy + ry * 0.7, cx + rx * 0.1, cy + ry + 3); // small pectoral
  addDorsal(g, s.dorsal ?? 'none', cx - rx * 0.3, cy - ry, rx);
  eye(g, cx + rx * 0.68, cy - ry * 0.25, 1.1);
  return g;
}

function buildDolphin(s: TactileShape): Grid {
  const g = blank();
  const cy = 19.5, cx = 30;
  const rx = (s.len ?? 0.7) * W / 2;
  const ry = (s.girth ?? 0.3) * (H / 2);
  fillEllipse(g, cx, cy, rx, ry);
  // beak
  tri(g, cx + rx * 0.55, cy - ry * 0.3, cx + rx * 0.55, cy + ry * 0.5, cx + rx + 6, cy + 1);
  addTail(g, 'fluke', cx - rx, cy, ry * 1.1);
  // hooked dorsal
  tri(g, cx - rx * 0.05, cy - ry, cx + rx * 0.25, cy - ry, cx - rx * 0.2, cy - ry - 6);
  tri(g, cx, cy + ry * 0.7, cx + rx * 0.3, cy + ry * 0.7, cx - rx * 0.05, cy + ry + 4); // pectoral
  if (s.feature?.includes('patch')) for (let y = Math.round(cy); y < cy + ry; y++) for (let x = Math.round(cx - rx * 0.3); x < cx + rx * 0.3; x++) if (g[y]?.[x] === 1 && (x + y) % 2 === 0) px(g, x, y, 0);
  eye(g, cx + rx * 0.6, cy - ry * 0.25, 1);
  return g;
}

function buildJelly(s: TactileShape): Grid {
  const g = blank();
  const cx = 30, top = 15, ry = 11;
  const rx = (s.len ?? 0.42) * W / 2 + 4;
  // bell: full ellipse, then clear everything below the dome's mid-line for a flat hem
  fillEllipse(g, cx, top, rx, ry);
  for (let y = top + 1; y < H; y++) for (let x = 0; x < W; x++) g[y][x] = 0;
  // scalloped hem just under the dome
  for (let x = Math.round(cx - rx); x <= cx + rx; x += 1) {
    if (Math.abs(((x - cx) / rx)) > 1) continue;
    if (Math.round((x - cx)) % 4 < 2) px(g, x, top + 1, 1);
  }
  // trailing tentacles
  const n = 6;
  for (let i = 0; i < n; i++) {
    const x = cx - rx * 0.62 + (rx * 1.24 / (n - 1)) * i;
    for (let y = top + 1; y < 37; y++) if ((y + i) % 2 === 0) px(g, x + Math.sin((y + i) * 0.5) * 1.6, y, 1);
  }
  return g;
}

function buildOctopus(s: TactileShape): Grid {
  const g = blank();
  const cx = 30, cy = 15;
  const r = (s.girth ?? 0.5) * (H / 2) + 2;
  fillEllipse(g, cx, cy, r, r * 1.1); // mantle/head
  eye(g, cx - r * 0.4, cy, 1.2); eye(g, cx + r * 0.4, cy, 1.2);
  // 8 arms radiating down
  for (let i = 0; i < 8; i++) {
    const a = Math.PI * (0.15 + (0.7 / 7) * i); // spread across bottom
    const sx = cx + Math.cos(a) * r * 0.6, sy = cy + r * 0.6;
    const ex = cx + (i - 3.5) * 4.4, ey = 37 - Math.abs(i - 3.5) * 1.2;
    thickLine(g, sx, sy, (sx + ex) / 2 + (i - 3.5), (sy + ey) / 2, 1.1);
    thickLine(g, (sx + ex) / 2 + (i - 3.5), (sy + ey) / 2, ex, ey, 0.7);
  }
  return g;
}

function buildSquid(s: TactileShape): Grid {
  const g = blank();
  const cx = 30, top = 6;
  const rx = (s.girth ?? 0.26) * (H / 2) + 1;
  // tapered mantle pointing up
  tri(g, cx - rx, 20, cx + rx, 20, cx, top);
  fillEllipse(g, cx, 18, rx, 5);
  // side fins near top
  tri(g, cx - rx, top + 3, cx - rx - 4, top + 1, cx - rx, top + 8);
  tri(g, cx + rx, top + 3, cx + rx + 4, top + 1, cx + rx, top + 8);
  eye(g, cx - rx * 0.5, 21, 1); eye(g, cx + rx * 0.5, 21, 1);
  // tentacle bundle downward
  for (let i = 0; i < 8; i++) {
    const x = cx + (i - 3.5) * 1.7;
    for (let y = 22; y < 37; y++) px(g, x + Math.sin(y * 0.5 + i) * 1.1, y, 1);
  }
  // two long feeding tentacles
  thickLine(g, cx - 4, 24, cx - 7, 38, 0.7);
  thickLine(g, cx + 4, 24, cx + 7, 38, 0.7);
  return g;
}

function buildSeahorse(): Grid {
  const g = blank();
  // curved upright body
  const spine: [number, number][] = [[30, 5], [31, 9], [31, 14], [30, 19], [28, 24], [27, 29], [29, 33], [33, 35]];
  for (let i = 0; i < spine.length - 1; i++) thickLine(g, spine[i][0], spine[i][1], spine[i + 1][0], spine[i + 1][1], 2 - i * 0.12);
  // head + snout pointing right
  fillEllipse(g, 31, 7, 3, 3);
  thickLine(g, 33, 7, 38, 8, 0.8); // snout
  // curled tail
  thickLine(g, 33, 35, 30, 36, 0.8);
  // dorsal fin
  thickLine(g, 28, 18, 24, 19, 0.6); thickLine(g, 28, 21, 24, 22, 0.6);
  eye(g, 31, 6, 0.7);
  return g;
}

function buildTurtle(s: TactileShape): Grid {
  const g = blank();
  const cx = 28, cy = 19.5;
  const rx = (s.len ?? 0.5) * W / 2, ry = (s.girth ?? 0.62) * (H / 2);
  fillEllipse(g, cx, cy, rx, ry); // shell
  fillEllipse(g, cx + rx + 2, cy, 4, 3.5); // head
  // four flippers
  tri(g, cx + rx * 0.5, cy - ry, cx + rx + 4, cy - ry - 5, cx + rx * 0.7, cy - ry * 0.4);
  tri(g, cx + rx * 0.5, cy + ry, cx + rx + 4, cy + ry + 5, cx + rx * 0.7, cy + ry * 0.4);
  tri(g, cx - rx * 0.6, cy - ry, cx - rx - 3, cy - ry - 4, cx - rx * 0.4, cy - ry * 0.4);
  tri(g, cx - rx * 0.6, cy + ry, cx - rx - 3, cy + ry + 4, cx - rx * 0.4, cy + ry * 0.4);
  // shell scute holes
  for (const [dx, dy] of [[0, 0], [0.4, 0], [-0.4, 0], [0, 0.45], [0, -0.45]]) eye(g, cx + dx * rx, cy + dy * ry, 1.1);
  eye(g, cx + rx + 3, cy - 0.5, 0.6);
  return g;
}

function buildCrab(): Grid {
  const g = blank();
  const cx = 30, cy = 20;
  fillEllipse(g, cx, cy, 11, 6); // carapace
  // legs (4 per side)
  for (let i = 0; i < 4; i++) {
    const ly = cy - 3 + i * 2.2;
    thickLine(g, cx - 9, ly, cx - 17, ly - 3 + i, 0.7);
    thickLine(g, cx + 9, ly, cx + 17, ly - 3 + i, 0.7);
  }
  // claws
  thickLine(g, cx - 8, cy - 5, cx - 14, cy - 9, 1);
  fillEllipse(g, cx - 15, cy - 10, 2.5, 2); eye(g, cx - 15, cy - 10, 0.8);
  thickLine(g, cx + 8, cy - 5, cx + 14, cy - 9, 1);
  fillEllipse(g, cx + 15, cy - 10, 2.5, 2); eye(g, cx + 15, cy - 10, 0.8);
  // eyes on stalks
  eye(g, cx - 3, cy - 4, 1); eye(g, cx + 3, cy - 4, 1);
  return g;
}

function buildShrimp(): Grid {
  const g = blank();
  // curved segmented body, head right
  const arc: [number, number][] = [[14, 26], [20, 22], [27, 19], [34, 18], [40, 20], [44, 24]];
  for (let i = 0; i < arc.length - 1; i++) thickLine(g, arc[i][0], arc[i][1], arc[i + 1][0], arc[i + 1][1], 3 - i * 0.25);
  // segment gaps
  for (let i = 1; i < arc.length - 1; i++) eye(g, arc[i][0], arc[i][1], 0.7);
  // head + antennae
  fillEllipse(g, 44, 24, 3.5, 3.5);
  thickLine(g, 46, 23, 56, 18, 0.5); thickLine(g, 46, 25, 56, 24, 0.5);
  // tail fan (left)
  tri(g, 14, 26, 9, 22, 9, 30);
  // legs
  for (let i = 0; i < 4; i++) thickLine(g, 24 + i * 5, 21, 24 + i * 5, 30, 0.5);
  eye(g, 45, 22.5, 0.7);
  return g;
}

function buildStar(): Grid {
  const g = blank();
  const cx = 30, cy = 20, R = 17, r = 6.5;
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (Math.PI / 5) * i;
    const rad = i % 2 === 0 ? R : r;
    pts.push([cx + Math.cos(ang) * rad * 1.0, cy + Math.sin(ang) * rad * 0.92]);
  }
  for (let i = 1; i < pts.length - 1; i++) tri(g, cx, cy, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
  tri(g, cx, cy, pts[pts.length - 1][0], pts[pts.length - 1][1], pts[0][0], pts[0][1]);
  disc(g, cx, cy, 5);
  eye(g, cx, cy, 1.2);
  return g;
}

function buildLionfish(s: TactileShape): Grid {
  const g = blank();
  const cy = 19.5, cx = 30;
  const rx = (s.len ?? 0.4) * W / 2, ry = (s.girth ?? 0.34) * (H / 2);
  fillEllipse(g, cx, cy, rx, ry);
  addTail(g, 'fan', cx - rx, cy, ry * 0.8);
  // radiating venomous spines, all around
  for (let i = -4; i <= 4; i++) {
    const x = cx + (i / 4) * rx * 0.8;
    thickLine(g, x, cy - ry, x + i * 0.5, cy - ry - 9, 0.5); // dorsal spines
    thickLine(g, x, cy + ry, x + i * 0.5, cy + ry + 8, 0.5); // ventral spines
  }
  // pectoral fan
  thickLine(g, cx + rx * 0.3, cy, cx + rx + 7, cy - 5, 0.6);
  thickLine(g, cx + rx * 0.3, cy, cx + rx + 7, cy + 5, 0.6);
  if (s.feature?.includes('stripes')) addStripes(g, cx, cy, rx * 2, ry, 4);
  eye(g, cx + rx * 0.5, cy - ry * 0.3, 1);
  return g;
}

function buildSwordfish(s: TactileShape): Grid {
  const g = blank();
  const cy = 19.5, cx = 26;
  const rx = (s.len ?? 0.5) * W / 2, ry = (s.girth ?? 0.26) * (H / 2);
  fillEllipse(g, cx, cy, rx, ry);
  addTail(g, 'crescent', cx - rx, cy, ry * 1.5);
  tri(g, cx, cy - ry, cx + rx * 0.4, cy - ry, cx + rx * 0.1, cy - ry - 8); // tall dorsal/sail
  thickLine(g, cx + rx, cy, cx + rx + 16, cy - 1, 0.8); // long bill
  eye(g, cx + rx * 0.7, cy - ry * 0.3, 1);
  return g;
}

const builders: Record<ShapeKind, (s: TactileShape) => Grid> = {
  fish: buildFish, round: buildRound, disk: buildDisk, elongated: buildElongated,
  eel: buildEel, ray: buildRay, shark: buildShark, whale: buildWhale, dolphin: buildDolphin,
  jelly: buildJelly, octopus: buildOctopus, squid: buildSquid, seahorse: buildSeahorse,
  turtle: buildTurtle, crab: buildCrab, shrimp: buildShrimp, star: buildStar,
  lionfish: buildLionfish, swordfish: buildSwordfish,
};

function flipGrid(g: Grid): Grid {
  return g.map((row) => [...row].reverse());
}

/** Rasterise a shape descriptor into a 60x40 grid (number[][]). */
export function generateGrid(shape: TactileShape): Grid {
  const g = builders[shape.kind](shape);
  return shape.flip ? flipGrid(g) : g;
}

/** Same, returned as the string-row format used by the static art grids. */
export function generateRows(shape: TactileShape): string[] {
  return generateGrid(shape).map((row) => row.map((v) => (v ? '1' : '0')).join(''));
}

/** Bounding box of raised dots, or null if empty. */
export function gridBBox(g: Grid): { x0: number; y0: number; x1: number; y1: number } | null {
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (g[y][x]) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

/** width/height aspect of the silhouette (defaults to 1.5 if empty). */
export function gridAspect(g: Grid): number {
  const b = gridBBox(g);
  if (!b) return 1.5;
  return (b.x1 - b.x0 + 1) / (b.y1 - b.y0 + 1);
}

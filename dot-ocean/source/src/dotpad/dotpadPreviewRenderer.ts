// Screen-only preview path — kept separate from the real device output path.
// The RadarPad and DotMatrix React components consume these helpers directly.
// This module is a coordination point; actual DOM rendering lives in the components.

export type PreviewGrid = number[][];

export interface PreviewListener {
  onGrid(grid: PreviewGrid): void;
}

class PreviewBus {
  private listeners: PreviewListener[] = [];

  subscribe(l: PreviewListener): () => void {
    this.listeners.push(l);
    return () => { this.listeners = this.listeners.filter(x => x !== l); };
  }

  publish(grid: PreviewGrid): void {
    for (const l of this.listeners) l.onGrid(grid);
  }
}

// Singleton bus used by game to push radar frames to preview components.
export const previewBus = new PreviewBus();

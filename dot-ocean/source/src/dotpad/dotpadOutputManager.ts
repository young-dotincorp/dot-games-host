// Bridges game state (60×40 grid) → real Dot Pad hardware output.
// Decoupled from screen preview: hiding preview does NOT disable this path.
import { DotPadTransport, type StatusListener } from './dotpadTransport';
import { encodeGrid } from './dotpadEncoder';

export class DotPadOutputManager {
  private readonly transport = new DotPadTransport();
  private rafId = 0;
  private pendingGrid: number[][] | null = null;
  private lastHex = '';

  get isSupported(): boolean { return this.transport.isSupported; }
  get isConnected(): boolean { return this.transport.isConnected; }

  onStatus(fn: StatusListener): () => void {
    return this.transport.onStatus(fn);
  }

  /** Trigger BLE device picker — MUST be called from a user gesture (click). */
  async connect(): Promise<boolean> {
    return this.transport.connectBle();
  }

  disconnect(): void {
    this.transport.clearAll();
    this.transport.disconnect();
  }

  /** Push a new grid frame. Batches via rAF so the USB/BLE bus is never flooded. */
  push(grid: number[][]): void {
    this.pendingGrid = grid;
    if (!this.rafId) {
      this.rafId = requestAnimationFrame(() => {
        this.rafId = 0;
        const g = this.pendingGrid;
        if (g) { this.flush(g); this.pendingGrid = null; }
      });
    }
  }

  private flush(grid: number[][]): void {
    if (!this.transport.isConnected) return;
    const rows = this.transport.deviceRows;
    const cols = this.transport.deviceCols;
    const hex = encodeGrid(grid, rows, cols);
    if (hex === this.lastHex) return;
    this.lastHex = hex;
    this.transport.displayGraphicHex(hex);
  }
}

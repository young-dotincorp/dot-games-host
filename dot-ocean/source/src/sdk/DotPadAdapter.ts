// DotPadAdapter: the interface that connects game output → Dot Pad device.
// Two implementations:
//   SimulatedDotPad  – no-op; on-screen preview handles display (default)
//   WebBluetoothDotPad – real BLE device via DotPadSDK (opt-in, requires user gesture)

import { DotPadOutputManager } from '../dotpad/dotpadOutputManager';
import type { TransportStatus } from '../dotpad/dotpadTransport';

export interface DotPadAdapter {
  readonly connected: boolean;
  /** Returns true on successful connection; false if user cancelled or unsupported. */
  connect(): Promise<boolean>;
  /** Called each radar frame with the 60×40 integer grid. */
  render(grid: number[][]): void;
  disconnect(): void;
  /** Optional: called when connection status changes so the app can update UI. */
  onStatusChange?: (connected: boolean, status: TransportStatus, detail?: string) => void;
}

/** Default: no-op adapter. The on-screen RadarPad/DotMatrix components handle preview. */
export class SimulatedDotPad implements DotPadAdapter {
  connected = false;
  async connect(): Promise<boolean> { this.connected = true; this.onStatusChange?.(true, 'connected'); return true; }
  render(_grid: number[][]): void { /* screen preview components handle display */ }
  disconnect(): void { this.connected = false; this.onStatusChange?.(false, 'disconnected'); }
  onStatusChange?: (connected: boolean, status: TransportStatus, detail?: string) => void;
}

/**
 * Real Web Bluetooth adapter that drives an actual Dot Pad device.
 * Wraps DotPadOutputManager; the render() path is independent of screen preview.
 *
 * Usage: instantiate and pass to AppProvider or DotOcean.mount().
 * The BLE device picker opens only when connect() is called from a user gesture.
 */
export class WebBluetoothDotPad implements DotPadAdapter {
  private readonly manager = new DotPadOutputManager();
  onStatusChange?: (connected: boolean, status: TransportStatus, detail?: string) => void;

  constructor() {
    // Wire transport status → adapter status callback (called on connect/disconnect/error)
    this.manager.onStatus((status, detail) => {
      const isConnected = status === 'connected';
      this._connected = isConnected;
      this.onStatusChange?.(isConnected, status, detail);
    });
  }

  private _connected = false;
  get connected(): boolean { return this._connected; }

  /** Opens the native BLE device picker. MUST be called from a button click handler. */
  async connect(): Promise<boolean> {
    return this.manager.connect();
  }

  /** Sends the radar frame to the real Dot Pad device (batched via rAF). */
  render(grid: number[][]): void {
    this.manager.push(grid);
  }

  disconnect(): void {
    this.manager.disconnect();
  }
}

export interface DotOceanEvent {
  type: 'discover' | 'eat' | 'levelup' | 'danger';
  key?: string;
  level?: number;
}

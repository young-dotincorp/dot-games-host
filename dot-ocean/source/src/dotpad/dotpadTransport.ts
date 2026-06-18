// Web Bluetooth transport layer using DotPadSDK.
// Explicit import ensures this module is NOT tree-shaken even when no device is yet connected.
import { DotPadSDK, DotPadScanner, DataCodes, type DotDevice } from './DotPadSDK.js';

export type TransportStatus =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'unsupported';

export type StatusListener = (status: TransportStatus, detail?: string) => void;

export class DotPadTransport {
  private readonly sdk = new DotPadSDK();
  private readonly scanner = new DotPadScanner();
  private device: DotDevice | null = null;
  private _status: TransportStatus = 'idle';
  private listeners: StatusListener[] = [];

  constructor() {
    this.sdk.setCallBack(
      (dev, code) => this.onSdkMessage(dev, code),
      () => {},
    );
  }

  get isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  }

  get isConnected(): boolean { return this._status === 'connected'; }

  get deviceRows(): number { return this.device?.numberCellRows ?? 40; }
  get deviceCols(): number { return this.device?.numberCellColumns ?? 60; }

  onStatus(fn: StatusListener): () => void {
    this.listeners.push(fn);
    fn(this._status);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  async connectBle(): Promise<boolean> {
    if (!this.isSupported) {
      this.emit('unsupported', 'Web Bluetooth API가 이 브라우저에서 지원되지 않습니다. Chrome 또는 Edge를 사용해 주세요.');
      return false;
    }
    // Requires HTTPS or localhost
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      this.emit('error', 'Web Bluetooth는 HTTPS 또는 localhost 환경에서만 사용할 수 있습니다.');
      return false;
    }
    try {
      this.emit('scanning');
      const bleDevice = await this.scanner.startBleScan();
      if (!bleDevice) { this.emit('idle'); return false; }

      this.emit('connecting');
      const dotDevice = await this.sdk.connectBleDevice(bleDevice);
      if (!dotDevice) { this.emit('error', '기기 연결에 실패했습니다.'); return false; }

      this.device = dotDevice;
      this.emit('connected');
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '알 수 없는 오류';
      if (msg.includes('User cancelled')) { this.emit('idle'); return false; }
      this.emit('error', msg);
      return false;
    }
  }

  displayGraphicHex(hex: string): void {
    if (!this.device) return;
    try { this.sdk.displayGraphicData(hex, this.device); } catch { /* device may have disconnected */ }
  }

  clearAll(): void {
    if (!this.device) return;
    try { this.sdk.displayAllDown(this.device); } catch { }
  }

  disconnect(): void {
    try { this.sdk.disconnect(this.device); } catch { }
    this.device = null;
    this.emit('disconnected');
  }

  private onSdkMessage(_dev: DotDevice, code: string): void {
    if (code === DataCodes.Disconnected) {
      this.device = null;
      this.emit('disconnected');
    }
  }

  private emit(status: TransportStatus, detail?: string): void {
    this._status = status;
    for (const fn of this.listeners) fn(status, detail);
  }
}

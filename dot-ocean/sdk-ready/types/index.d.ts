// Type definitions for the Dot Ocean drop-in SDK.
export interface DotPadAdapter {
  readonly connected: boolean;
  connect(): Promise<boolean>;
  render(grid: number[][]): void;   // 60x40, values: 0 empty, 1 raised, 2 player, 3 danger
  disconnect(): void;
}
export declare class SimulatedDotPad implements DotPadAdapter {
  connected: boolean;
  connect(): Promise<boolean>;
  render(grid: number[][]): void;
  disconnect(): void;
}
export interface DotOceanEvent {
  type: 'discover' | 'eat' | 'levelup' | 'danger';
  key?: string;
  level?: number;
}
export interface DotOceanOptions {
  lang?: 'ko' | 'en';
  sound?: boolean;
  tts?: boolean;
  highContrast?: boolean;
  reducedMotion?: boolean;
  audioCues?: boolean;
  verbose?: boolean;
  captions?: boolean;
  dotpad?: DotPadAdapter;
  onEvent?: (e: DotOceanEvent) => void;
}
export interface DotOceanInstance {
  destroy(): void;
  readonly dotpad: DotPadAdapter;
  getElement(): HTMLElement;
}
export declare function mount(target: string | HTMLElement, options?: DotOceanOptions): DotOceanInstance;
export declare const version: string;
export declare const DotOcean: { mount: typeof mount; version: string; register(): void };
export default DotOcean;

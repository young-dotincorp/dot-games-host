// Type declarations for DotPadSDK-3_0_0 (ES module build)

export declare const DataCodes: Readonly<{
  Connected: string;
  ConnectedFail: string;
  Disconnected: string;
  BoardInfo: string;
  BleMacAddress: string;
  DeviceName: string;
  DeviceFWVersion: string;
  DeviceHWVersion: string;
  ResponseDisplayLineAck: string;
  ResponseDisplayLineNonAck: string;
  ResponseDisplayLineComplete: string;
  CommandError: string;
  CommandNone: string;
}>;

export declare const KeyCodes: Readonly<{
  KeyFunction1: string; KeyFunction2: string; KeyFunction3: string; KeyFunction4: string;
  KeyFunction12: string; KeyFunction13: string; KeyFunction14: string;
  KeyFunction23: string; KeyFunction24: string; KeyFunction34: string;
  KeyElse: string; PanningAll: string; PanningLeft: string; PanningRight: string;
  LPF1: string; RPF4: string;
}>;

export declare const DeviceInfo: Readonly<{
  DeviceName: string;
  FirmwareVersion: string;
  HardwareVersion: string;
}>;

export declare const DisplayMode: {
  GraphicMode: string;
  TextMode: string;
};

export declare class DotDevice {
  readonly connectDevice: BluetoothDevice | SerialPort | null;
  readonly isConnect: boolean;
  readonly cellType: string;
  readonly numberCellRows: number;
  readonly numberCellColumns: number;
  readonly numberBrailleCellColumns: number;
}

export declare class DotPadScanner {
  startBleScan(): Promise<BluetoothDevice | undefined>;
  startUsbScan(): Promise<SerialPort | undefined>;
}

export declare class DotPadSDK {
  messageCallBack: ((device: DotDevice, code: string, data: string) => void) | null;
  keyCallBack: ((device: DotDevice, key: string, raw: string) => void) | null;

  getConnectedDevices(): DotDevice[];

  connectBleDevice(device: BluetoothDevice): Promise<DotDevice | null>;
  connectUsbDevice(device: SerialPort): Promise<DotDevice | null>;
  disconnect(device?: DotDevice | null): void;

  requestDeviceInfo(device: DotDevice, info: string): void;

  displayGraphicData(hexData: string, device?: DotDevice | null, mode?: string): void;
  displayTextData(hexData: string, device?: DotDevice | null, mode?: string): void;
  displayLineData(lineIndex: number, startCell: number, hexData: string, mode?: string, device?: DotDevice | null): void;
  displayAllUp(device?: DotDevice | null): void;
  displayAllDown(device?: DotDevice | null): void;

  setCallBack(
    onMessage: (device: DotDevice, code: string, data: string) => void,
    onKey: (device: DotDevice, key: string, raw: string) => void,
  ): void;
}

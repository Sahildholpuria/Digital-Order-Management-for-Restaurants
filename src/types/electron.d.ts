export interface ElectronPrinterInfo {
  name: string;
  displayName: string;
  description: string;
  status: number;
  isDefault: boolean;
}

export interface ElectronAppInfo {
  version: string;
  platform: 'win32' | 'darwin' | 'linux';
  arch: string;
  isPackaged: boolean;
  locale: string;
}

export interface ElectronAPI {
  isElectron: boolean;
  platform: 'win32' | 'darwin' | 'linux';
  getPrinters: () => Promise<ElectronPrinterInfo[]>;
  printThermalReceipt: (payload: {
    html: string;
    deviceName?: string;
    copies?: number;
    silent?: boolean;
    pageSize?: { width: number; height: number };
  }) => Promise<{ success: boolean; error?: string }>;
  getAppInfo: () => Promise<ElectronAppInfo>;
  openExternal: (url: string) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}


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

export interface UpdateStatusPayload {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  info?: {
    version: string;
    releaseDate?: string;
    releaseNotes?: string | Array<{ title: string; note: string }>;
    downloadUrl?: string;
  };
  progress?: {
    percent: number;
    bytesPerSecond: number;
    transferred: number;
    total: number;
  };
  error?: string;
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

  // In-app Auto Updates
  checkForUpdates: () => Promise<{ success: boolean; isNewer?: boolean; info?: any; error?: string }>;
  startDownloadUpdate: () => Promise<{ success: boolean; error?: string }>;
  quitAndInstallUpdate: () => Promise<{ success: boolean }>;
  onUpdateStatusChange: (callback: (payload: UpdateStatusPayload) => void) => () => void;
  onTriggerCheckUpdates?: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}


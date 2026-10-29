import { ElectronPrinterInfo, ElectronAppInfo } from '../types/electron';

class ElectronService {
  public isElectron(): boolean {
    return typeof window !== 'undefined' && Boolean(window.electronAPI?.isElectron);
  }

  public getPlatform(): 'win32' | 'darwin' | 'linux' | 'web' {
    if (this.isElectron() && window.electronAPI?.platform) {
      return window.electronAPI.platform;
    }
    return 'web';
  }

  public async getPrinters(): Promise<ElectronPrinterInfo[]> {
    if (!this.isElectron() || !window.electronAPI?.getPrinters) {
      return [];
    }
    try {
      return await window.electronAPI.getPrinters();
    } catch (err) {
      console.warn('[ElectronService] Failed to retrieve system printers:', err);
      return [];
    }
  }

  public async printThermalReceipt(options: {
    html: string;
    deviceName?: string;
    copies?: number;
    silent?: boolean;
  }): Promise<{ success: boolean; error?: string }> {
    if (!this.isElectron() || !window.electronAPI?.printThermalReceipt) {
      return { success: false, error: 'Not running inside desktop environment' };
    }
    try {
      return await window.electronAPI.printThermalReceipt(options);
    } catch (err: any) {
      console.error('[ElectronService] Print error:', err);
      return { success: false, error: err?.message || 'Print dispatch failed' };
    }
  }

  public async getAppInfo(): Promise<ElectronAppInfo | null> {
    if (!this.isElectron() || !window.electronAPI?.getAppInfo) {
      return null;
    }
    try {
      return await window.electronAPI.getAppInfo();
    } catch (err) {
      console.warn('[ElectronService] Failed to retrieve app info:', err);
      return null;
    }
  }

  public async openExternal(url: string): Promise<boolean> {
    if (this.isElectron() && window.electronAPI?.openExternal) {
      return await window.electronAPI.openExternal(url);
    }
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
      return true;
    }
    return false;
  }
}

export const electronService = new ElectronService();
export default electronService;


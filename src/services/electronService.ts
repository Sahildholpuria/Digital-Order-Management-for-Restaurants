import { ElectronPrinterInfo, ElectronAppInfo, UpdateStatusPayload } from '../types/electron';
import { APP_VERSION } from '../config/appVersion';

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

  public async checkForUpdates(): Promise<{ success: boolean; isNewer?: boolean; info?: any; error?: string }> {
    if (this.isElectron() && window.electronAPI?.checkForUpdates) {
      try {
        return await window.electronAPI.checkForUpdates();
      } catch (err: any) {
        console.warn('[ElectronService] Native update check error:', err);
      }
    }

    // Web / fallback: check GitHub Releases API directly
    try {
      const res = await fetch('https://api.github.com/repos/Sahildholpuria/Digital-Order-Management-for-Restaurants/releases/latest');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.tag_name) {
        const latestVersion = data.tag_name.replace(/^v/, '');
        const currentVersion = APP_VERSION;
        const isNewer = this.compareVersions(latestVersion, currentVersion) > 0;
        return {
          success: true,
          isNewer,
          info: {
            version: latestVersion,
            releaseDate: data.published_at,
            releaseNotes: data.body,
            downloadUrl: data.html_url,
          },
        };
      }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Unable to check for updates' };
    }

    return { success: false, error: 'Unable to check for updates' };
  }

  public async startDownloadUpdate(): Promise<{ success: boolean; error?: string }> {
    if (this.isElectron() && window.electronAPI?.startDownloadUpdate) {
      return await window.electronAPI.startDownloadUpdate();
    }
    return { success: false, error: 'Automatic background download is available in the desktop application' };
  }

  public quitAndInstallUpdate(): void {
    if (this.isElectron() && window.electronAPI?.quitAndInstallUpdate) {
      window.electronAPI.quitAndInstallUpdate();
    }
  }

  public onUpdateStatusChange(callback: (payload: UpdateStatusPayload) => void): (() => void) {
    if (this.isElectron() && window.electronAPI?.onUpdateStatusChange) {
      return window.electronAPI.onUpdateStatusChange(callback);
    }
    return () => {};
  }

  public onTriggerCheckUpdates(callback: () => void): (() => void) {
    if (this.isElectron() && window.electronAPI?.onTriggerCheckUpdates) {
      return window.electronAPI.onTriggerCheckUpdates(callback);
    }
    return () => {};
  }

  public compareVersions(v1: string, v2: string): number {
    const p1 = (v1 || '').replace(/^v/i, '').split('.').map(s => parseInt(s, 10) || 0);
    const p2 = (v2 || '').replace(/^v/i, '').split('.').map(s => parseInt(s, 10) || 0);
    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const num1 = p1[i] || 0;
      const num2 = p2[i] || 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  }
}

export const electronService = new ElectronService();
export default electronService;


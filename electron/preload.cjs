const { contextBridge, ipcRenderer } = require('electron');

// Expose safe, secure native APIs into the renderer window
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,

  // Hardware: Local & Network Thermal Printers
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printThermalReceipt: (payload) => ipcRenderer.invoke('print-thermal-receipt', payload),

  // OS & Application details
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // In-app Auto Updates (Windows & macOS)
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  startDownloadUpdate: () => ipcRenderer.invoke('start-download-update'),
  quitAndInstallUpdate: () => ipcRenderer.invoke('quit-and-install-update'),
  onUpdateStatusChange: (callback) => {
    const listener = (event, data) => callback(data);
    ipcRenderer.on('auto-updater-status', listener);
    return () => ipcRenderer.removeListener('auto-updater-status', listener);
  },
  onTriggerCheckUpdates: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('trigger-check-updates', listener);
    return () => ipcRenderer.removeListener('trigger-check-updates', listener);
  },
});


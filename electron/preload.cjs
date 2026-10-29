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
});


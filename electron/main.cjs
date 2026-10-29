const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { autoUpdater } = require('electron-updater');

// Configure auto-updater for managed POS updates
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Determine execution environment
const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev') || !app.isPackaged;
const port = process.env.PORT || 5173;

let mainWindow = null;

// Ensure single instance lock (essential for POS / restaurant management)
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function getAppIcon() {
  const iconPaths = [
    path.join(__dirname, '..', 'build', 'icon.png'),
    path.join(__dirname, '..', 'public', 'pwa-512x512.png'),
    path.join(__dirname, '..', 'public', 'apple-touch-icon.png'),
  ];
  for (const p of iconPaths) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

function createWindow() {
  const icon = getAppIcon();

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    title: 'RestaurantsOS',
    icon,
    backgroundColor: '#0a0a0a',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 18, y: 18 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
      spellcheck: false,
    },
  });

  // Handle external navigation safely
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:') || url.startsWith('mailto:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Load appropriate URL based on environment
  if (isDev) {
    const devUrl = `http://localhost:${port}`;
    mainWindow.loadURL(devUrl).catch(() => {
      setTimeout(() => mainWindow && mainWindow.loadURL(devUrl), 1500);
    });
  } else {
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('Failed to load application index:', err);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  setupMenu();
}

// Native application menu tailored for POS & management workflows
function setupMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac
      ? [
          {
            label: 'RestaurantsOS',
            submenu: [
              { role: 'about', label: 'About RestaurantsOS' },
              {
                label: 'Check for Updates...',
                click: () => {
                  if (mainWindow) mainWindow.webContents.send('trigger-check-updates');
                },
              },
              { type: 'separator' },
              { role: 'services' },
              { type: 'separator' },
              { role: 'hide', label: 'Hide RestaurantsOS' },
              { role: 'hideOthers' },
              { role: 'unhide' },
              { type: 'separator' },
              { role: 'quit', label: 'Quit RestaurantsOS' },
            ],
          },
        ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Print Thermal Ticket...',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.print({ silent: false });
            }
          },
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit', label: 'Exit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload', accelerator: 'CmdOrCtrl+R' },
        { role: 'forceReload', accelerator: 'CmdOrCtrl+Shift+R' },
        { type: 'separator' },
        { role: 'resetZoom', accelerator: 'CmdOrCtrl+0' },
        { role: 'zoomIn', accelerator: 'CmdOrCtrl+Plus' },
        { role: 'zoomOut', accelerator: 'CmdOrCtrl+-' },
        { type: 'separator' },
        { role: 'togglefullscreen', accelerator: isMac ? 'Ctrl+Cmd+F' : 'F11' },
        ...(isDev
          ? [
              { type: 'separator' },
              { role: 'toggleDevTools', accelerator: 'CmdOrCtrl+Shift+I' },
            ]
          : []),
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }]
          : [{ role: 'close' }]),
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Check for Updates...',
          click: () => {
            if (mainWindow) mainWindow.webContents.send('trigger-check-updates');
          },
        },
        { type: 'separator' },
        {
          label: 'RestaurantsOS Documentation',
          click: () => shell.openExternal('https://restaurantsos.in'),
        },
        {
          label: 'Contact Support',
          click: () => shell.openExternal('mailto:support@restaurantsos.in'),
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ==========================================
// IPC HANDLERS: Native Hardware & OS Bridge
// ==========================================

// 1. Retrieve list of installed system printers (Thermal, USB, Network, etc.)
ipcMain.handle('get-printers', async () => {
  if (!mainWindow) return [];
  try {
    const printers = await mainWindow.webContents.getPrintersAsync();
    return printers;
  } catch (err) {
    console.error('[Electron Main] getPrinters error:', err);
    return [];
  }
});

// 2. Direct / Silent Thermal Receipt Printing (No dialog popups)
ipcMain.handle('print-thermal-receipt', async (event, { html, deviceName, copies = 1, silent = true, pageSize = { width: 80000, height: 297000 } }) => {
  return new Promise((resolve) => {
    try {
      const printWindow = new BrowserWindow({
        show: false,
        width: 320,
        height: 600,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @page { margin: 0; size: 80mm auto; }
            body { margin: 0; padding: 4px; font-family: monospace, sans-serif; background: #fff; color: #000; }
          </style>
        </head>
        <body>
          ${html}
        </body>
        </html>
      `;

      printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`);

      printWindow.webContents.on('did-finish-load', () => {
        const options = {
          silent: !!silent,
          printBackground: true,
          deviceName: deviceName || undefined,
          copies: Math.max(1, Number(copies) || 1),
          margins: { marginType: 'none' },
        };

        printWindow.webContents.print(options, (success, failureReason) => {
          printWindow.close();
          if (!success) {
            console.warn('[Electron Main] Silent print failed:', failureReason);
            resolve({ success: false, error: failureReason });
          } else {
            resolve({ success: true });
          }
        });
      });
    } catch (err) {
      console.error('[Electron Main] Print handler exception:', err);
      resolve({ success: false, error: err.message });
    }
  });
});

// 3. System and Platform diagnostics
ipcMain.handle('get-app-info', () => {
  return {
    version: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    isPackaged: app.isPackaged,
    locale: app.getLocale(),
  };
});

// 4. Safe external link opening
ipcMain.handle('open-external', async (event, url) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

// ==========================================
// 5. IN-APP AUTO-UPDATES (Windows & macOS)
// Seamless in-place updates preserving user data & local settings
// ==========================================

function sendUpdateStatus(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('auto-updater-status', payload);
  }
}

autoUpdater.on('checking-for-update', () => {
  sendUpdateStatus({ status: 'checking' });
});

autoUpdater.on('update-available', (info) => {
  sendUpdateStatus({
    status: 'available',
    info: {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    },
  });
});

autoUpdater.on('update-not-available', (info) => {
  sendUpdateStatus({
    status: 'not-available',
    info: {
      version: info.version || app.getVersion(),
    },
  });
});

autoUpdater.on('download-progress', (progressObj) => {
  sendUpdateStatus({
    status: 'downloading',
    progress: {
      percent: Math.round(progressObj.percent || 0),
      bytesPerSecond: progressObj.bytesPerSecond || 0,
      transferred: progressObj.transferred || 0,
      total: progressObj.total || 0,
    },
  });
});

autoUpdater.on('update-downloaded', (info) => {
  sendUpdateStatus({
    status: 'downloaded',
    info: {
      version: info.version,
    },
  });
});

function sanitizeUpdaterError(err) {
  const msg = typeof err === 'string' ? err : (err?.message || String(err || ''));
  if (
    msg.includes('releases.atom') ||
    msg.includes('authentication token is correct') ||
    (msg.includes('404') && (msg.includes('github.com') || msg.includes('releases')))
  ) {
    return '404: No published releases found on GitHub. This happens when no release tag has been pushed yet or the repository is set to Private on GitHub.';
  }
  if (msg.includes('net::ERR_INTERNET_DISCONNECTED') || msg.includes('ENOTFOUND') || msg.includes('getaddrinfo')) {
    return 'No internet connection detected. Please check your network and try again.';
  }
  if (msg.includes('net::ERR_CONNECTION_REFUSED')) {
    return 'Connection refused by update server. Please check your firewall or try again.';
  }
  const clean = msg.replace(/\\n/g, '\n').split('\n')[0].trim();
  return clean.length > 200 ? clean.slice(0, 200) + '...' : (clean || 'Update check failed');
}

autoUpdater.on('error', (err) => {
  console.warn('[AutoUpdater] Native updater notice:', err?.message || err);
  sendUpdateStatus({
    status: 'error',
    error: sanitizeUpdaterError(err),
  });
});

function compareVersions(v1, v2) {
  const p1 = (v1 || '').replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  const p2 = (v2 || '').replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

async function checkGitHubReleasesDirectly(initialError = '') {
  try {
    const currentVersion = app.getVersion();
    const options = {
      hostname: 'api.github.com',
      path: '/repos/Sahildholpuria/Digital-Order-Management-for-Restaurants/releases/latest',
      headers: { 'User-Agent': 'RestaurantsOS-Desktop-POS' },
    };

    const data = await new Promise((resolve, reject) => {
      https.get(options, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', reject);
    });

    if (data && data.tag_name) {
      const latestVersion = data.tag_name.replace(/^v/, '');
      const isNewer = compareVersions(latestVersion, currentVersion) > 0;
      const releaseInfo = {
        version: latestVersion,
        releaseDate: data.published_at,
        releaseNotes: data.body,
        downloadUrl: data.html_url,
      };

      if (isNewer) {
        sendUpdateStatus({
          status: 'available',
          info: releaseInfo,
        });
        return { success: true, isNewer: true, info: releaseInfo };
      } else {
        sendUpdateStatus({
          status: 'not-available',
          info: { version: currentVersion },
        });
        return { success: true, isNewer: false, info: { version: currentVersion } };
      }
    }
  } catch (err) {
    console.warn('[AutoUpdater] Direct GitHub release fallback notice:', err);
  }
  return { success: false, error: sanitizeUpdaterError(initialError) || 'Unable to contact update server' };
}

// IPC 5a: Trigger Update Check
ipcMain.handle('check-for-updates', async () => {
  if (isDev) {
    return await checkGitHubReleasesDirectly();
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    return { success: true, updateInfo: result?.updateInfo };
  } catch (err) {
    console.warn('[AutoUpdater] checkForUpdates fallback notice:', err?.message || err);
    return await checkGitHubReleasesDirectly(err.message);
  }
});

// IPC 5b: Start Download
ipcMain.handle('start-download-update', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return { success: true };
  } catch (err) {
    console.error('[AutoUpdater] downloadUpdate failed:', err);
    return { success: false, error: err.message };
  }
});

// IPC 5c: Quit & Install Update
ipcMain.handle('quit-and-install-update', () => {
  setImmediate(() => {
    autoUpdater.quitAndInstall(false, true);
  });
  return { success: true };
});

// App Lifecycle
app.whenReady().then(() => {
  createWindow();

  // Subtle automatic background check for updates 6s after launch when running packaged
  if (!isDev) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(err => {
        console.warn('[AutoUpdater] Background check notice:', err?.message || err);
      });
    }, 6000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});


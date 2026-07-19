/**
 * Hormuud ProjectHub — Desktop Application (Electron)
 * Real Windows app: own window, taskbar icon, no browser tabs.
 */
const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');

const isPackaged = app.isPackaged;
const projectRoot = isPackaged
  ? path.join(process.resourcesPath, 'app')
  : path.join(__dirname, '..');

function loadConfig() {
  const candidates = [
    path.join(path.dirname(process.execPath), 'app-config.json'),
    path.join(projectRoot, 'desktop', 'app-config.json'),
    path.join(__dirname, 'app-config.json'),
  ];
  const defaults = {
    appUrl: 'http://localhost:8080',
    startLocalServer: true,
    appName: 'Hormuud ProjectHub',
  };
  for (const file of candidates) {
    if (fs.existsSync(file)) {
      try {
        return { ...defaults, ...JSON.parse(fs.readFileSync(file, 'utf8')) };
      } catch {
        /* try next */
      }
    }
  }
  return defaults;
}

let config = loadConfig();
let serverProcess = null;
let mainWindow = null;

function waitForUrl(url, timeoutMs = 90000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const tick = () => {
      const req = http.get(`${url.replace(/\/$/, '')}/api/health`, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) resolve();
        else if (Date.now() < deadline) setTimeout(tick, 800);
        else reject(new Error('Server did not respond'));
      });
      req.on('error', () => {
        if (Date.now() < deadline) setTimeout(tick, 800);
        else reject(new Error('Could not connect to ProjectHub server'));
      });
      req.setTimeout(3000, () => {
        req.destroy();
        if (Date.now() < deadline) setTimeout(tick, 800);
        else reject(new Error('Connection timed out'));
      });
    };
    tick();
  });
}

function startLocalServer() {
  if (!config.startLocalServer) return;
  const script = path.join(projectRoot, 'scripts', 'start-production.mjs');
  if (!fs.existsSync(script)) {
    console.warn('Local server script not found — using appUrl only');
    config.startLocalServer = false;
    return;
  }

  const port = (() => {
    try {
      return new URL(config.appUrl).port || '8080';
    } catch {
      return '8080';
    }
  })();

  serverProcess = spawn(process.execPath, [script], {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      SERVE_STATIC: 'true',
      PUBLIC_DEPLOY: 'true',
      PORT: port,
    },
    stdio: 'ignore',
    windowsHide: true,
  });

  serverProcess.on('error', (err) => {
    dialog.showErrorBox('ProjectHub', `Could not start local server:\n${err.message}`);
  });
}

function createWindow() {
  const iconPath = path.join(projectRoot, 'desktop', 'icon.png');
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: config.appName,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    autoHideMenuBar: true,
    backgroundColor: '#0F2D5C',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(config.appUrl);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      if (config.startLocalServer) {
        startLocalServer();
        await waitForUrl(config.appUrl);
      }
      createWindow();
    } catch (err) {
      dialog.showErrorBox(
        'ProjectHub',
        `${err.message}\n\nIf you use cloud hosting, edit desktop/app-config.json:\n` +
          '  "appUrl": "https://your-app.onrender.com"\n' +
          '  "startLocalServer": false'
      );
      app.quit();
    }
  });

  app.on('window-all-closed', () => {
    if (serverProcess) {
      try {
        serverProcess.kill();
      } catch {
        /* ignore */
      }
    }
    app.quit();
  });
}

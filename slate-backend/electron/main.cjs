// Slate — Electron main process.
// Boots the backend as a child process (system Node, so the native
// better-sqlite3 module matches its ABI), waits for the API to be healthy,
// then opens the SLATE front end served same-origin from that backend.
const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('node:child_process');
const path = require('node:path');
const http = require('node:http');

const PORT = Number(process.env.SLATE_PORT || 8787);
const BASE = `http://127.0.0.1:${PORT}`;
const ROOT = path.resolve(__dirname, '..'); // slate-backend/

let backend = null;
let win = null;

function startBackend() {
  const nodeBin = process.env.SLATE_NODE || 'node';
  const entry = path.join(ROOT, 'dist', 'server.js');
  // Persist the SQLite DB in the OS app-data dir so it survives updates.
  const dbPath = path.join(app.getPath('userData'), 'slate.db');

  backend = spawn(nodeBin, [entry], {
    cwd: ROOT,
    env: Object.assign({}, process.env, {
      PORT: String(PORT),
      DB_PATH: dbPath,
      NODE_ENV: 'production',
      // A stable secret keeps sessions valid across restarts in dev.
      SESSION_SECRET: process.env.SESSION_SECRET || 'slate-desktop-local-secret',
    }),
    stdio: 'inherit',
  });
  backend.on('exit', (code) => {
    backend = null;
    if (code && win) win.webContents.send('backend-exit', code);
  });
}

function waitForHealth(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get(`${BASE}/api/health`, (res) => {
        res.resume();
        if (res.statusCode === 200) return resolve();
        retry();
      });
      req.on('error', retry);
      req.setTimeout(1000, () => req.destroy());
    };
    const retry = () => {
      if (Date.now() > deadline) return reject(new Error('backend did not become healthy'));
      setTimeout(tick, 250);
    };
    tick();
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 680,
    title: 'Slate',
    backgroundColor: '#E6E3DD',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });

  // Open external links (if any) in the system browser, not the app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.loadURL(`${BASE}/SLATE.dc.html`);
  win.on('closed', () => { win = null; });
}

app.whenReady().then(async () => {
  startBackend();
  try {
    await waitForHealth();
  } catch (err) {
    console.error('[slate] backend failed to start:', err.message);
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('quit', () => {
  if (backend) backend.kill();
});

const { app, BrowserWindow, Menu, Tray, shell } = require('electron');
const path = require('node:path');

const PLAYER_URL = 'https://touhou-music-player.pages.dev/';
const PLAYER_ORIGIN = new URL(PLAYER_URL).origin;
const FIREBASE_AUTH_HOST = 'touhou-music-player.firebaseapp.com';

function getAppIconPath() {
  const iconFile = process.platform === 'win32' ? 'TH Reimu NOBG.ico' : path.join('assets', 'icon.png');
  return path.join(app.getAppPath(), iconFile);
}

let mainWindow = null;
let tray = null;
let isQuitting = false;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    app.setAppUserModelId('com.reimuhakurei.touhoumusicplayer');
    createApplicationMenu();
    createWindow();
    createTray();

    app.on('activate', () => {
      if (!mainWindow) createWindow();
      else mainWindow.show();
    });
  }).catch((error) => {
    console.error('Could not start Touhou Music Player:', error);
    app.exit(1);
  });

  app.on('before-quit', () => { isQuitting = true; });
}

function runPlayerAction(selector) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.show();
  mainWindow.webContents.executeJavaScript(
    `document.querySelector(${JSON.stringify(selector)})?.click();`
  ).catch(() => {});
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 860,
    minWidth: 760,
    minHeight: 620,
    show: false,
    backgroundColor: '#101010',
    title: 'Touhou Music Player',
    icon: getAppIconPath(),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    let target;
    try { target = new URL(url); } catch (_) { return { action: 'deny' }; }

    // Firebase Auth uses this trusted handler window for popup sign-in.
    if (target.protocol === 'https:'
      && target.hostname === FIREBASE_AUTH_HOST
      && target.pathname.startsWith('/__/auth/handler')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 520,
          height: 720,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true
          }
        }
      };
    }

    if (target.protocol === 'https:') shell.openExternal(target.href).catch(() => {});
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    let target;
    try { target = new URL(url); } catch (_) { event.preventDefault(); return; }
    if (target.origin === PLAYER_ORIGIN) return;
    event.preventDefault();
    if (target.protocol === 'https:') shell.openExternal(target.href).catch(() => {});
  });

  mainWindow.on('close', (event) => {
    // Closing should exit on Linux because tray icons are not visible in every desktop environment.
    if (isQuitting || process.platform === 'linux') return;
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('closed', () => { mainWindow = null; });
  mainWindow.loadURL(PLAYER_URL);

  if (process.argv.includes('--devtools')) mainWindow.webContents.openDevTools({ mode: 'detach' });
}

function createApplicationMenu() {
  const template = [
    {
      label: 'Player',
      submenu: [
        { label: 'Open Touhou Music Player', click: () => mainWindow?.show() },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'Alt+F4', click: () => app.quit() }
      ]
    },
    {
      label: 'Playback',
      submenu: [
        { label: 'Play / Pause', click: () => runPlayerAction('#play') },
        { label: 'Previous song', click: () => runPlayerAction('#prev') },
        { label: 'Next song', click: () => runPlayerAction('#next') }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Open website', click: () => shell.openExternal(PLAYER_URL) },
        { label: 'About Touhou Music Player', role: 'about' }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createTray() {
  tray = new Tray(getAppIconPath());
  tray.setToolTip('Touhou Music Player');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open player', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'Play / Pause', click: () => runPlayerAction('#play') },
    { label: 'Previous song', click: () => runPlayerAction('#prev') },
    { label: 'Next song', click: () => runPlayerAction('#next') },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]));
  tray.on('click', () => {
    if (mainWindow?.isVisible()) mainWindow.focus();
    else mainWindow?.show();
  });
}

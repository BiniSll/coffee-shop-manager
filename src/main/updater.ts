import { autoUpdater } from 'electron-updater';
import { BrowserWindow, ipcMain } from 'electron';
import isDev from 'electron-is-dev';

export function setupAutoUpdater(win: BrowserWindow): void {
  if (isDev) return;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  const send = (channel: string, data?: unknown) => {
    if (!win.isDestroyed()) win.webContents.send(channel, data);
  };

  autoUpdater.on('checking-for-update', () => send('updater:checking'));
  autoUpdater.on('update-available', info => send('updater:available', info));
  autoUpdater.on('update-not-available', info => send('updater:not-available', info));
  autoUpdater.on('download-progress', progress => send('updater:progress', progress));
  autoUpdater.on('update-downloaded', info => send('updater:downloaded', info));
  autoUpdater.on('error', err => send('updater:error', err.message));

  ipcMain.handle('updater:check', () => autoUpdater.checkForUpdates());
  ipcMain.handle('updater:download', () => autoUpdater.downloadUpdate());
  ipcMain.handle('updater:install', () => autoUpdater.quitAndInstall(false, true));

  // Auto-check 4s after startup so it doesn't slow down the initial load
  setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 4000);
}

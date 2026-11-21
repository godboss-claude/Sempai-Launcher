import { app, BrowserWindow, ipcMain } from 'electron'
import electronUpdater from 'electron-updater'
import type { AppUpdateStatus } from '../shared/types'

const { autoUpdater } = electronUpdater

let current: AppUpdateStatus = {
  state: app.isPackaged ? 'idle' : 'unsupported',
  message: app.isPackaged ? undefined : 'Проверка доступна в установленной версии лаунчера.'
}
let checkInProgress: Promise<unknown> | null = null

function setStatus(status: AppUpdateStatus): void {
  current = status
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) window.webContents.send('updates:status', status)
  }
}

async function checkUpdates(): Promise<AppUpdateStatus> {
  if (!app.isPackaged) {
    return {
      state: 'unsupported',
      message: 'Проверка обновлений доступна после установки лаунчера.'
    }
  }
  if (!checkInProgress) checkInProgress = autoUpdater.checkForUpdates()
  try {
    await checkInProgress
  } catch (error) {
    setStatus({
      state: 'error',
      message: error instanceof Error ? error.message : 'Не удалось проверить обновления.'
    })
  } finally {
    checkInProgress = null
  }
  return current
}

export function registerUpdateHandlers(): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  autoUpdater.allowPrerelease = false
  autoUpdater.disableWebInstaller = true

  autoUpdater.on('checking-for-update', () => setStatus({ state: 'checking' }))
  autoUpdater.on('update-available', (info) =>
    setStatus({ state: 'available', version: info.version })
  )
  autoUpdater.on('update-not-available', (info) =>
    setStatus({ state: 'not-available', version: info.version })
  )
  autoUpdater.on('download-progress', (progress) =>
    setStatus({ state: 'downloading', percent: Math.round(progress.percent) })
  )
  autoUpdater.on('update-downloaded', (info) =>
    setStatus({ state: 'downloaded', version: info.version })
  )
  autoUpdater.on('error', (error) =>
    setStatus({ state: 'error', message: error.message || 'Не удалось проверить обновления.' })
  )

  ipcMain.handle('updates:state', () => current)
  ipcMain.handle('updates:check', () => checkUpdates())
  ipcMain.handle('updates:download', async () => {
    if (!app.isPackaged || current.state !== 'available') return
    try {
      await autoUpdater.downloadUpdate()
    } catch (error) {
      setStatus({
        state: 'error',
        message: error instanceof Error ? error.message : 'Не удалось скачать обновление.'
      })
    }
  })
  ipcMain.handle('updates:install', () => {
    if (app.isPackaged && current.state === 'downloaded') {
      autoUpdater.quitAndInstall(true, true)
    }
  })

  if (app.isPackaged) {
    setTimeout(() => void checkUpdates(), 6000).unref()
  }
}

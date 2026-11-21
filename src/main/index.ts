import { app, BrowserWindow, Menu, shell } from 'electron'
import { join } from 'node:path'
import { registerIpc } from './ipc'
import { onSettingsChanged } from './store'
import { finalizePlaytime } from './minecraft'
import { registerUpdateHandlers } from './updates'

app.setName('Sempai Launcher')
app.setAppUserModelId('ru.sempai.launcher')

let mainWindow: BrowserWindow | null = null

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1320,
    height: 840,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    frame: false,
    backgroundColor: '#050c12',
    autoHideMenuBar: true,
    title: 'Sempai Launcher',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  })

  window.once('ready-to-show', () => {
    window.show()
  })

  window.on('maximize', () => {
    window.webContents.send('window:maximize-changed', true)
  })
  window.on('unmaximize', () => {
    window.webContents.send('window:maximize-changed', false)
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })

  window.webContents.on('will-navigate', (event, url) => {
    const current = window.webContents.getURL()
    if (url !== current) {
      event.preventDefault()
      if (/^https?:\/\//i.test(url)) void shell.openExternal(url)
    }
  })

  window.webContents.on('before-input-event', (event, input) => {
    if (
      !app.isPackaged &&
      (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i'))
    ) {
      window.webContents.toggleDevTools()
      event.preventDefault()
    }
  })

  window.on('closed', () => {
    mainWindow = null
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    void window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}

const gotLock = app.requestSingleInstanceLock()

if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  })

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null)
    registerIpc()
    registerUpdateHandlers()

    onSettingsChanged((settings) => {
      for (const win of BrowserWindow.getAllWindows()) {
        if (!win.isDestroyed()) win.webContents.send('settings:changed', settings)
      }
    })

    mainWindow = createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow()
      }
    })
  })

  app.on('before-quit', () => {
    finalizePlaytime()
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}

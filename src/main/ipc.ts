import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import type { OpenDialogOptions } from 'electron'
import type { Settings } from '../shared/types'
import * as store from './store'
import * as mojang from './mojang'
import * as java from './java'
import * as mods from './mods'
import * as servers from './servers'
import * as minecraft from './minecraft'

function windowFromEvent(event: Electron.IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender)
}

function openExternal(url: string): void {
  if (typeof url !== 'string') return
  if (!/^https?:\/\//i.test(url)) return
  void shell.openExternal(url)
}

export function registerIpc(): void {
  ipcMain.handle('app:info', () => store.getSnapshot().system)

  ipcMain.handle('app:open-external', (_event, url: string) => {
    openExternal(url)
  })

  ipcMain.handle('app:open-path', async (_event, path: string) => {
    if (typeof path === 'string' && path) await shell.openPath(path)
  })

  ipcMain.handle('app:open-data-dir', async () => {
    await shell.openPath(store.dataDir())
  })

  ipcMain.handle('settings:get', () => store.getSnapshot())

  ipcMain.handle('settings:patch', (_event, patch: Partial<Settings>) => {
    if (!patch || typeof patch !== 'object') throw new Error('Некорректные настройки')
    return store.patchSettings(patch)
  })

  ipcMain.handle('settings:choose-java', async (event) => {
    const win = windowFromEvent(event)
    const options: OpenDialogOptions = {
      title: 'Выберите исполняемый файл Java',
      properties: ['openFile'],
      filters:
        process.platform === 'win32'
          ? [{ name: 'Java', extensions: ['exe'] }]
          : [{ name: 'Все файлы', extensions: ['*'] }]
    }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || !result.filePaths[0]) return null
    const path = result.filePaths[0]
    store.patchSettings({ javaPath: path })
    return path
  })

  ipcMain.handle('settings:choose-game-dir', async (event) => {
    const win = windowFromEvent(event)
    const options: OpenDialogOptions = {
      title: 'Выберите папку игры',
      properties: ['openDirectory', 'createDirectory']
    }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)
    if (result.canceled || !result.filePaths[0]) return null
    const path = result.filePaths[0]
    store.ensureGameDir(path)
    store.patchSettings({ gameDir: path })
    return path
  })

  ipcMain.handle('settings:reset', () => store.resetSettings())

  ipcMain.handle('account:login-offline', (_event, name: string) => store.loginOffline(name))

  ipcMain.handle('account:logout', () => {
    store.logout()
  })

  ipcMain.handle('versions:list', () => mojang.getVersionList())

  ipcMain.handle('launch:start', (_event, versionId: string, server?: { host: string; port: number }) =>
    minecraft.startLaunch(versionId, server)
  )

  ipcMain.handle('launch:state', () => minecraft.getLaunchState())

  ipcMain.handle('java:info', (_event, versionId: string) => java.getJavaInfo(versionId))

  ipcMain.handle('mods:list', (_event, gameVersion: string) => mods.listMods(gameVersion))
  ipcMain.handle('mods:search', (_event, query: string, gameVersion: string) =>
    mods.searchModrinth(query, gameVersion)
  )
  ipcMain.handle('mods:install', (_event, projectId: string, gameVersion: string) =>
    mods.installMod(projectId, gameVersion)
  )
  ipcMain.handle('mods:fabric-info', (_event, gameVersion: string) => mods.getFabricInfo(gameVersion))
  ipcMain.handle('mods:install-fabric', (_event, gameVersion: string) => mods.installFabric(gameVersion))
  ipcMain.handle('mods:toggle', (_event, fileName: string, gameVersion: string) => mods.toggleMod(fileName, gameVersion))
  ipcMain.handle('mods:remove', (_event, fileName: string, gameVersion: string) => mods.removeMod(fileName, gameVersion))
  ipcMain.handle('mods:add', (_event, gameVersion: string) => mods.addMods(gameVersion))
  ipcMain.handle('mods:open-folder', (_event, gameVersion: string) => mods.openModsFolder(gameVersion))

  ipcMain.handle('servers:list', () => store.listServers())
  ipcMain.handle('servers:add', (_event, input: { name: string; address: string; note?: string }) =>
    store.addServer(input)
  )
  ipcMain.handle('servers:remove', (_event, id: string) => store.removeServer(id))
  ipcMain.handle(
    'servers:ping',
    (_event, server: { id: string; host: string; port: number }) =>
      servers.pingServer(server)
  )
  ipcMain.handle('servers:ping-all', () => {
    const list = store.listServers()
    return Promise.all(list.map((server) => servers.pingServer(server)))
  })

  ipcMain.handle('friends:list', () => store.listFriends())
  ipcMain.handle('friends:add', async (_event, name: string, note?: string) => {
    const clean = String(name ?? '').trim()
    if (!/^[A-Za-z0-9_]{2,16}$/.test(clean)) {
      throw new Error('Ник должен содержать 2–16 символов: латиница, цифры или _')
    }
    const profile = await mojang.resolveProfile(clean)
    return store.addFriend(profile?.name ?? clean, profile?.uuid ?? null, note ?? '')
  })
  ipcMain.handle('friends:remove', (_event, id: string) => store.removeFriend(id))
  ipcMain.handle('friends:update-note', (_event, id: string, note: string) =>
    store.updateFriendNote(id, note)
  )

  ipcMain.handle('news:list', () => mojang.getNews())

  ipcMain.handle('window:minimize', (event) => {
    windowFromEvent(event)?.minimize()
  })
  ipcMain.handle('window:toggle-maximize', (event) => {
    const win = windowFromEvent(event)
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.handle('window:close', (event) => {
    windowFromEvent(event)?.close()
  })
  ipcMain.handle('window:is-maximized', (event) => {
    return windowFromEvent(event)?.isMaximized() ?? false
  })
}

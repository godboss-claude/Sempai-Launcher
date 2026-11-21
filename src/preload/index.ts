import { contextBridge, ipcRenderer } from 'electron'
import type { IpcRendererEvent } from 'electron'
import type {
  LaunchCloseInfo,
  LaunchProgress,
  ModCatalogEntry,
  AppUpdateStatus,
  SempaiApi,
  Settings
} from '../shared/types'

function subscribe<T>(channel: string, callback: (payload: T) => void): () => void {
  const listener = (_event: IpcRendererEvent, payload: T): void => callback(payload)
  ipcRenderer.on(channel, listener)
  return () => {
    ipcRenderer.removeListener(channel, listener)
  }
}

const api: SempaiApi = {
  app: {
    info: () => ipcRenderer.invoke('app:info'),
    openExternal: (url: string) => ipcRenderer.invoke('app:open-external', url),
    openPath: (path: string) => ipcRenderer.invoke('app:open-path', path),
    openDataDir: () => ipcRenderer.invoke('app:open-data-dir')
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    patch: (patch: Partial<Settings>) => ipcRenderer.invoke('settings:patch', patch),
    chooseJava: () => ipcRenderer.invoke('settings:choose-java'),
    chooseGameDir: () => ipcRenderer.invoke('settings:choose-game-dir'),
    reset: () => ipcRenderer.invoke('settings:reset'),
    onChanged: (callback: (settings: Settings) => void) =>
      subscribe<Settings>('settings:changed', callback)
  },
  account: {
    loginOffline: (name: string) => ipcRenderer.invoke('account:login-offline', name),
    logout: () => ipcRenderer.invoke('account:logout')
  },
  versions: {
    list: () => ipcRenderer.invoke('versions:list')
  },
  launch: {
    start: (versionId: string, server?: { host: string; port: number }) =>
      ipcRenderer.invoke('launch:start', versionId, server),
    state: () => ipcRenderer.invoke('launch:state'),
    onProgress: (callback: (progress: LaunchProgress) => void) =>
      subscribe<LaunchProgress>('launch:progress', callback),
    onLog: (callback: (line: string) => void) => subscribe<string>('launch:log', callback),
    onClose: (callback: (info: LaunchCloseInfo) => void) =>
      subscribe<LaunchCloseInfo>('launch:close', callback),
    onError: (callback: (message: string) => void) =>
      subscribe<string>('launch:error', callback)
  },
  java: {
    info: (versionId: string) => ipcRenderer.invoke('java:info', versionId)
  },
  mods: {
    list: (gameVersion: string) => ipcRenderer.invoke('mods:list', gameVersion),
    search: (query: string, gameVersion: string) =>
      ipcRenderer.invoke('mods:search', query, gameVersion) as Promise<ModCatalogEntry[]>,
    install: (projectId: string, gameVersion: string) =>
      ipcRenderer.invoke('mods:install', projectId, gameVersion),
    fabricInfo: (gameVersion: string) => ipcRenderer.invoke('mods:fabric-info', gameVersion),
    installFabric: (gameVersion: string) => ipcRenderer.invoke('mods:install-fabric', gameVersion),
    toggle: (fileName: string, gameVersion: string) => ipcRenderer.invoke('mods:toggle', fileName, gameVersion),
    remove: (fileName: string, gameVersion: string) => ipcRenderer.invoke('mods:remove', fileName, gameVersion),
    add: (gameVersion: string) => ipcRenderer.invoke('mods:add', gameVersion),
    openFolder: (gameVersion: string) => ipcRenderer.invoke('mods:open-folder', gameVersion)
  },
  servers: {
    list: () => ipcRenderer.invoke('servers:list'),
    add: (input: { name: string; address: string; note?: string }) =>
      ipcRenderer.invoke('servers:add', input),
    remove: (id: string) => ipcRenderer.invoke('servers:remove', id),
    ping: (server: { id: string; host: string; port: number }) =>
      ipcRenderer.invoke('servers:ping', server),
    pingAll: () => ipcRenderer.invoke('servers:ping-all')
  },
  friends: {
    list: () => ipcRenderer.invoke('friends:list'),
    add: (name: string, note?: string) => ipcRenderer.invoke('friends:add', name, note),
    remove: (id: string) => ipcRenderer.invoke('friends:remove', id),
    updateNote: (id: string, note: string) =>
      ipcRenderer.invoke('friends:update-note', id, note)
  },
  news: {
    list: () => ipcRenderer.invoke('news:list')
  },
  updates: {
    state: () => ipcRenderer.invoke('updates:state'),
    check: () => ipcRenderer.invoke('updates:check'),
    download: () => ipcRenderer.invoke('updates:download'),
    install: () => { void ipcRenderer.invoke('updates:install') },
    onStatus: (callback: (status: AppUpdateStatus) => void) =>
      subscribe<AppUpdateStatus>('updates:status', callback)
  },
  window: {
    minimize: () => {
      void ipcRenderer.invoke('window:minimize')
    },
    toggleMaximize: () => {
      void ipcRenderer.invoke('window:toggle-maximize')
    },
    close: () => {
      void ipcRenderer.invoke('window:close')
    },
    isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
    onMaximizeChange: (callback: (maximized: boolean) => void) =>
      subscribe<boolean>('window:maximize-changed', callback)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type ThemeId = 'emerald' | 'pink'

export type PageId = 'play' | 'skins' | 'mods' | 'servers' | 'friends' | 'settings'

export type AccountType = 'offline' | 'microsoft'

export interface Account {
  type: AccountType
  name: string
  uuid: string
  accessToken: string
  createdAt: number
}

export interface Settings {
  theme: ThemeId
  reduceMotion: boolean
  account: Account | null
  memoryMin: number
  memoryMax: number
  width: number
  height: number
  fullscreen: boolean
  javaPath: string
  gameDir: string
  jvmArgs: string
  minimizeOnLaunch: boolean
  showSnapshots: boolean
  lastVersion: string
  skinModel: 'classic' | 'slim'
  playtimeSeconds: number
  lastPlayedAt: number | null
}

export interface Friend {
  id: string
  name: string
  uuid: string | null
  note: string
  addedAt: number
}

export interface ServerEntry {
  id: string
  name: string
  host: string
  port: number
  note?: string
  custom?: boolean
}

export interface PingResult {
  id: string
  online: boolean
  ping: number | null
  players?: {
    online: number
    max: number
  }
  version?: string
  motd?: string
  icon?: string
  error?: string
}

export interface ModEntry {
  fileName: string
  name: string
  size: number
  enabled: boolean
  modified: number
}

export interface ModCatalogEntry {
  projectId: string
  slug: string
  title: string
  description: string
  author: string
  downloads: number
  iconUrl?: string
  categories: string[]
}

export interface FabricInfo {
  installed: boolean
  profileId: string
  loaderVersion: string | null
}

export interface VersionInfo {
  id: string
  type: string
  releaseTime: string
}

export interface VersionManifestInfo {
  versions: VersionInfo[]
  latest: {
    release: string
    snapshot: string
  }
}

export interface NewsEntry {
  id: string
  title: string
  category: string
  date: string
  text: string
  image?: string
  url?: string
}

export interface LaunchProgress {
  stage: string
  detail: string
  percent: number | null
}

export interface LaunchState {
  running: boolean
  version: string | null
  startedAt: number | null
}

export interface LaunchResult {
  ok: boolean
  error?: string
}

export interface LaunchCloseInfo {
  code: number | null
  sessionSeconds: number
  playtimeSeconds: number
}

export type AppUpdateState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'unsupported'
  | 'error'

export interface AppUpdateStatus {
  state: AppUpdateState
  version?: string
  percent?: number
  message?: string
}

export interface JavaInfo {
  available: boolean
  path: string
  source: 'manual' | 'runtime' | 'none'
  major: number | null
  requiredMajor: number | null
  downloading: boolean
}

export interface SystemInfo {
  appVersion: string
  platform: string
  arch: string
  totalMemoryMb: number
  cpuCount: number
  dataDir: string
  gameDirExists: boolean
  javaRuntimeDir: string
}

export interface StoreSnapshot {
  settings: Settings
  friends: Friend[]
  servers: ServerEntry[]
  system: SystemInfo
}

export interface SempaiApi {
  app: {
    info(): Promise<SystemInfo>
    openExternal(url: string): Promise<void>
    openPath(path: string): Promise<void>
    openDataDir(): Promise<void>
  }
  settings: {
    get(): Promise<StoreSnapshot>
    patch(patch: Partial<Settings>): Promise<Settings>
    chooseJava(): Promise<string | null>
    chooseGameDir(): Promise<string | null>
    reset(): Promise<StoreSnapshot>
    onChanged(callback: (settings: Settings) => void): () => void
  }
  account: {
    loginOffline(name: string): Promise<Account>
    logout(): Promise<void>
  }
  versions: {
    list(): Promise<VersionManifestInfo>
  }
  launch: {
    start(versionId: string, server?: { host: string; port: number }): Promise<LaunchResult>
    state(): Promise<LaunchState>
    onProgress(callback: (progress: LaunchProgress) => void): () => void
    onLog(callback: (line: string) => void): () => void
    onClose(callback: (info: LaunchCloseInfo) => void): () => void
    onError(callback: (message: string) => void): () => void
  }
  java: {
    info(versionId: string): Promise<JavaInfo>
  }
  mods: {
    list(gameVersion: string): Promise<ModEntry[]>
    search(query: string, gameVersion: string): Promise<ModCatalogEntry[]>
    install(projectId: string, gameVersion: string): Promise<ModEntry[]>
    fabricInfo(gameVersion: string): Promise<FabricInfo>
    installFabric(gameVersion: string): Promise<FabricInfo>
    toggle(fileName: string, gameVersion: string): Promise<ModEntry[]>
    remove(fileName: string, gameVersion: string): Promise<ModEntry[]>
    add(gameVersion: string): Promise<ModEntry[]>
    openFolder(gameVersion: string): Promise<void>
  }
  servers: {
    list(): Promise<ServerEntry[]>
    add(input: { name: string; address: string; note?: string }): Promise<ServerEntry[]>
    remove(id: string): Promise<ServerEntry[]>
    ping(server: { id: string; host: string; port: number }): Promise<PingResult>
    pingAll(): Promise<PingResult[]>
  }
  friends: {
    list(): Promise<Friend[]>
    add(name: string, note?: string): Promise<Friend[]>
    remove(id: string): Promise<Friend[]>
    updateNote(id: string, note: string): Promise<Friend[]>
  }
  news: {
    list(): Promise<NewsEntry[]>
  }
  updates: {
    state(): Promise<AppUpdateStatus>
    check(): Promise<AppUpdateStatus>
    download(): Promise<void>
    install(): void
    onStatus(callback: (status: AppUpdateStatus) => void): () => void
  }
  window: {
    minimize(): void
    toggleMaximize(): void
    close(): void
    isMaximized(): Promise<boolean>
    onMaximizeChange(callback: (maximized: boolean) => void): () => void
  }
}

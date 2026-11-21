import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { createHash, randomUUID } from 'node:crypto'
import { join } from 'node:path'
import os from 'node:os'
import type {
  Account,
  Friend,
  ServerEntry,
  Settings,
  StoreSnapshot,
  SystemInfo
} from '../shared/types'

export const DEFAULT_SERVERS: ServerEntry[] = [
  {
    id: 'funtime',
    name: 'FunTime',
    host: 'mc.funtime.su',
    port: 25565,
    note: 'Гриферские режимы и мини-игры'
  },
  {
    id: 'holyworld',
    name: 'HolyWorld',
    host: 'mc.holyworld.ru',
    port: 25565,
    note: 'Выживание и анархия'
  },
  {
    id: 'reallyworld',
    name: 'ReallyWorld',
    host: 'mc.reallyworld.ru',
    port: 25565,
    note: 'Анархия, гриферство, PvP'
  },
  {
    id: 'mineblaze',
    name: 'MineBlaze',
    host: 'mc.mineblaze.net',
    port: 25565,
    note: 'Мини-игры и PvP'
  },
  {
    id: 'hypixel',
    name: 'Hypixel',
    host: 'mc.hypixel.net',
    port: 25565,
    note: 'Крупнейший мировой сервер'
  },
  {
    id: 'cubecraft',
    name: 'CubeCraft',
    host: 'play.cubecraft.net',
    port: 25565,
    note: 'Мини-игры для Java Edition'
  }
]

interface StoreData {
  settings: Settings
  friends: Friend[]
  servers: ServerEntry[]
}

let cached: StoreData | null = null

function totalMemoryMb(): number {
  return Math.floor(os.totalmem() / (1024 * 1024))
}

export function defaultGameDir(): string {
  return join(app.getPath('appData'), '.sempai')
}

export function dataDir(): string {
  return app.getPath('userData')
}

export function runtimeDir(): string {
  return join(defaultGameDir(), 'runtime')
}

function storeFile(): string {
  return join(dataDir(), 'sempai-store.json')
}

function defaultSettings(): Settings {
  const total = totalMemoryMb()
  const suggested = Math.min(8192, Math.max(2048, Math.floor(total / 4 / 512) * 512))
  return {
    theme: 'emerald',
    reduceMotion: false,
    account: null,
    memoryMin: 1024,
    memoryMax: suggested,
    width: 1280,
    height: 720,
    fullscreen: false,
    javaPath: '',
    gameDir: defaultGameDir(),
    jvmArgs: '',
    minimizeOnLaunch: true,
    showSnapshots: false,
    lastVersion: '',
    skinModel: 'classic',
    playtimeSeconds: 0,
    lastPlayedAt: null
  }
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.round(value)))
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function normalizeAccount(value: unknown): Account | null {
  if (!value || typeof value !== 'object') return null
  const account = value as Partial<Account>
  if (!account.name || !account.uuid) return null
  return {
    type: account.type === 'microsoft' ? 'microsoft' : 'offline',
    name: account.name,
    uuid: account.uuid,
    accessToken: asString(account.accessToken),
    createdAt: typeof account.createdAt === 'number' ? account.createdAt : Date.now()
  }
}

function normalizeSettings(raw: Partial<Settings> | undefined): Settings {
  const base = defaultSettings()
  const source = raw ?? {}
  const total = totalMemoryMb()
  const memoryMax = clamp(
    typeof source.memoryMax === 'number' ? source.memoryMax : base.memoryMax,
    1024,
    Math.max(32768, total)
  )
  const memoryMin = clamp(
    typeof source.memoryMin === 'number' ? source.memoryMin : base.memoryMin,
    512,
    memoryMax
  )
  const gameDir = asString(source.gameDir, base.gameDir).trim() || base.gameDir

  return {
    theme: source.theme === 'pink' ? 'pink' : 'emerald',
    reduceMotion: Boolean(source.reduceMotion),
    account: normalizeAccount(source.account),
    memoryMin,
    memoryMax,
    width: clamp(typeof source.width === 'number' ? source.width : base.width, 640, 7680),
    height: clamp(typeof source.height === 'number' ? source.height : base.height, 480, 4320),
    fullscreen: Boolean(source.fullscreen),
    javaPath: asString(source.javaPath),
    gameDir,
    jvmArgs: asString(source.jvmArgs).slice(0, 2000),
    minimizeOnLaunch: source.minimizeOnLaunch !== false,
    showSnapshots: Boolean(source.showSnapshots),
    lastVersion: asString(source.lastVersion),
    skinModel: source.skinModel === 'slim' ? 'slim' : 'classic',
    playtimeSeconds:
      typeof source.playtimeSeconds === 'number' && source.playtimeSeconds > 0
        ? Math.floor(source.playtimeSeconds)
        : 0,
    lastPlayedAt:
      typeof source.lastPlayedAt === 'number' && source.lastPlayedAt > 0
        ? source.lastPlayedAt
        : null
  }
}

function normalizeFriend(value: unknown): Friend | null {
  if (!value || typeof value !== 'object') return null
  const friend = value as Partial<Friend>
  if (!friend.name) return null
  return {
    id: asString(friend.id) || randomUUID(),
    name: friend.name,
    uuid: asString(friend.uuid) || null,
    note: asString(friend.note).slice(0, 120),
    addedAt: typeof friend.addedAt === 'number' ? friend.addedAt : Date.now()
  }
}

function normalizeServer(value: unknown): ServerEntry | null {
  if (!value || typeof value !== 'object') return null
  const server = value as Partial<ServerEntry>
  if (!server.name || !server.host) return null
  return {
    id: asString(server.id) || `custom-${randomUUID()}`,
    name: server.name.slice(0, 40),
    host: server.host,
    port: clamp(typeof server.port === 'number' ? server.port : 25565, 1, 65535),
    note: asString(server.note).slice(0, 120),
    custom: true
  }
}

function load(): StoreData {
  if (cached) return cached
  const file = storeFile()
  let raw: Partial<StoreData> = {}
  try {
    if (existsSync(file)) {
      raw = JSON.parse(readFileSync(file, 'utf8')) as Partial<StoreData>
    }
  } catch (error) {
    console.error('[store] Не удалось прочитать настройки:', error)
  }

  cached = {
    settings: normalizeSettings(raw.settings),
    friends: Array.isArray(raw.friends)
      ? raw.friends.map(normalizeFriend).filter((friend): friend is Friend => Boolean(friend))
      : [],
    servers: Array.isArray(raw.servers)
      ? raw.servers.map(normalizeServer).filter((server): server is ServerEntry => Boolean(server))
      : []
  }
  ensureGameDir(cached.settings.gameDir)
  syncVisualModConfig(cached.settings)
  return cached
}

function save(): void {
  const data = load()
  const file = storeFile()
  const temp = `${file}.tmp`
  try {
    mkdirSync(dataDir(), { recursive: true })
    writeFileSync(temp, JSON.stringify(data, null, 2), 'utf8')
    renameSync(temp, file)
  } catch (error) {
    console.error('[store] Не удалось сохранить настройки:', error)
  }
}

export function ensureGameDir(dir: string): string {
  try {
    mkdirSync(dir, { recursive: true })
    mkdirSync(join(dir, 'mods'), { recursive: true })
  } catch (error) {
    console.error('[store] Не удалось создать игровую папку:', error)
  }
  return dir
}

function syncVisualModConfig(settings: Settings): void {
  try {
    const configDir = join(settings.gameDir, 'config')
    mkdirSync(configDir, { recursive: true })
    const file = join(configDir, 'sempai-visuals.json')
    const temp = `${file}.tmp`
    writeFileSync(temp, JSON.stringify({ theme: settings.theme }, null, 2), 'utf8')
    renameSync(temp, file)
  } catch (error) {
    console.error('[store] Не удалось синхронизировать тему игрового мода:', error)
  }
}

export function getSettings(): Settings {
  return load().settings
}

let changeListener: ((settings: Settings) => void) | null = null

export function onSettingsChanged(listener: (settings: Settings) => void): void {
  changeListener = listener
}

export function patchSettings(patch: Partial<Settings>): Settings {
  const data = load()
  const next = normalizeSettings({ ...data.settings, ...patch })
  if (patch.account === null) next.account = null
  if (patch.gameDir && patch.gameDir !== data.settings.gameDir) {
    ensureGameDir(next.gameDir)
  }
  data.settings = next
  save()
  syncVisualModConfig(next)
  changeListener?.(next)
  return next
}

export function resetSettings(): StoreSnapshot {
  const data = load()
  const account = data.settings.account
  data.settings = { ...defaultSettings(), account }
  ensureGameDir(data.settings.gameDir)
  save()
  syncVisualModConfig(data.settings)
  changeListener?.(data.settings)
  return getSnapshot()
}

export function getSnapshot(): StoreSnapshot {
  const data = load()
  const settings = data.settings
  const system: SystemInfo = {
    appVersion: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
    totalMemoryMb: totalMemoryMb(),
    cpuCount: os.cpus().length,
    dataDir: dataDir(),
    gameDirExists: existsSync(settings.gameDir),
    javaRuntimeDir: runtimeDir()
  }
  return {
    settings,
    friends: data.friends,
    servers: listServers(),
    system
  }
}

export function offlineUuid(name: string): string {
  // Официальный алгоритм офлайн-UUID Minecraft (OfflinePlayer:<ник>).
  const bytes = Buffer.from(createHash('md5').update(`OfflinePlayer:${name}`, 'utf8').digest())
  bytes[6] = (bytes[6] & 0x0f) | 0x30
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.toString('hex')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function loginOffline(name: string): Account {
  const clean = name.trim()
  if (!/^[A-Za-z0-9_]{3,16}$/.test(clean)) {
    throw new Error('Ник должен содержать 3–16 символов: латиница, цифры или _')
  }
  const account: Account = {
    type: 'offline',
    name: clean,
    uuid: offlineUuid(clean),
    accessToken: randomUUID().replace(/-/g, ''),
    createdAt: Date.now()
  }
  const data = load()
  data.settings.account = account
  save()
  changeListener?.(data.settings)
  return account
}

export function logout(): void {
  const data = load()
  data.settings.account = null
  save()
  changeListener?.(data.settings)
}

export function listFriends(): Friend[] {
  return load().friends
}

export function addFriend(name: string, uuid: string | null, note = ''): Friend[] {
  const clean = name.trim()
  if (!clean) throw new Error('Укажите ник друга')
  const data = load()
  if (data.friends.some((friend) => friend.name.toLowerCase() === clean.toLowerCase())) {
    throw new Error('Этот игрок уже добавлен')
  }
  data.friends.unshift({
    id: randomUUID(),
    name: clean,
    uuid,
    note: note.trim().slice(0, 120),
    addedAt: Date.now()
  })
  save()
  return data.friends
}

export function removeFriend(id: string): Friend[] {
  const data = load()
  data.friends = data.friends.filter((friend) => friend.id !== id)
  save()
  return data.friends
}

export function updateFriendNote(id: string, note: string): Friend[] {
  const data = load()
  const friend = data.friends.find((item) => item.id === id)
  if (friend) friend.note = note.trim().slice(0, 120)
  save()
  return data.friends
}

export function listServers(): ServerEntry[] {
  const data = load()
  return [...DEFAULT_SERVERS, ...data.servers]
}

export function parseAddress(address: string): { host: string; port: number } {
  const clean = address.trim().replace(/^minecraft:\/\//i, '').replace(/\/.*$/, '')
  if (!clean) throw new Error('Укажите адрес сервера')
  let host = clean
  let port = 25565
  const ipv6 = clean.match(/^\[([^\]]+)\](?::(\d+))?$/)
  if (ipv6) {
    host = ipv6[1]
    if (ipv6[2]) port = Number(ipv6[2])
  } else if (clean.split(':').length === 2) {
    const [hostPart, portPart] = clean.split(':')
    host = hostPart
    port = Number(portPart)
  }
  if (!host || !/^[A-Za-z0-9._-]+$/.test(host)) {
    throw new Error('Некорректный адрес сервера')
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Некорректный порт сервера')
  }
  return { host, port }
}

export function addServer(input: { name: string; address: string; note?: string }): ServerEntry[] {
  const name = input.name.trim()
  if (!name) throw new Error('Укажите название сервера')
  const { host, port } = parseAddress(input.address)
  const data = load()
  if (data.servers.some((server) => server.host === host && server.port === port)) {
    throw new Error('Этот сервер уже добавлен')
  }
  data.servers.push({
    id: `custom-${randomUUID()}`,
    name: name.slice(0, 40),
    host,
    port,
    note: (input.note ?? '').trim().slice(0, 120),
    custom: true
  })
  save()
  return listServers()
}

export function removeServer(id: string): ServerEntry[] {
  const data = load()
  data.servers = data.servers.filter((server) => server.id !== id)
  save()
  return listServers()
}

export function addPlaytime(seconds: number): Settings {
  const data = load()
  data.settings.playtimeSeconds += Math.max(0, Math.floor(seconds))
  data.settings.lastPlayedAt = Date.now()
  save()
  changeListener?.(data.settings)
  return data.settings
}

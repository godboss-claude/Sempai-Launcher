import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { NewsEntry, VersionInfo, VersionManifestInfo } from '../shared/types'
import { dataDir } from './store'

const VERSION_MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'
const NEWS_URL = 'https://launchercontent.mojang.com/v2/news.json'
const NEWS_IMAGE_BASE = 'https://launchercontent.mojang.com'

const FALLBACK_VERSIONS: VersionInfo[] = [
  '26.3',
  '26.2',
  '26.1.2',
  '26.1.1',
  '26.1',
  '1.21.11',
  '1.21.10',
  '1.21.8',
  '1.21.5',
  '1.21.4',
  '1.21.1',
  '1.20.6',
  '1.20.1',
  '1.19.4',
  '1.18.2',
  '1.16.5',
  '1.12.2',
  '1.8.9'
].map((id, index) => ({
  id,
  type: 'release',
  releaseTime: new Date(Date.now() - index * 86400000 * 30).toISOString()
}))

interface ManifestEntry {
  id: string
  type: string
  url: string
  releaseTime: string
}

interface VersionManifest {
  latest: { release: string; snapshot: string }
  versions: ManifestEntry[]
}

interface CachedManifest {
  fetchedAt: number
  data: VersionManifest
}

const FALLBACK_NEWS: NewsEntry[] = [
  {
    id: 'welcome',
    title: 'Добро пожаловать в Sempai Launcher',
    category: 'Лаунчер',
    date: new Date().toISOString().slice(0, 10),
    text: 'Выберите версию, нажмите «Играть» — лаунчер сам скачает игру, библиотеки и подходящую Java. Приятной игры!'
  },
  {
    id: 'themes',
    title: 'Темы на любой вкус',
    category: 'Лаунчер',
    date: new Date().toISOString().slice(0, 10),
    text: 'Изумрудно-синяя тема по умолчанию и розовая — переключаются в один клик в шапке или в настройках.'
  },
  {
    id: 'servers',
    title: 'Быстрый вход на серверы',
    category: 'Лаунчер',
    date: new Date().toISOString().slice(0, 10),
    text: 'Откройте раздел «Серверы», проверьте пинг и зайдите в игру сразу на нужный сервер одним нажатием.'
  }
]

let manifestCache: CachedManifest | null = null
let newsCache: { fetchedAt: number; data: NewsEntry[] } | null = null
const versionMetaCache = new Map<string, any>()

function manifestCacheFile(): string {
  return join(dataDir(), 'cache', 'version_manifest_v2.json')
}

function readDiskManifest(): VersionManifest | null {
  try {
    const file = manifestCacheFile()
    if (!existsSync(file)) return null
    return JSON.parse(readFileSync(file, 'utf8')) as VersionManifest
  } catch {
    return null
  }
}

function writeDiskManifest(data: VersionManifest): void {
  try {
    const dir = join(dataDir(), 'cache')
    mkdirSync(dir, { recursive: true })
    writeFileSync(manifestCacheFile(), JSON.stringify(data), 'utf8')
  } catch (error) {
    console.error('[mojang] Не удалось сохранить манифест версий:', error)
  }
}

export async function getManifest(force = false): Promise<VersionManifest> {
  const fresh =
    manifestCache && Date.now() - manifestCache.fetchedAt < 10 * 60 * 1000 && !force
  if (fresh && manifestCache) return manifestCache.data

  try {
    const response = await fetch(VERSION_MANIFEST_URL, {
      headers: { 'User-Agent': 'SempaiLauncher/1.0' }
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = (await response.json()) as VersionManifest
    manifestCache = { fetchedAt: Date.now(), data }
    writeDiskManifest(data)
    return data
  } catch (error) {
    console.warn('[mojang] Манифест недоступен, использую кэш:', error)
    if (manifestCache) return manifestCache.data
    const disk = readDiskManifest()
    if (disk) {
      manifestCache = { fetchedAt: Date.now(), data: disk }
      return disk
    }
    const data: VersionManifest = {
      latest: { release: FALLBACK_VERSIONS[0].id, snapshot: '' },
      versions: FALLBACK_VERSIONS.map((version) => ({
        ...version,
        url: ''
      }))
    }
    return data
  }
}

export async function getVersionList(): Promise<VersionManifestInfo> {
  const manifest = await getManifest()
  return {
    latest: manifest.latest,
    versions: manifest.versions.map((version) => ({
      id: version.id,
      type: version.type,
      releaseTime: version.releaseTime
    }))
  }
}

export async function getVersionMeta(versionId: string): Promise<any | null> {
  if (versionMetaCache.has(versionId)) return versionMetaCache.get(versionId)
  try {
    const manifest = await getManifest()
    const entry = manifest.versions.find((version) => version.id === versionId)
    if (!entry?.url) return null
    const response = await fetch(entry.url, {
      headers: { 'User-Agent': 'SempaiLauncher/1.0' }
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const meta = await response.json()
    versionMetaCache.set(versionId, meta)
    return meta
  } catch (error) {
    console.warn(`[mojang] Не удалось получить метаданные версии ${versionId}:`, error)
    return null
  }
}

function fallbackJavaMajor(versionId: string): number {
  if (/^26\./.test(versionId)) return 25
  const match = versionId.match(/^1\.(\d+)(?:\.(\d+))?/)
  if (!match) return 21
  const minor = Number(match[1])
  const patch = Number(match[2] ?? 0)
  if (minor >= 21 || (minor === 20 && patch >= 5)) return 21
  if (minor >= 17) return 17
  return 8
}

export async function requiredJavaMajor(versionId: string): Promise<number> {
  const meta = await getVersionMeta(versionId)
  const major = meta?.javaVersion?.majorVersion
  if (typeof major === 'number' && major > 0) return major
  return fallbackJavaMajor(versionId)
}

export async function getNews(): Promise<NewsEntry[]> {
  if (newsCache && Date.now() - newsCache.fetchedAt < 30 * 60 * 1000) {
    return newsCache.data
  }
  try {
    const response = await fetch(NEWS_URL, {
      headers: { 'User-Agent': 'SempaiLauncher/1.0' }
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const payload = (await response.json()) as {
      entries?: Array<{
        title?: string
        category?: string
        date?: string
        text?: string
        newsPageImage?: { url?: string }
        readMoreLink?: string
      }>
    }
    const entries = payload.entries ?? []
    const javaEntries = entries.filter((entry) => entry.category === 'Minecraft: Java Edition')
    const selected = (javaEntries.length >= 3 ? javaEntries : entries).slice(0, 6)
    const data: NewsEntry[] = selected.map((entry, index) => ({
      id: `${entry.date ?? ''}-${index}-${entry.title ?? ''}`,
      title: entry.title ?? 'Новость Minecraft',
      category: entry.category ?? 'Minecraft',
      date: entry.date ?? '',
      text: entry.text ?? '',
      image: entry.newsPageImage?.url
        ? `${NEWS_IMAGE_BASE}${entry.newsPageImage.url}`
        : undefined,
      url: entry.readMoreLink
    }))
    newsCache = { fetchedAt: Date.now(), data }
    return data
  } catch (error) {
    console.warn('[mojang] Новости недоступны:', error)
    return newsCache?.data ?? FALLBACK_NEWS
  }
}

export interface MojangProfile {
  name: string
  uuid: string
}

const profileCache = new Map<string, { at: number; profile: MojangProfile | null }>()

export async function resolveProfile(name: string): Promise<MojangProfile | null> {
  const key = name.toLowerCase()
  const cached = profileCache.get(key)
  if (cached && Date.now() - cached.at < 10 * 60 * 1000) return cached.profile
  try {
    const response = await fetch(
      `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(name)}`,
      { headers: { 'User-Agent': 'SempaiLauncher/1.0' } }
    )
    if (!response.ok) {
      profileCache.set(key, { at: Date.now(), profile: null })
      return null
    }
    const data = (await response.json()) as { id?: string; name?: string }
    if (!data.id || !data.name) {
      profileCache.set(key, { at: Date.now(), profile: null })
      return null
    }
    const profile: MojangProfile = { name: data.name, uuid: data.id }
    profileCache.set(key, { at: Date.now(), profile })
    return profile
  } catch (error) {
    console.warn('[mojang] Не удалось проверить ник:', error)
    return null
  }
}

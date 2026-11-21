import { dialog, shell } from 'electron'
import AdmZip from 'adm-zip'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  statSync
} from 'node:fs'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { basename, extname, join } from 'node:path'
import type { FabricInfo, ModCatalogEntry, ModEntry } from '../shared/types'
import { getSettings } from './store'
import { prepareJava } from './java'

const MODRINTH_API = 'https://api.modrinth.com/v2'
const USER_AGENT = 'SempaiLauncher/1.0 (mod browser)'
const MODRINTH_MAX_FILE_BYTES = 250 * 1024 * 1024

function numericVersion(value: string): number[] | null {
  const match = value.match(/^\s*(\d+(?:\.\d+){0,2})/)
  return match ? match[1].split('.').map(Number) : null
}

function compareVersions(left: number[], right: number[]): number {
  for (let i = 0; i < 3; i += 1) {
    const difference = (left[i] ?? 0) - (right[i] ?? 0)
    if (difference !== 0) return difference
  }
  return 0
}

function versionSatisfies(gameVersion: string, range: string): boolean {
  if (!range || range === '*') return true
  const game = numericVersion(gameVersion)
  if (!game) return false
  return range.split('||').some((alternative) => {
    const value = alternative.trim()
    if (value.startsWith('~')) {
      const minimum = numericVersion(value.slice(1))
      return Boolean(minimum && game[0] === minimum[0] && game[1] === minimum[1] && compareVersions(game, minimum) >= 0)
    }
    const constraints = [...value.matchAll(/(>=|<=|>|<|=|\^)?\s*(\d+(?:\.\d+){0,2})/g)]
    if (constraints.length === 0) return value === '*'
    return constraints.every((constraint) => {
      const operator = constraint[1] ?? '='
      const version = numericVersion(constraint[2])
      if (!version) return false
      const comparison = compareVersions(game, version)
      if (operator === '>=') return comparison >= 0
      if (operator === '<=') return comparison <= 0
      if (operator === '>') return comparison > 0
      if (operator === '<') return comparison < 0
      if (operator === '^') return game[0] === version[0] && comparison >= 0
      return comparison === 0
    })
  })
}

function isCompatibleLegacyMod(filePath: string, gameVersion: string): boolean {
  try {
    const zip = new AdmZip(filePath)
    const entry = zip.getEntry('fabric.mod.json')
    if (!entry) return false
    const metadata = JSON.parse(entry.getData().toString('utf8')) as {
      depends?: { minecraft?: string | string[] }
    }
    const dependency = metadata.depends?.minecraft
    if (Array.isArray(dependency)) return dependency.some((range) => versionSatisfies(gameVersion, range))
    return versionSatisfies(gameVersion, dependency ?? '*')
  } catch {
    return false
  }
}

function modsDir(gameVersion = getSettings().lastVersion): string {
  const settings = getSettings()
  const safeVersion = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(gameVersion) ? gameVersion : 'default'
  const root = join(settings.gameDir, 'mods')
  const dir = join(root, safeVersion)
  mkdirSync(dir, { recursive: true })

  // Preserve older launcher installs while moving only mods that declare support for this game version.
  try {
    for (const entry of readdirSync(root, { withFileTypes: true })) {
      if (!entry.isFile() || !isModFile(entry.name)) continue
      if (entry.name.toLowerCase().startsWith('sempai-visuals-')) continue
      const source = join(root, entry.name)
      const destination = join(dir, entry.name)
      if (!existsSync(destination) && isCompatibleLegacyMod(source, safeVersion)) copyFileSync(source, destination)
    }
  } catch {
    /* The version-specific mod directory is still usable if legacy migration fails. */
  }
  return dir
}

function isModFile(name: string): boolean {
  return name.endsWith('.jar') || name.endsWith('.jar.disabled')
}

function displayName(fileName: string): string {
  return fileName
    .replace(/\.jar\.disabled$/i, '')
    .replace(/\.jar$/i, '')
    .replace(/[-_]+/g, ' ')
    .trim()
}

function assertFileName(fileName: string): void {
  if (!fileName || basename(fileName) !== fileName || !isModFile(fileName)) {
    throw new Error('Некорректное имя файла мода')
  }
}

export function listMods(gameVersion?: string): ModEntry[] {
  const dir = modsDir(gameVersion)
  const entries: ModEntry[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isFile() || !isModFile(entry.name)) continue
    const full = join(dir, entry.name)
    let size = 0
    let modified = 0
    try {
      const info = statSync(full)
      size = info.size
      modified = info.mtimeMs
    } catch {
      /* ignore */
    }
    entries.push({
      fileName: entry.name,
      name: displayName(entry.name),
      size,
      enabled: !entry.name.endsWith('.disabled'),
      modified
    })
  }
  return entries.sort((a, b) => {
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1
    return a.name.localeCompare(b.name, 'ru')
  })
}

export function toggleMod(fileName: string, gameVersion?: string): ModEntry[] {
  assertFileName(fileName)
  const dir = modsDir(gameVersion)
  const source = join(dir, fileName)
  if (!existsSync(source)) throw new Error('Мод не найден')
  const target = fileName.endsWith('.disabled')
    ? join(dir, fileName.replace(/\.disabled$/i, ''))
    : join(dir, `${fileName}.disabled`)
  renameSync(source, target)
  return listMods(gameVersion)
}

export async function removeMod(fileName: string, gameVersion?: string): Promise<ModEntry[]> {
  assertFileName(fileName)
  const full = join(modsDir(gameVersion), fileName)
  if (!existsSync(full)) throw new Error('Мод не найден')
  await shell.trashItem(full)
  return listMods(gameVersion)
}

export async function addMods(gameVersion?: string): Promise<ModEntry[]> {
  const result = await dialog.showOpenDialog({
    title: 'Добавить моды',
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Minecraft моды', extensions: ['jar'] }]
  })
  if (result.canceled || result.filePaths.length === 0) return listMods(gameVersion)

  const dir = modsDir(gameVersion)
  for (const file of result.filePaths) {
    const original = basename(file)
    let targetName = original
    let counter = 1
    while (existsSync(join(dir, targetName))) {
      const extension = extname(original)
      targetName = `${original.slice(0, -extension.length)} (${counter})${extension}`
      counter += 1
    }
    copyFileSync(file, join(dir, targetName))
  }
  return listMods(gameVersion)
}

interface ModrinthSearchResponse {
  hits?: Array<{
    project_id: string
    slug: string
    title: string
    description: string
    author: string
    downloads: number
    icon_url?: string | null
    categories?: string[]
  }>
}

interface ModrinthFile {
  url: string
  filename: string
  primary?: boolean
  size?: number
  hashes?: { sha512?: string; sha1?: string }
}

interface ModrinthVersion {
  project_id?: string
  name: string
  files: ModrinthFile[]
  dependencies?: Array<{
    version_id?: string | null
    project_id?: string | null
    dependency_type: string
  }>
}

async function modrinthJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!response.ok) throw new Error(`Modrinth ответил с ошибкой HTTP ${response.status}`)
  return (await response.json()) as T
}

export async function searchModrinth(query: string, gameVersion: string): Promise<ModCatalogEntry[]> {
  const version = String(gameVersion ?? '').trim()
  if (!/^\d+(?:\.\d+){1,2}(?:[-\w.]+)?$/.test(version)) {
    throw new Error('Сначала выберите версию Minecraft')
  }
  const cleanQuery = String(query ?? '').trim().slice(0, 100)
  const facets = [
    ['project_type:mod'],
    ['categories:fabric'],
    [`versions:${version}`],
    ['environment:client_only', 'environment:client_and_server', 'environment:client_only_server_optional']
  ]
  const params = new URLSearchParams({
    query: cleanQuery,
    facets: JSON.stringify(facets),
    index: cleanQuery ? 'relevance' : 'downloads',
    limit: '24'
  })
  const payload = await modrinthJson<ModrinthSearchResponse>(`${MODRINTH_API}/search?${params}`)
  return (payload.hits ?? []).map((hit) => ({
    projectId: hit.project_id,
    slug: hit.slug,
    title: hit.title,
    description: hit.description,
    author: hit.author,
    downloads: hit.downloads,
    iconUrl: hit.icon_url ?? undefined,
    categories: hit.categories ?? []
  }))
}

function fabricProfileId(gameVersion: string, loaderVersion: string): string {
  return `fabric-loader-${loaderVersion}-${gameVersion}`
}

export async function getFabricInfo(gameVersion: string): Promise<FabricInfo> {
  const version = String(gameVersion ?? '').trim()
  if (!/^\d+(?:\.\d+){1,2}(?:[-\w.]+)?$/.test(version)) {
    throw new Error('Сначала выберите версию Minecraft')
  }
  const root = getSettings().gameDir
  const versionsDir = join(root, 'versions')
  let entries: string[] = []
  try {
    entries = readdirSync(versionsDir)
  } catch {
    /* Minecraft has not been installed yet. */
  }
  const prefix = `fabric-loader-`
  const suffix = `-${version}`
  const profileId = entries.find((entry) => entry.startsWith(prefix) && entry.endsWith(suffix))
  if (!profileId) return { installed: false, profileId: '', loaderVersion: null }
  const profileFile = join(versionsDir, profileId, `${profileId}.json`)
  if (!existsSync(profileFile)) return { installed: false, profileId: '', loaderVersion: null }
  const loaderVersion = profileId.slice(prefix.length, -suffix.length)
  return { installed: true, profileId, loaderVersion }
}

export async function installFabric(gameVersion: string): Promise<FabricInfo> {
  const version = String(gameVersion ?? '').trim()
  if (!/^\d+(?:\.\d+){1,2}(?:[-\w.]+)?$/.test(version)) {
    throw new Error('Сначала выберите версию Minecraft')
  }
  const alreadyInstalled = await getFabricInfo(version)
  if (alreadyInstalled.installed) return alreadyInstalled

  const legacy112 = version === '1.12.2'
  const metadataBase = legacy112 ? 'https://meta.legacyfabric.net' : 'https://meta.fabricmc.net'
  const loaderVersions = await modrinthJson<Array<{ loader: { version: string; stable: boolean } }>>(
    `${metadataBase}/v2/versions/loader/${encodeURIComponent(version)}`
  )
  const loader = loaderVersions.find((item) => item.loader?.stable) ?? loaderVersions[0]
  if (!loader?.loader?.version) throw new Error(`Fabric пока не поддерживает Minecraft ${version}`)

  const installers = await modrinthJson<Array<{ version: string; stable: boolean }>>(
    `${metadataBase}/v2/versions/installer`
  )
  const installer = installers.find((item) => item.stable) ?? installers[0]
  if (!installer?.version) throw new Error('Не удалось получить версию установщика Fabric')

  const installerUrl = legacy112
    ? `https://maven.legacyfabric.net/net/legacyfabric/fabric-installer/${encodeURIComponent(installer.version)}` +
      `/fabric-installer-${encodeURIComponent(installer.version)}.jar`
    : `https://maven.fabricmc.net/net/fabricmc/fabric-installer/${encodeURIComponent(installer.version)}` +
      `/fabric-installer-${encodeURIComponent(installer.version)}.jar`
  const response = await fetch(installerUrl, { headers: { 'User-Agent': USER_AGENT } })
  if (!response.ok) throw new Error(`Не удалось скачать Fabric Installer: HTTP ${response.status}`)
  const installerBytes = Buffer.from(await response.arrayBuffer())
  if (installerBytes.length > 50 * 1024 * 1024) throw new Error('Файл установщика Fabric слишком большой')

  const root = getSettings().gameDir
  mkdirSync(root, { recursive: true })
  const installerPath = join(root, `.sempai-fabric-installer-${installer.version}.jar`)
  const { writeFileSync, rmSync } = await import('node:fs')
  writeFileSync(installerPath, installerBytes)
  try {
    const javaPath = await prepareJava(version, () => undefined)
    await new Promise<void>((resolve, reject) => {
      const child = spawn(
        javaPath,
        ['-jar', installerPath, 'client', '-dir', root, '-mcversion', version, '-loader', loader.loader.version, '-noprofile'],
        { windowsHide: true }
      )
      let output = ''
      const timer = setTimeout(() => {
        child.kill()
        reject(new Error('Установка Fabric заняла слишком много времени'))
      }, 180_000)
      child.stdout?.on('data', (chunk: Buffer | string) => {
        output = (output + chunk.toString()).slice(-4000)
      })
      child.stderr?.on('data', (chunk: Buffer | string) => {
        output = (output + chunk.toString()).slice(-4000)
      })
      child.once('error', (error) => {
        clearTimeout(timer)
        reject(error)
      })
      child.once('close', (code) => {
        clearTimeout(timer)
        if (code === 0) resolve()
        else reject(new Error(output.trim() || `Fabric Installer завершился с кодом ${code}`))
      })
    })
  } finally {
    rmSync(installerPath, { force: true })
  }

  const installed = await getFabricInfo(version)
  if (!installed.installed) throw new Error('Fabric установщик завершился, но профиль игры не найден')
  return installed
}

async function getModrinthVersion(projectId: string, gameVersion: string): Promise<ModrinthVersion> {
  if (!/^[A-Za-z0-9]{8}$/.test(projectId)) throw new Error('Некорректный идентификатор мода')
  const params = new URLSearchParams({
    loaders: JSON.stringify(['fabric']),
    game_versions: JSON.stringify([gameVersion]),
    include_changelog: 'false'
  })
  const versions = await modrinthJson<ModrinthVersion[]>(`${MODRINTH_API}/project/${projectId}/version?${params}`)
  const version = versions.find((item) => item.files?.length)
  if (!version) throw new Error(`Нет версии мода для Minecraft ${gameVersion}`)
  return version
}

async function getModrinthVersionById(versionId: string): Promise<ModrinthVersion> {
  if (!/^[A-Za-z0-9]{8}$/.test(versionId)) throw new Error('Некорректная версия зависимости мода')
  return modrinthJson<ModrinthVersion>(`${MODRINTH_API}/version/${versionId}`)
}

async function saveModFile(file: ModrinthFile, gameVersion: string): Promise<boolean> {
  if (!file.filename || basename(file.filename) !== file.filename || !file.filename.toLowerCase().endsWith('.jar')) {
    throw new Error('Modrinth вернул некорректное имя файла')
  }
  const url = new URL(file.url)
  if (url.protocol !== 'https:' || url.hostname !== 'cdn.modrinth.com') {
    throw new Error('Ссылка на файл мода имеет неподдерживаемый адрес')
  }
  if (file.size && file.size > MODRINTH_MAX_FILE_BYTES) throw new Error('Файл мода превышает лимит 250 МБ')
  const dir = modsDir(gameVersion)
  const download = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  if (!download.ok) throw new Error(`Не удалось скачать мод: HTTP ${download.status}`)
  const bytes = Buffer.from(await download.arrayBuffer())
  if (bytes.length > MODRINTH_MAX_FILE_BYTES) throw new Error('Файл мода превышает лимит 250 МБ')
  if (file.hashes?.sha512) {
    const actual = createHash('sha512').update(bytes).digest('hex')
    if (actual.toLowerCase() !== file.hashes.sha512.toLowerCase()) throw new Error('Проверка целостности файла мода не прошла')
  }

  let targetName = file.filename
  let counter = 1
  while (existsSync(join(dir, targetName))) {
    const extension = extname(file.filename)
    targetName = `${file.filename.slice(0, -extension.length)} (${counter})${extension}`
    counter += 1
  }
  const tempPath = join(dir, `.download-${Date.now()}-${targetName}`)
  const { writeFileSync } = await import('node:fs')
  writeFileSync(tempPath, bytes, { flag: 'wx' })
  renameSync(tempPath, join(dir, targetName))
  return true
}

export async function installMod(projectId: string, gameVersion: string): Promise<ModEntry[]> {
  const fabric = await getFabricInfo(gameVersion)
  if (!fabric.installed) throw new Error('Сначала установите Fabric для выбранной версии')
  const visiting = new Set<string>()
  const installed = new Set<string>()

  const installVersion = async (key: string, version: ModrinthVersion): Promise<void> => {
    if (installed.has(key) || visiting.has(key)) return
    visiting.add(key)
    for (const dependency of version.dependencies ?? []) {
      if (dependency.dependency_type !== 'required') continue
      if (dependency.project_id) {
        await installProject(dependency.project_id)
      } else if (dependency.version_id) {
        const dependencyVersion = await getModrinthVersionById(dependency.version_id)
        await installVersion(dependency.version_id, dependencyVersion)
      }
    }
    const file = version.files.find((item) => item.primary) ?? version.files[0]
    if (!file) throw new Error(`У мода ${key} нет файла для скачивания`)
    await saveModFile(file, gameVersion)
    visiting.delete(key)
    installed.add(key)
  }

  const installProject = async (id: string): Promise<void> => {
    const version = await getModrinthVersion(id, gameVersion)
    await installVersion(id, version)
  }

  await installProject(projectId)
  return listMods(gameVersion)
}

export async function ensureFabricApi(gameVersion: string): Promise<void> {
  if (gameVersion === '1.12.2') return
  const files = listMods(gameVersion)
  const api = files.find((file) => file.fileName.toLowerCase().startsWith('fabric-api-'))
  if (api?.enabled) return
  if (api && !api.enabled) {
    toggleMod(api.fileName, gameVersion)
    return
  }
  await installMod('P7dR8mSH', gameVersion)
}

export function getModsDirectory(gameVersion?: string): string {
  return modsDir(gameVersion)
}

export async function openModsFolder(gameVersion?: string): Promise<void> {
  const dir = modsDir(gameVersion)
  await shell.openPath(dir)
}

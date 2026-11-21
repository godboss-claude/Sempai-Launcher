import { app } from 'electron'
import { createWriteStream, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { spawn } from 'node:child_process'
import AdmZip from 'adm-zip'
import type { JavaInfo } from '../shared/types'
import { getSettings, runtimeDir } from './store'
import { requiredJavaMajor } from './mojang'

type ProgressFn = (stage: string, detail: string, percent: number | null) => void

const pendingDownloads = new Map<number, Promise<string>>()

function javaExecutableName(): string {
  return process.platform === 'win32' ? 'java.exe' : 'java'
}

export function findJavaExe(dir: string): string | null {
  if (!existsSync(dir)) return null
  const direct = join(dir, 'bin', javaExecutableName())
  if (existsSync(direct)) return direct
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const found = findJavaExe(join(dir, entry.name))
      if (found) return found
    }
  } catch {
    return null
  }
  return null
}

function runtimeFor(major: number): string | null {
  return findJavaExe(join(runtimeDir(), `jre-${major}`))
}

export async function systemJava(): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      const child = spawn('java', ['-version'], { windowsHide: true })
      let settled = false
      const finish = (value: string | null): void => {
        if (settled) return
        settled = true
        resolve(value)
      }
      child.on('error', () => finish(null))
      child.on('close', (code) => finish(code === 0 ? 'java' : null))
      const timer = setTimeout(() => {
        child.kill()
        finish(null)
      }, 4000)
      timer.unref()
    } catch {
      resolve(null)
    }
  })
}

export async function getJavaInfo(versionId: string): Promise<JavaInfo> {
  const settings = getSettings()
  let requiredMajor: number | null = null
  try {
    requiredMajor = await requiredJavaMajor(versionId)
  } catch {
    requiredMajor = null
  }

  if (settings.javaPath && existsSync(settings.javaPath)) {
    return {
      available: true,
      path: settings.javaPath,
      source: 'manual',
      major: requiredMajor,
      requiredMajor,
      downloading: false
    }
  }

  if (requiredMajor) {
    const runtime = runtimeFor(requiredMajor)
    if (runtime) {
      return {
        available: true,
        path: runtime,
        source: 'runtime',
        major: requiredMajor,
        requiredMajor,
        downloading: false
      }
    }
  }

  return {
    available: false,
    path: '',
    source: 'none',
    major: null,
    requiredMajor,
    downloading: requiredMajor ? pendingDownloads.has(requiredMajor) : false
  }
}

interface AdoptiumAsset {
  link: string
  name: string
  size: number
}

async function getAdoptiumAsset(major: number): Promise<AdoptiumAsset> {
  const os = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'mac' : 'linux'
  const arch = process.arch === 'arm64' ? 'aarch64' : 'x64'
  const url =
    `https://api.adoptium.net/v3/assets/latest/${major}/hotspot` +
    `?os=${os}&architecture=${arch}&image_type=jre&vendor=eclipse`

  const response = await fetch(url, { headers: { 'User-Agent': 'SempaiLauncher/1.0' } })
  if (!response.ok) throw new Error(`Adoptium API: HTTP ${response.status}`)
  const assets = (await response.json()) as Array<{
    binary?: { package?: { link?: string; name?: string; size?: number } }
  }>
  const pkg = assets[0]?.binary?.package
  if (!pkg?.link) throw new Error('Не удалось найти сборку Java для этой платформы')
  return {
    link: pkg.link,
    name: pkg.name ?? `java-${major}.zip`,
    size: pkg.size ?? 0
  }
}

async function downloadFile(
  url: string,
  destination: string,
  expectedSize: number,
  onProgress: ProgressFn
): Promise<void> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'SempaiLauncher/1.0' },
    redirect: 'follow'
  })
  if (!response.ok || !response.body) {
    throw new Error(`Не удалось скачать Java: HTTP ${response.status}`)
  }
  const total = Number(response.headers.get('content-length')) || expectedSize
  const reader = response.body.getReader()
  const stream = createWriteStream(destination)
  let received = 0

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value) continue
      received += value.byteLength
      stream.write(Buffer.from(value))
      const percent = total > 0 ? Math.min(85, (received / total) * 85) : null
      onProgress(
        'Скачивание Java',
        `${(received / 1024 / 1024).toFixed(1)} МБ${
          total ? ` из ${(total / 1024 / 1024).toFixed(1)} МБ` : ''
        }`,
        percent
      )
    }
  } finally {
    await new Promise<void>((resolve) => stream.end(resolve))
  }
}

async function downloadRuntime(major: number, onProgress: ProgressFn): Promise<string> {
  if (process.platform !== 'win32') {
    const system = await systemJava()
    if (system) return system
    throw new Error(
      'Автоматическая установка Java поддерживается только на Windows. Укажите путь к Java в настройках.'
    )
  }

  onProgress('Подготовка Java', `Поиск сборки Java ${major}…`, 0)
  const asset = await getAdoptiumAsset(major)
  const zipPath = join(app.getPath('temp'), `sempai-${asset.name}`)
  const targetDir = join(runtimeDir(), `jre-${major}`)

  onProgress('Скачивание Java', `Java ${major} • ${(asset.size / 1024 / 1024).toFixed(0)} МБ`, 0)
  await downloadFile(asset.link, zipPath, asset.size, (stage, detail, percent) => {
    onProgress(`Скачивание Java ${major}`, detail, percent)
  })

  onProgress('Распаковка Java', `Java ${major}`, 90)
  try {
    rmSync(targetDir, { recursive: true, force: true })
    mkdirSync(targetDir, { recursive: true })
    const zip = new AdmZip(zipPath)
    zip.extractAllTo(targetDir, true)
  } finally {
    try {
      rmSync(zipPath, { force: true })
    } catch {
      /* ignore */
    }
  }

  const java = findJavaExe(targetDir)
  if (!java) throw new Error('Не удалось распаковать Java')
  onProgress('Java готова', `Java ${major}`, 100)
  return java
}

export async function prepareJava(versionId: string, onProgress: ProgressFn): Promise<string> {
  const settings = getSettings()
  if (settings.javaPath && existsSync(settings.javaPath)) {
    return settings.javaPath
  }

  const major = await requiredJavaMajor(versionId)
  const existing = runtimeFor(major)
  if (existing) return existing

  const pending = pendingDownloads.get(major)
  if (pending) {
    onProgress('Ожидание Java', `Java ${major} уже скачивается…`, null)
    return pending
  }

  const promise = downloadRuntime(major, onProgress).finally(() => {
    pendingDownloads.delete(major)
  })
  pendingDownloads.set(major, promise)
  return promise
}

export function javaRuntimeSize(major: number): number {
  const dir = join(runtimeDir(), `jre-${major}`)
  if (!existsSync(dir)) return 0
  let total = 0
  const walk = (path: string): void => {
    try {
      for (const entry of readdirSync(path, { withFileTypes: true })) {
        const full = join(path, entry.name)
        if (entry.isDirectory()) walk(full)
        else total += statSync(full).size
      }
    } catch {
      /* ignore */
    }
  }
  walk(dir)
  return total
}

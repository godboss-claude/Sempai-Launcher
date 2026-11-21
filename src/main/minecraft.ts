import { app, BrowserWindow } from 'electron'
import { Client } from 'minecraft-launcher-core'
import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import type { LaunchProgress, LaunchState } from '../shared/types'
import { addPlaytime, ensureGameDir, getSettings } from './store'
import { getVersionMeta } from './mojang'
import { prepareJava } from './java'
import { ensureFabricApi, getFabricInfo, getModsDirectory, installFabric } from './mods'

const state: LaunchState & { startedAt: number | null } = {
  running: false,
  version: null,
  startedAt: null
}

let activeClient: Client | null = null
let activeChild: ChildProcessWithoutNullStreams | null = null
let lastPercent = 0
let finished = false

function stageSempaiVisuals(gameDir: string, versionId: string, modsDir: string): boolean {
  const variantsDir = join(gameDir, 'sempai-visuals-versions')
  const bundledVariantsDir = app.isPackaged
    ? join(process.resourcesPath, 'visual-mods')
    : join(app.getAppPath(), 'release', 'mods')
  mkdirSync(variantsDir, { recursive: true })

  if (existsSync(bundledVariantsDir)) {
    for (const file of readdirSync(bundledVariantsDir)) {
      if (/^sempai-visuals-.*\.jar$/i.test(file)) {
        copyFileSync(join(bundledVariantsDir, file), join(variantsDir, file))
      }
    }
  }

  const wanted = `sempai-visuals-${versionId}-0.1.1.jar`
  const source = join(variantsDir, wanted)
  if (!existsSync(source)) {
    sendLog(`[sempai] Для Minecraft ${versionId} сборки визуального мода пока нет`)
    return false
  }
  const target = join(modsDir, wanted)
  for (const file of readdirSync(modsDir)) {
    if (!file.startsWith(`sempai-visuals-${versionId}-`) || !file.endsWith('.jar') || file === wanted) continue
    const stalePath = join(modsDir, file)
    const disabledPath = existsSync(`${stalePath}.disabled`)
      ? `${stalePath}.${Date.now()}.disabled`
      : `${stalePath}.disabled`
    renameSync(stalePath, disabledPath)
  }
  copyFileSync(source, target)
  sendLog(`[sempai] Включён визуальный мод для Minecraft ${versionId}`)
  return true
}

function hasBundledVisuals(gameDir: string, versionId: string): boolean {
  const filename = `sempai-visuals-${versionId}-0.1.1.jar`
  const variantsDir = join(gameDir, 'sempai-visuals-versions')
  const bundledDir = app.isPackaged
    ? join(process.resourcesPath, 'visual-mods')
    : join(app.getAppPath(), 'release', 'mods')
  return existsSync(join(variantsDir, filename)) || existsSync(join(bundledDir, filename))
}

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send(channel, payload)
  }
}

function sendProgress(stage: string, detail: string, percent: number | null): void {
  if (percent !== null) {
    lastPercent = Math.max(lastPercent, Math.min(100, Math.round(percent)))
  }
  const progress: LaunchProgress = { stage, detail, percent: lastPercent }
  broadcast('launch:progress', progress)
}

function sendLog(line: string): void {
  if (!line) return
  broadcast('launch:log', line)
}

function phaseRange(type: string): { start: number; end: number; label: string } {
  switch (type) {
    case 'asset-json':
      return { start: 15, end: 17, label: 'Получение манифеста ресурсов' }
    case 'assets':
      return { start: 17, end: 58, label: 'Загрузка ресурсов' }
    case 'assets-copy':
      return { start: 58, end: 60, label: 'Копирование ресурсов' }
    case 'classes':
      return { start: 60, end: 88, label: 'Загрузка библиотек' }
    case 'natives':
      return { start: 88, end: 95, label: 'Подготовка нативных файлов' }
    case 'forge':
    case 'log4j':
      return { start: 95, end: 97, label: 'Подготовка модификаций' }
    default:
      return { start: 95, end: 98, label: 'Загрузка файлов' }
  }
}

function parseJvmArgs(input: string): string[] {
  const args: string[] = []
  const regex = /"([^"]*)"|'([^']*)'|(\S+)/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(input)) !== null) {
    const value = match[1] ?? match[2] ?? match[3]
    if (value) args.push(value)
  }
  return args
}

function finishWithError(message: string): void {
  if (finished) return
  finished = true
  state.running = false
  state.version = null
  state.startedAt = null
  activeClient = null
  activeChild = null
  broadcast('launch:error', message)
  broadcast('launch:close', {
    code: 1,
    sessionSeconds: 0,
    playtimeSeconds: getSettings().playtimeSeconds
  })
}

export async function startLaunch(
  versionId: string,
  server?: { host: string; port: number }
): Promise<{ ok: boolean; error?: string }> {
  if (state.running) {
    return { ok: false, error: 'Minecraft уже запускается или запущен' }
  }
  const settings = getSettings()
  if (!settings.account) {
    return { ok: false, error: 'Сначала войдите в аккаунт' }
  }
  const account = settings.account
  if (!versionId) {
    return { ok: false, error: 'Выберите версию Minecraft' }
  }

  state.running = true
  state.version = versionId
  state.startedAt = null
  finished = false
  lastPercent = 0
  sendProgress('Подготовка к запуску', `Версия ${versionId}`, 0)
  sendLog(`[launcher] Запуск Minecraft ${versionId}`)

  void (async () => {
    try {
      ensureGameDir(settings.gameDir)
      const javaPath = await prepareJava(versionId, (stage, detail, percent) => {
        sendProgress(stage, detail, percent === null ? null : (percent / 100) * 15)
      })
      sendLog(`[launcher] Java: ${javaPath}`)
      sendProgress('Подготовка файлов игры', 'Проверка библиотек и ресурсов', 15)

      const meta = await getVersionMeta(versionId)
      const versionType = meta?.type === 'snapshot' ? 'snapshot' : 'release'
      let fabric = await getFabricInfo(versionId)
      if (!fabric.installed && hasBundledVisuals(settings.gameDir, versionId)) {
        sendProgress('Установка Fabric', 'Подготовка загрузчика для визуального мода', null)
        fabric = await installFabric(versionId)
      }
      const versionModsDir = getModsDirectory(versionId)
      const hasSempaiVisuals = fabric.installed && stageSempaiVisuals(settings.gameDir, versionId, versionModsDir)
      if (hasSempaiVisuals) await ensureFabricApi(versionId)

      const client = new Client()
      activeClient = client

      client.on('progress', (event: { type?: string; task?: number; total?: number }) => {
        const range = phaseRange(event.type ?? '')
        const task = Number(event.task ?? 0)
        const total = Number(event.total ?? 0)
        const ratio = total > 0 ? Math.min(1, task / total) : 0
        const percent = range.start + ratio * (range.end - range.start)
        sendProgress(range.label, total > 0 ? `${task} / ${total}` : 'Подготовка…', percent)
      })

      client.on('download', (name: string) => {
        if (name) sendLog(`[download] ${name}`)
      })

      client.on('debug', (line: string) => {
        if (line) sendLog(`[core] ${line}`)
      })

      client.on('data', (line: string) => {
        sendLog(line.replace(/\r/g, ''))
      })

      client.on('close', (code: number) => {
        if (!state.startedAt) {
          finishWithError(
            'Не удалось запустить игру. Проверьте путь к Java и подключение к интернету.'
          )
          return
        }
        const sessionSeconds = Math.max(
          0,
          Math.floor((Date.now() - state.startedAt) / 1000)
        )
        const updated = addPlaytime(sessionSeconds)
        state.running = false
        state.version = null
        state.startedAt = null
        activeClient = null
        activeChild = null
        finished = true
        sendLog(`[launcher] Игра завершена (код ${code ?? 0})`)
        broadcast('launch:close', {
          code,
          sessionSeconds,
          playtimeSeconds: updated.playtimeSeconds
        })
      })

      const authorization = {
        access_token: account.accessToken,
        client_token: account.accessToken,
        uuid: account.uuid,
        name: account.name,
        user_properties: '{}' as unknown as Record<string, unknown>,
        meta: {
          type: 'mojang' as const,
          demo: false
        }
      }

      const customLaunchArgs: string[] = []
      if (server) {
        customLaunchArgs.push('--server', server.host, '--port', String(server.port))
      }

      const child = await client.launch({
        authorization,
        root: settings.gameDir,
        version: {
          number: versionId,
          type: versionType,
          ...(fabric.installed ? { custom: fabric.profileId } : {})
        },
        memory: {
          max: settings.memoryMax,
          min: settings.memoryMin
        },
        javaPath,
        window: {
          width: settings.width,
          height: settings.height,
          fullscreen: settings.fullscreen
        },
        customArgs: [
          ...parseJvmArgs(settings.jvmArgs),
          ...(fabric.installed ? [`-Dfabric.modsFolder=${versionModsDir}`] : [])
        ],
        customLaunchArgs,
        timeout: 30000,
        overrides: {
          maxSockets: 8
        }
      })

      if (!child) {
        finishWithError(
          'Minecraft не запустился. Убедитесь, что Java установлена корректно, и попробуйте снова.'
        )
        return
      }

      activeChild = child
      state.startedAt = Date.now()
      lastPercent = 100
      sendProgress('Игра запущена', 'Приятной игры!', 100)
      sendLog('[launcher] Minecraft успешно запущен')

      if (settings.minimizeOnLaunch) {
        for (const win of BrowserWindow.getAllWindows()) {
          if (!win.isDestroyed()) win.minimize()
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Неизвестная ошибка при запуске Minecraft'
      sendLog(`[launcher] Ошибка: ${message}`)
      finishWithError(message)
    }
  })()

  return { ok: true }
}

export function getLaunchState(): LaunchState {
  return {
    running: state.running,
    version: state.version,
    startedAt: state.startedAt
  }
}

export function finalizePlaytime(): void {
  if (state.startedAt) {
    const seconds = Math.max(0, Math.floor((Date.now() - state.startedAt) / 1000))
    if (seconds > 0) addPlaytime(seconds)
    state.startedAt = null
  }
  if (activeChild && !activeChild.killed) {
    // Игру не закрываем при выходе из лаунчера — так удобнее игрокам.
  }
  activeClient = null
  activeChild = null
  state.running = false
  state.version = null
}

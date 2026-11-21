import { useEffect, useState } from 'react'
import type { JSX, ReactNode } from 'react'
import type { AppUpdateStatus, ThemeId } from '@shared/types'
import type { AppContextValue } from '../context'
import { Icon } from '../components/Icon'
import { Toggle } from '../components/Toggle'
import { ConfirmDialog } from '../components/Modal'
import { errorText } from '../utils'

function SettingRow({
  title,
  description,
  children
}: {
  title: string
  description?: string
  children: ReactNode
}): JSX.Element {
  return (
    <div className="setting-row">
      <div className="setting-text">
        <strong>{title}</strong>
        {description && <span>{description}</span>}
      </div>
      <div className="setting-control">{children}</div>
    </div>
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

const THEMES: Array<{ id: ThemeId; name: string; description: string }> = [
  {
    id: 'emerald',
    name: 'Изумруд и синий',
    description: 'Свежая зелёно-синяя палитра'
  },
  {
    id: 'pink',
    name: 'Розовый закат',
    description: 'Неоновая розово-фиолетовая палитра'
  }
]

export function SettingsPage({ ctx }: { ctx: AppContextValue }): JSX.Element {
  const { settings, snapshot, javaInfo, updateSettings, refreshSnapshot, toast } = ctx
  const totalMemory = snapshot.system.totalMemoryMb
  const maxAllowed = Math.max(2048, Math.floor((totalMemory - 2048) / 1024) * 1024)
  const [memory, setMemory] = useState(settings.memoryMax)
  const [resolution, setResolution] = useState({
    width: String(settings.width),
    height: String(settings.height)
  })
  const [jvmArgs, setJvmArgs] = useState(settings.jvmArgs)
  const [showReset, setShowReset] = useState(false)
  const [updateStatus, setUpdateStatus] = useState<AppUpdateStatus>({ state: 'idle' })

  useEffect(() => {
    let active = true
    const unsubscribe = window.api.updates.onStatus((status) => {
      if (active) setUpdateStatus(status)
    })
    window.api.updates.state().then((status) => {
      if (active) setUpdateStatus(status)
    }).catch(() => undefined)
    return () => { active = false; unsubscribe() }
  }, [])

  useEffect(() => {
    setMemory(settings.memoryMax)
  }, [settings.memoryMax])

  useEffect(() => {
    setResolution({ width: String(settings.width), height: String(settings.height) })
  }, [settings.width, settings.height])

  useEffect(() => {
    setJvmArgs(settings.jvmArgs)
  }, [settings.jvmArgs])

  const commitMemory = (): void => {
    const next = clamp(memory, 1024, maxAllowed)
    if (next !== settings.memoryMax) {
      void updateSettings({
        memoryMax: next,
        memoryMin: Math.min(settings.memoryMin, next)
      })
    }
    setMemory(next)
  }

  const commitResolution = (): void => {
    const width = clamp(Number(resolution.width) || settings.width, 640, 7680)
    const height = clamp(Number(resolution.height) || settings.height, 480, 4320)
    setResolution({ width: String(width), height: String(height) })
    if (width !== settings.width || height !== settings.height) {
      void updateSettings({ width, height })
    }
  }

  const commitJvmArgs = (): void => {
    if (jvmArgs !== settings.jvmArgs) void updateSettings({ jvmArgs })
  }

  const chooseJava = async (): Promise<void> => {
    try {
      const path = await window.api.settings.chooseJava()
      if (path) {
        await refreshSnapshot()
        toast('success', 'Java выбрана', path)
      }
    } catch (error) {
      toast('error', 'Не удалось выбрать Java', errorText(error))
    }
  }

  const chooseGameDir = async (): Promise<void> => {
    try {
      const path = await window.api.settings.chooseGameDir()
      if (path) {
        await refreshSnapshot()
        toast('success', 'Папка игры изменена', path)
      }
    } catch (error) {
      toast('error', 'Не удалось изменить папку', errorText(error))
    }
  }

  const resetSettings = async (): Promise<void> => {
    setShowReset(false)
    try {
      await window.api.settings.reset()
      await refreshSnapshot()
      toast('success', 'Настройки сброшены', 'Аккаунт сохранён')
    } catch (error) {
      toast('error', 'Не удалось сбросить настройки', errorText(error))
    }
  }

  const checkUpdates = async (): Promise<void> => {
    try {
      setUpdateStatus(await window.api.updates.check())
    } catch (error) {
      toast('error', 'Не удалось проверить обновления', errorText(error))
    }
  }

  const downloadUpdate = async (): Promise<void> => {
    try {
      await window.api.updates.download()
    } catch (error) {
      toast('error', 'Не удалось скачать обновление', errorText(error))
    }
  }

  const javaStatus = javaInfo?.available
    ? javaInfo.source === 'manual'
      ? 'Своя Java'
      : 'Авто (скачана)'
    : javaInfo?.requiredMajor
      ? `Java ${javaInfo.requiredMajor} скачается при запуске`
      : 'Проверка…'

  return (
    <div className="page settings-page">
      <div className="page-head">
        <div>
          <span className="eyebrow">
            <Icon name="settings" size={14} />
            Конфигурация
          </span>
          <h1>Настройки</h1>
          <p>Параметры игры, Java, памяти и оформления лаунчера.</p>
        </div>
        <span className="chip">
          <Icon name="palette" size={15} />
          Тема: {settings.theme === 'pink' ? 'Розовая' : 'Изумрудная'}
        </span>
      </div>

      <div className="settings-grid">
        <section className="card settings-card">
          <div className="settings-card-head">
            <span className="side-icon">
              <Icon name="palette" size={18} />
            </span>
            <div>
              <h3>Внешний вид</h3>
              <span>Цветовая гамма и анимации</span>
            </div>
          </div>

          <div className="theme-options">
            {THEMES.map((theme) => (
              <button
                type="button"
                key={theme.id}
                className={`theme-option ${settings.theme === theme.id ? 'is-active' : ''}`}
                onClick={() => void updateSettings({ theme: theme.id })}
              >
                <span className={`theme-swatch theme-swatch-${theme.id}`}>
                  <i />
                  <i />
                  <i />
                </span>
                <span className="theme-option-info">
                  <strong>{theme.name}</strong>
                  <span>{theme.description}</span>
                </span>
                <span className="theme-option-check">
                  {settings.theme === theme.id && <Icon name="check" size={14} />}
                </span>
              </button>
            ))}
          </div>

          <SettingRow
            title="Уменьшить движение"
            description="Отключает плавающие элементы и лишние анимации"
          >
            <Toggle
              checked={settings.reduceMotion}
              onChange={(value) => void updateSettings({ reduceMotion: value })}
              label="Уменьшить движение"
            />
          </SettingRow>
        </section>

        <section className="card settings-card">
          <div className="settings-card-head">
            <span className="side-icon">
              <Icon name="chip" size={18} />
            </span>
            <div>
              <h3>Память и окно</h3>
              <span>Параметры запуска Minecraft</span>
            </div>
          </div>

          <div className="slider-block">
            <div className="slider-head">
              <div>
                <strong>Выделенная память</strong>
                <span>
                  {Math.round(memory / 1024)} ГБ из {Math.round(totalMemory / 1024)} ГБ
                </span>
              </div>
              <span className="value-badge">{Math.round(memory / 1024)} ГБ</span>
            </div>
            <input
              type="range"
              min={1024}
              max={maxAllowed}
              step={512}
              value={memory}
              onChange={(event) => setMemory(Number(event.target.value))}
              onPointerUp={commitMemory}
              onKeyUp={commitMemory}
              onBlur={commitMemory}
            />
            <div className="slider-scale">
              <span>1 ГБ</span>
              <span>{Math.round(maxAllowed / 1024)} ГБ</span>
            </div>
          </div>

          <SettingRow title="Разрешение игры" description="Ширина и высота окна Minecraft">
            <div className="resolution-inputs">
              <input
                className="text-input text-input-small"
                value={resolution.width}
                onChange={(event) =>
                  setResolution({ ...resolution, width: event.target.value })
                }
                onBlur={commitResolution}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitResolution()
                }}
                inputMode="numeric"
              />
              <span>×</span>
              <input
                className="text-input text-input-small"
                value={resolution.height}
                onChange={(event) =>
                  setResolution({ ...resolution, height: event.target.value })
                }
                onBlur={commitResolution}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitResolution()
                }}
                inputMode="numeric"
              />
            </div>
          </SettingRow>

          <SettingRow title="Полноэкранный режим" description="Запускать игру на весь экран">
            <Toggle
              checked={settings.fullscreen}
              onChange={(value) => void updateSettings({ fullscreen: value })}
              label="Полноэкранный режим"
            />
          </SettingRow>
        </section>

        <section className="card settings-card">
          <div className="settings-card-head">
            <span className="side-icon">
              <Icon name="coffee" size={18} />
            </span>
            <div>
              <h3>Java</h3>
              <span>Среда выполнения Minecraft</span>
            </div>
          </div>

          <div className="java-status">
            <span className={`java-status-dot ${javaInfo?.available ? 'is-ok' : ''}`} />
            <div>
              <strong>{javaStatus}</strong>
              <span>
                {javaInfo?.available
                  ? javaInfo.path
                  : 'Лаунчер автоматически скачает нужную версию Java с Adoptium'}
              </span>
            </div>
          </div>

          <div className="java-actions">
            <button type="button" className="btn btn-ghost" onClick={() => void chooseJava()}>
              <Icon name="folder" size={16} />
              Выбрать Java
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => void updateSettings({ javaPath: '' })}
              disabled={!settings.javaPath}
            >
              <Icon name="refresh" size={16} />
              Авто
            </button>
          </div>

          <p className="muted-note">
            <Icon name="info" size={14} />
            Для версий 1.8–1.16 нужна Java 8, для 1.17–1.21 — Java 17/21, для 26.x — Java 25.
            Лаунчер подберёт её сам.
          </p>
        </section>

        <section className="card settings-card">
          <div className="settings-card-head">
            <span className="side-icon">
              <Icon name="folder" size={18} />
            </span>
            <div>
              <h3>Папка игры</h3>
              <span>Мир, моды, ресурспаки и логи</span>
            </div>
          </div>

          <div className="path-box" title={settings.gameDir}>
            {settings.gameDir}
          </div>
          <div className="java-actions">
            <button type="button" className="btn btn-ghost" onClick={() => void chooseGameDir()}>
              <Icon name="folder" size={16} />
              Изменить
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => void window.api.app.openPath(settings.gameDir)}
            >
              <Icon name="external" size={16} />
              Открыть
            </button>
          </div>

          <SettingRow
            title="Сворачивать при запуске"
            description="Скрывать лаунчер, когда игра запустилась"
          >
            <Toggle
              checked={settings.minimizeOnLaunch}
              onChange={(value) => void updateSettings({ minimizeOnLaunch: value })}
              label="Сворачивать при запуске"
            />
          </SettingRow>

          <SettingRow title="Показывать снапшоты" description="Нестабильные тестовые версии в списке">
            <Toggle
              checked={settings.showSnapshots}
              onChange={(value) => void updateSettings({ showSnapshots: value })}
              label="Показывать снапшоты"
            />
          </SettingRow>
        </section>

        <section className="card settings-card">
          <div className="settings-card-head">
            <span className="side-icon">
              <Icon name="terminal" size={18} />
            </span>
            <div>
              <h3>Дополнительные аргументы JVM</h3>
              <span>Для опытных пользователей</span>
            </div>
          </div>
          <input
            className="text-input"
            value={jvmArgs}
            onChange={(event) => setJvmArgs(event.target.value)}
            onBlur={commitJvmArgs}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitJvmArgs()
            }}
            placeholder="-XX:+UseG1GC -XX:+ParallelRefProcEnabled"
            spellCheck={false}
          />
          <p className="muted-note">
            <Icon name="warning" size={14} />
            Неверные аргументы могут помешать запуску игры. Оставьте поле пустым, если не уверены.
          </p>
        </section>

        <section className="card settings-card">
          <div className="settings-card-head">
            <span className="side-icon">
              <Icon name="refresh" size={18} />
            </span>
            <div>
              <h3>Обновления лаунчера</h3>
              <span>Sempai Launcher</span>
            </div>
          </div>

          <div className={`update-status update-status-${updateStatus.state}`}>
            {updateStatus.state === 'checking' && 'Проверяем новую версию…'}
            {updateStatus.state === 'available' && `Доступна версия ${updateStatus.version}`}
            {updateStatus.state === 'not-available' && `Установлена последняя версия${updateStatus.version ? ` (${updateStatus.version})` : ''}`}
            {updateStatus.state === 'downloading' && `Скачиваем обновление · ${updateStatus.percent ?? 0}%`}
            {updateStatus.state === 'downloaded' && `Версия ${updateStatus.version ?? ''} скачана и готова к установке`}
            {updateStatus.state === 'unsupported' && (updateStatus.message ?? 'Обновление доступно в установленной версии лаунчера.')}
            {updateStatus.state === 'error' && (updateStatus.message ?? 'Не удалось проверить обновления.')}
            {updateStatus.state === 'idle' && 'Проверяйте обновления и устанавливайте их, не скачивая установщик вручную.'}
          </div>
          {updateStatus.state === 'downloading' && (
            <div className="update-progress"><span style={{ width: `${updateStatus.percent ?? 0}%` }} /></div>
          )}
          <div className="about-actions">
            <button type="button" className="btn btn-ghost" onClick={() => void checkUpdates()} disabled={updateStatus.state === 'checking' || updateStatus.state === 'downloading'}>
              <Icon name="refresh" size={16} /> Проверить обновления
            </button>
            {updateStatus.state === 'available' && (
              <button type="button" className="btn btn-primary" onClick={() => void downloadUpdate()}>
                <Icon name="download" size={16} /> Скачать {updateStatus.version}
              </button>
            )}
            {updateStatus.state === 'downloaded' && (
              <button type="button" className="btn btn-primary" onClick={() => window.api.updates.install()}>
                <Icon name="refresh" size={16} /> Перезапустить и обновить
              </button>
            )}
          </div>
        </section>

        <section className="card settings-card">
          <div className="settings-card-head">
            <span className="side-icon">
              <Icon name="info" size={18} />
            </span>
            <div>
              <h3>О лаунчере</h3>
              <span>Sempai Launcher</span>
            </div>
          </div>

          <div className="about-rows">
            <div>
              <span>Версия</span>
              <strong>v{snapshot.system.appVersion}</strong>
            </div>
            <div>
              <span>Платформа</span>
              <strong>
                {snapshot.system.platform === 'win32' ? 'Windows' : snapshot.system.platform} •{' '}
                {snapshot.system.arch}
              </strong>
            </div>
            <div>
              <span>ОЗУ</span>
              <strong>{Math.round(totalMemory / 1024)} ГБ</strong>
            </div>
            <div>
              <span>Ядра CPU</span>
              <strong>{snapshot.system.cpuCount}</strong>
            </div>
          </div>

          <div className="about-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => void window.api.app.openDataDir()}
            >
              <Icon name="folder" size={16} />
              Данные лаунчера
            </button>
            <button type="button" className="btn btn-danger" onClick={() => setShowReset(true)}>
              <Icon name="refresh" size={16} />
              Сбросить настройки
            </button>
          </div>

          <p className="muted-note">
            Не является официальным продуктом Mojang Studios или Microsoft. Minecraft — торговая
            марка Mojang Studios.
          </p>
        </section>
      </div>

      <ConfirmDialog
        open={showReset}
        title="Сбросить настройки?"
        message="Все параметры лаунчера вернутся к значениям по умолчанию. Аккаунт и список друзей сохранятся."
        confirmLabel="Сбросить"
        danger
        onConfirm={() => void resetSettings()}
        onCancel={() => setShowReset(false)}
      />
    </div>
  )
}

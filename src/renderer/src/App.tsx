import { useCallback, useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import type {
  Account,
  AppUpdateStatus,
  JavaInfo,
  LaunchProgress,
  NewsEntry,
  PageId,
  ServerEntry,
  Settings,
  StoreSnapshot,
  VersionManifestInfo
} from '@shared/types'
import type { AppContextValue } from './context'
import { Titlebar } from './components/Titlebar'
import { Sidebar } from './components/Sidebar'
import { Toasts } from './components/Toasts'
import type { ToastItem, ToastKind } from './components/Toasts'
import { AuthScreen } from './components/AuthScreen'
import { LogoMark } from './components/Logo'
import { PlayPage } from './pages/PlayPage'
import { SkinsPage } from './pages/SkinsPage'
import { ModsPage } from './pages/ModsPage'
import { ServersPage } from './pages/ServersPage'
import { FriendsPage } from './pages/FriendsPage'
import { SettingsPage } from './pages/SettingsPage'

function errorText(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return message
    .replace(/^Error invoking remote method '[^']+':\s*/i, '')
    .replace(/^Error:\s*/i, '')
    .trim()
}

function formatSession(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  if (minutes < 1) return `${seconds} сек`
  if (minutes < 60) return `${minutes} мин`
  const hours = Math.floor(minutes / 60)
  return `${hours} ч ${minutes % 60} мин`
}

export default function App(): JSX.Element {
  const [snapshot, setSnapshot] = useState<StoreSnapshot | null>(null)
  const [bootError, setBootError] = useState('')
  const [page, setPage] = useState<PageId>('play')
  const [versions, setVersions] = useState<VersionManifestInfo | null>(null)
  const [news, setNews] = useState<NewsEntry[]>([])
  const [selectedVersion, setSelectedVersion] = useState('')
  const [javaInfo, setJavaInfo] = useState<JavaInfo | null>(null)
  const [progress, setProgress] = useState<LaunchProgress | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [launching, setLaunching] = useState(false)
  const [running, setRunning] = useState(false)
  const [maximized, setMaximized] = useState(false)
  const [appUpdate, setAppUpdate] = useState<AppUpdateStatus>({ state: 'idle' })
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const toastCounter = useRef(0)

  const toast = useCallback((kind: ToastKind, title: string, message?: string) => {
    const id = toastCounter.current + 1
    toastCounter.current = id
    setToasts((current) => [...current, { id, kind, title, message }].slice(-4))
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id))
    }, 4800)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  const refreshSnapshot = useCallback(async () => {
    try {
      const next = await window.api.settings.get()
      setSnapshot(next)
    } catch (error) {
      console.error(error)
    }
  }, [])

  useEffect(() => {
    let mounted = true
    window.api.settings
      .get()
      .then((data) => {
        if (mounted) setSnapshot(data)
      })
      .catch((error) => {
        if (mounted) setBootError(errorText(error))
      })
    window.api.versions
      .list()
      .then((data) => {
        if (mounted) setVersions(data)
      })
      .catch((error) => console.error('versions', error))
    window.api.news
      .list()
      .then((data) => {
        if (mounted) setNews(data)
      })
      .catch((error) => console.error('news', error))
    window.api.launch
      .state()
      .then((state) => {
        if (!mounted || !state.running) return
        if (state.startedAt) {
          setRunning(true)
        } else {
          setLaunching(true)
          setProgress({ stage: 'Запуск…', detail: 'Подготовка файлов игры', percent: null })
        }
      })
      .catch((error) => console.error('launch state', error))
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const offSettings = window.api.settings.onChanged((settings) => {
      setSnapshot((current) => (current ? { ...current, settings } : current))
    })

    const offProgress = window.api.launch.onProgress((next) => {
      setProgress(next)
      if (next.stage === 'Игра запущена') {
        setRunning(true)
        setLaunching(false)
      }
    })

    const offLog = window.api.launch.onLog((line) => {
      const parts = line.split(/\r?\n/).filter((part) => part.length > 0)
      if (parts.length === 0) return
      setLogs((current) => [...current, ...parts].slice(-800))
    })

    const offClose = window.api.launch.onClose((info) => {
      setLaunching(false)
      setRunning(false)
      setProgress(null)
      if (info.sessionSeconds > 0) {
        toast('info', 'Игра закрыта', `Сессия: ${formatSession(info.sessionSeconds)}`)
      }
      void refreshSnapshot()
    })

    const offError = window.api.launch.onError((message) => {
      setLaunching(false)
      setRunning(false)
      setProgress(null)
      toast('error', 'Не удалось запустить игру', message)
    })

    const offMaximize = window.api.window.onMaximizeChange((value) => setMaximized(value))
    window.api.window.isMaximized().then(setMaximized).catch(() => undefined)
    const offUpdate = window.api.updates.onStatus(setAppUpdate)
    window.api.updates.state().then(setAppUpdate).catch(() => undefined)

    return () => {
      offSettings()
      offProgress()
      offLog()
      offClose()
      offError()
      offMaximize()
      offUpdate()
    }
  }, [refreshSnapshot, toast])

  const handleTitlebarUpdate = useCallback(() => {
    if (appUpdate.state === 'available') void window.api.updates.download()
    else if (appUpdate.state === 'downloaded') window.api.updates.install()
    else setPage('settings')
  }, [appUpdate.state])

  useEffect(() => {
    const theme = snapshot?.settings.theme ?? 'emerald'
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.reduceMotion = snapshot?.settings.reduceMotion ? 'true' : 'false'
  }, [snapshot?.settings.theme, snapshot?.settings.reduceMotion])

  useEffect(() => {
    if (!versions) return
    if (selectedVersion && versions.versions.some((version) => version.id === selectedVersion)) {
      return
    }
    const saved = snapshot?.settings.lastVersion
    const fallback =
      saved && versions.versions.some((version) => version.id === saved)
        ? saved
        : versions.latest.release
    setSelectedVersion(fallback)
  }, [versions, selectedVersion, snapshot?.settings.lastVersion])

  useEffect(() => {
    if (!selectedVersion) return
    let active = true
    window.api.java
      .info(selectedVersion)
      .then((info) => {
        if (active) setJavaInfo(info)
      })
      .catch(() => {
        if (active) setJavaInfo(null)
      })
    return () => {
      active = false
    }
  }, [selectedVersion, snapshot?.settings.javaPath, launching, running])

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      try {
        const settings = await window.api.settings.patch(patch)
        setSnapshot((current) => (current ? { ...current, settings } : current))
      } catch (error) {
        toast('error', 'Не удалось сохранить настройки', errorText(error))
      }
    },
    [toast]
  )

  const launch = useCallback(
    async (server?: { host: string; port: number }) => {
      if (!selectedVersion) {
        toast('error', 'Версия не выбрана', 'Выберите версию Minecraft на главной странице')
        return
      }
      if (launching || running) return
      setPage('play')
      setLogs([])
      setProgress({ stage: 'Подготовка к запуску', detail: `Версия ${selectedVersion}`, percent: 0 })
      setLaunching(true)
      try {
        const result = await window.api.launch.start(selectedVersion, server)
        if (!result.ok) {
          setLaunching(false)
          setProgress(null)
          toast('error', 'Запуск отменён', result.error)
          return
        }
        void updateSettings({ lastVersion: selectedVersion })
      } catch (error) {
        setLaunching(false)
        setProgress(null)
        toast('error', 'Ошибка запуска', errorText(error))
      }
    },
    [launching, running, selectedVersion, toast, updateSettings]
  )

  const quickJoin = useCallback(
    async (server: ServerEntry) => {
      await launch({ host: server.host, port: server.port })
    },
    [launch]
  )

  const login = useCallback(
    async (name: string) => {
      try {
        const account: Account = await window.api.account.loginOffline(name)
        setSnapshot((current) =>
          current
            ? { ...current, settings: { ...current.settings, account } }
            : current
        )
      } catch (error) {
        throw new Error(errorText(error))
      }
    },
    []
  )

  const logout = useCallback(async () => {
    try {
      await window.api.account.logout()
      setSnapshot((current) =>
        current ? { ...current, settings: { ...current.settings, account: null } } : current
      )
      setPage('play')
    } catch (error) {
      toast('error', 'Не удалось выйти', errorText(error))
    }
  }, [toast])

  const theme = snapshot?.settings.theme ?? 'emerald'

  if (bootError) {
    return (
      <div className="app">
        <div className="ambient" aria-hidden="true">
          <span className="orb orb-1" />
          <span className="orb orb-2" />
          <span className="orb orb-3" />
          <div className="grid-overlay" />
        </div>
        <div className="boot-screen">
          <LogoMark size={72} />
          <h2>Не удалось запустить лаунчер</h2>
          <p>{bootError}</p>
          <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  if (!snapshot) {
    return (
      <div className="app">
        <div className="ambient" aria-hidden="true">
          <span className="orb orb-1" />
          <span className="orb orb-2" />
          <span className="orb orb-3" />
          <div className="grid-overlay" />
        </div>
        <div className="boot-screen">
          <LogoMark size={76} />
          <div className="boot-title">SEMPAI LAUNCHER</div>
          <div className="boot-loader">
            <span />
          </div>
        </div>
      </div>
    )
  }

  const ctx: AppContextValue = {
    snapshot,
    settings: snapshot.settings,
    versions,
    selectedVersion,
    setSelectedVersion,
    javaInfo,
    progress,
    logs,
    launching,
    running,
    news,
    launch,
    quickJoin,
    updateSettings,
    refreshSnapshot,
    toast,
    setPage,
    clearLogs: () => setLogs([])
  }

  const renderPage = (): JSX.Element => {
    switch (page) {
      case 'play':
        return <PlayPage ctx={ctx} />
      case 'skins':
        return <SkinsPage ctx={ctx} />
      case 'mods':
        return <ModsPage ctx={ctx} />
      case 'servers':
        return <ServersPage ctx={ctx} />
      case 'friends':
        return <FriendsPage ctx={ctx} />
      case 'settings':
        return <SettingsPage ctx={ctx} />
      default:
        return <PlayPage ctx={ctx} />
    }
  }

  return (
    <div className="app">
      <div className="ambient" aria-hidden="true">
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
        <div className="grid-overlay" />
      </div>

      <Titlebar
        page={page}
        theme={theme}
        maximized={maximized}
        appUpdate={appUpdate}
        onUpdate={handleTitlebarUpdate}
        onTheme={(nextTheme) => void updateSettings({ theme: nextTheme })}
      />

      {!snapshot.settings.account ? (
        <AuthScreen onLogin={login} appVersion={snapshot.system.appVersion} />
      ) : (
        <div className="shell">
          <Sidebar
            page={page}
            account={snapshot.settings.account}
            system={snapshot.system}
            onNavigate={setPage}
            onLogout={logout}
          />
          <main className="content">
            <div className="page-scroll" key={page}>
              {renderPage()}
            </div>
          </main>
        </div>
      )}

      <Toasts items={toasts} onDismiss={dismissToast} />
    </div>
  )
}

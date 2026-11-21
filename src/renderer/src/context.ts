import type {
  JavaInfo,
  LaunchProgress,
  NewsEntry,
  PageId,
  ServerEntry,
  Settings,
  StoreSnapshot,
  VersionManifestInfo
} from '@shared/types'
import type { ToastKind } from './components/Toasts'

export interface AppContextValue {
  snapshot: StoreSnapshot
  settings: Settings
  versions: VersionManifestInfo | null
  selectedVersion: string
  setSelectedVersion: (id: string) => void
  javaInfo: JavaInfo | null
  progress: LaunchProgress | null
  logs: string[]
  launching: boolean
  running: boolean
  news: NewsEntry[]
  launch: (server?: { host: string; port: number }) => Promise<void>
  quickJoin: (server: ServerEntry) => Promise<void>
  updateSettings: (patch: Partial<Settings>) => Promise<void>
  refreshSnapshot: () => Promise<void>
  toast: (kind: ToastKind, title: string, message?: string) => void
  setPage: (page: PageId) => void
  clearLogs: () => void
}

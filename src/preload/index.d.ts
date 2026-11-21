import type { SempaiApi } from '../shared/types'

declare global {
  interface Window {
    api: SempaiApi
  }
}

export {}

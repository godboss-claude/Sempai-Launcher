import type { IconName } from './components/Icon'
import type { PageId } from '@shared/types'

export interface NavItem {
  id: PageId
  label: string
  icon: IconName
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'play', label: 'Играть', icon: 'play' },
  { id: 'skins', label: 'Скины', icon: 'user' },
  { id: 'mods', label: 'Моды', icon: 'box' },
  { id: 'servers', label: 'Серверы', icon: 'server' },
  { id: 'friends', label: 'Друзья', icon: 'users' },
  { id: 'settings', label: 'Настройки', icon: 'settings' }
]

export const PAGE_TITLES: Record<PageId, string> = {
  play: 'Играть',
  skins: 'Скины',
  mods: 'Моды',
  servers: 'Серверы',
  friends: 'Друзья',
  settings: 'Настройки'
}

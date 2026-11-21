import type { JSX } from 'react'
import type { AppUpdateStatus, PageId, ThemeId } from '@shared/types'
import { Logo } from './Logo'
import { Icon } from './Icon'
import { PAGE_TITLES } from '../navigation'

interface TitlebarProps {
  page: PageId
  theme: ThemeId
  maximized: boolean
  appUpdate: AppUpdateStatus
  onUpdate: () => void
  onTheme: (theme: ThemeId) => void
}

export function Titlebar({ page, theme, maximized, appUpdate, onUpdate, onTheme }: TitlebarProps): JSX.Element {
  const updateLabel = appUpdate.state === 'available'
    ? `Обновить ${appUpdate.version ?? ''}`.trim()
    : appUpdate.state === 'downloaded'
      ? 'Перезапустить и обновить'
      : appUpdate.state === 'downloading'
        ? `Скачиваем ${appUpdate.percent ?? 0}%`
        : appUpdate.state === 'checking'
          ? 'Проверяем…'
          : ''

  return (
    <header className="titlebar">
      <div
        className="titlebar-drag"
        onDoubleClick={() => window.api.window.toggleMaximize()}
      >
        <Logo compact />
        <div className="titlebar-divider" />
        <span className="titlebar-page">{PAGE_TITLES[page]}</span>
      </div>

      <div className="titlebar-actions">
        {updateLabel && (
          <button
            type="button"
            className={`titlebar-update ${appUpdate.state === 'available' || appUpdate.state === 'downloaded' ? 'is-ready' : ''}`}
            onClick={onUpdate}
            disabled={appUpdate.state === 'checking' || appUpdate.state === 'downloading'}
            title={appUpdate.message}
          >
            <Icon name={appUpdate.state === 'downloaded' ? 'refresh' : 'download'} size={14} />
            {updateLabel}
          </button>
        )}
        <div className="theme-switch" role="group" aria-label="Цветовая тема">
          <span className="theme-switch-label">
            <Icon name="palette" size={14} />
            Тема
          </span>
          <button
            type="button"
            className={`theme-dot theme-dot-emerald ${theme === 'emerald' ? 'is-active' : ''}`}
            onClick={() => onTheme('emerald')}
            title="Изумруд и синий"
            aria-label="Изумрудно-синяя тема"
          />
          <button
            type="button"
            className={`theme-dot theme-dot-pink ${theme === 'pink' ? 'is-active' : ''}`}
            onClick={() => onTheme('pink')}
            title="Розовая тема"
            aria-label="Розовая тема"
          />
        </div>

        <div className="window-controls">
          <button
            type="button"
            className="window-btn"
            onClick={() => window.api.window.minimize()}
            aria-label="Свернуть"
          >
            <Icon name="minimize" size={16} />
          </button>
          <button
            type="button"
            className="window-btn"
            onClick={() => window.api.window.toggleMaximize()}
            aria-label={maximized ? 'Восстановить' : 'Развернуть'}
          >
            <Icon name={maximized ? 'restore' : 'maximize'} size={14} />
          </button>
          <button
            type="button"
            className="window-btn window-btn-close"
            onClick={() => window.api.window.close()}
            aria-label="Закрыть"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}

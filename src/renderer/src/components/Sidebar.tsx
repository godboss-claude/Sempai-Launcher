import type { JSX } from 'react'
import type { Account, PageId, SystemInfo } from '@shared/types'
import { NAV_ITEMS } from '../navigation'
import { Avatar } from './Avatar'
import { Icon } from './Icon'

interface SidebarProps {
  page: PageId
  account: Account
  system: SystemInfo
  onNavigate: (page: PageId) => void
  onLogout: () => void
}

export function Sidebar({ page, account, system, onNavigate, onLogout }: SidebarProps): JSX.Element {
  return (
    <aside className="sidebar">
      <div className="sidebar-section-label">Меню</div>
      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-item ${page === item.id ? 'is-active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="nav-icon">
              <Icon name={item.icon} size={19} />
            </span>
            <span className="nav-label">{item.label}</span>
            {page === item.id && <span className="nav-indicator" />}
          </button>
        ))}
      </nav>

      <div className="sidebar-spacer" />

      <div className="sidebar-badge-card">
        <div className="sidebar-badge-top">
          <span className="status-dot" />
          <span>Minecraft Java</span>
        </div>
        <span className="sidebar-badge-sub">Лаунчер готов к работе</span>
        <div className="sidebar-badge-glow" />
      </div>

      <div className="account-card">
        <Avatar name={account.name} size={40} />
        <div className="account-info">
          <strong>{account.name}</strong>
          <span>Офлайн-аккаунт</span>
        </div>
        <button
          type="button"
          className="icon-btn account-logout"
          onClick={onLogout}
          title="Выйти из аккаунта"
          aria-label="Выйти из аккаунта"
        >
          <Icon name="logout" size={17} />
        </button>
      </div>

      <div className="sidebar-footer">Sempai Launcher v{system.appVersion}</div>
    </aside>
  )
}

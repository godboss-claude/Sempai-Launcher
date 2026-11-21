import { useEffect, useMemo, useRef, useState } from 'react'
import type { JSX } from 'react'
import type { VersionInfo } from '@shared/types'
import { Icon } from './Icon'

interface VersionSelectProps {
  versions: VersionInfo[]
  value: string
  latestRelease?: string
  showSnapshots: boolean
  onChange: (id: string) => void
  onToggleSnapshots: (value: boolean) => void
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date)
}

export function VersionSelect({
  versions,
  value,
  latestRelease,
  showSnapshots,
  onChange,
  onToggleSnapshots
}: VersionSelectProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent): void => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    const timer = window.setTimeout(() => searchRef.current?.focus(), 40)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
      window.clearTimeout(timer)
    }
  }, [open])

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase()
    return versions
      .filter((version) => (showSnapshots || version.type === 'release'))
      .filter((version) => !search || version.id.toLowerCase().includes(search))
      .slice(0, 180)
  }, [versions, query, showSnapshots])

  const selected = versions.find((version) => version.id === value)

  return (
    <div className="version-select" ref={rootRef}>
      <button
        type="button"
        className={`version-trigger ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="version-trigger-icon">
          <Icon name="box" size={18} />
        </span>
        <span className="version-trigger-text">
          <span className="version-trigger-label">Версия Minecraft</span>
          <strong>{value || 'Выберите версию'}</strong>
        </span>
        {value === latestRelease && <span className="pill pill-accent">Latest</span>}
        {selected?.type !== 'release' && <span className="pill">Snapshot</span>}
        <Icon name="chevronDown" size={16} className={`version-chevron ${open ? 'is-open' : ''}`} />
      </button>

      {open && (
        <div className="version-popover">
          <div className="version-search">
            <Icon name="search" size={16} />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск версии…"
              spellCheck={false}
            />
          </div>

          <div className="version-list" role="listbox">
            {filtered.length === 0 && (
              <div className="version-empty">Ничего не найдено</div>
            )}
            {filtered.map((version) => (
              <button
                key={version.id}
                type="button"
                role="option"
                aria-selected={version.id === value}
                className={`version-option ${version.id === value ? 'is-selected' : ''}`}
                onClick={() => {
                  onChange(version.id)
                  setOpen(false)
                  setQuery('')
                }}
              >
                <span className="version-option-main">
                  <strong>{version.id}</strong>
                  <span>{formatDate(version.releaseTime)}</span>
                </span>
                <span className="version-option-side">
                  {version.id === latestRelease && <span className="pill pill-accent">Latest</span>}
                  {version.type !== 'release' && <span className="pill">Snapshot</span>}
                  {version.id === value && <Icon name="check" size={15} />}
                </span>
              </button>
            ))}
          </div>

          <label className="version-snapshots">
            <span>Показывать снапшоты</span>
            <input
              type="checkbox"
              checked={showSnapshots}
              onChange={(event) => onToggleSnapshots(event.target.checked)}
            />
            <span className="mini-switch" aria-hidden="true" />
          </label>
        </div>
      )}
    </div>
  )
}

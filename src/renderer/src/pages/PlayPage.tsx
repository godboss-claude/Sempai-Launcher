import { useEffect, useRef } from 'react'
import type { JSX } from 'react'
import type { AppContextValue } from '../context'
import { Icon } from '../components/Icon'
import { VersionSelect } from '../components/VersionSelect'

function formatPlaytime(seconds: number): string {
  if (seconds < 60) return 'меньше минуты'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  if (hours > 0) return `${hours} ч ${minutes} мин`
  return `${minutes} мин`
}

function formatDate(value: number | null): string {
  if (!value) return 'Ещё не играли'
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(value))
}

function formatNewsDate(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(date)
}

export function PlayPage({ ctx }: { ctx: AppContextValue }): JSX.Element {
  const {
    snapshot,
    settings,
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
    updateSettings,
    setPage,
    clearLogs
  } = ctx
  const account = snapshot.settings.account
  const consoleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = consoleRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [logs.length])

  const latestRelease = versions?.latest.release
  const busy = launching || running
  const percent = progress?.percent ?? null
  const javaReady = Boolean(javaInfo?.available)
  const requiredJava = javaInfo?.requiredMajor

  return (
    <div className="page play-page">
      <div className="page-head">
        <div>
          <span className="eyebrow">
            <span className="status-dot" />
            Minecraft Java Edition
          </span>
          <h1>
            С возвращением, <span className="text-gradient">{account?.name ?? 'игрок'}</span>
          </h1>
          <p>Выберите версию и нажмите «Играть» — остальное лаунчер сделает сам.</p>
        </div>
        <div className="head-chips">
          <span className="chip">
            <Icon name="shield" size={15} />
            Офлайн-аккаунт
          </span>
          <span className="chip">
            <Icon name="clock" size={15} />
            {formatPlaytime(settings.playtimeSeconds)}
          </span>
        </div>
      </div>

      <div className="play-grid">
        <section className="card hero-card">
          <div className="hero-decor" aria-hidden="true">
            <span className="hero-glow" />
            <span className="cube cube-a" />
            <span className="cube cube-b" />
            <span className="cube cube-c" />
            <span className="hero-ring" />
          </div>

          <div className="hero-top">
            <span className={`status-pill ${running ? 'is-live' : ''}`}>
              <span className="status-dot" />
              {running ? 'Игра запущена' : launching ? 'Подготовка…' : 'Готов к запуску'}
            </span>
            {versions ? (
              <VersionSelect
                versions={versions.versions}
                value={selectedVersion}
                latestRelease={latestRelease}
                showSnapshots={settings.showSnapshots}
                onChange={(version) => {
                  setSelectedVersion(version)
                  void updateSettings({ lastVersion: version })
                }}
                onToggleSnapshots={(value) => void updateSettings({ showSnapshots: value })}
              />
            ) : (
              <div className="version-skeleton" />
            )}
          </div>

          <div className="hero-main">
            <h2>
              Погружайся в <span className="text-gradient">Minecraft</span>
              <br />
              на полной скорости
            </h2>
            <p>
              Один клик — и лаунчер проверит файлы, скачает нужную Java и запустит игру.
              Ваши настройки и моды останутся на месте.
            </p>

            <div className="hero-actions">
              <button
                type="button"
                className={`btn btn-primary btn-play ${running ? 'is-running' : ''}`}
                onClick={() => void launch()}
                disabled={busy || !selectedVersion}
              >
                {launching ? (
                  <>
                    <span className="spinner" />
                    Запускаем…
                  </>
                ) : running ? (
                  <>
                    <Icon name="gamepad" size={20} />
                    Minecraft запущен
                  </>
                ) : (
                  <>
                    <Icon name="play" size={19} />
                    Играть
                  </>
                )}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setPage('servers')}>
                <Icon name="server" size={17} />
                Серверы
                <Icon name="arrowRight" size={15} />
              </button>
            </div>
          </div>

          <div className="hero-meta">
            <div className="hero-meta-item">
              <Icon name="monitor" size={16} />
              <span>
                {settings.width} × {settings.height}
                {settings.fullscreen ? ' • Fullscreen' : ''}
              </span>
            </div>
            <div className="hero-meta-item">
              <Icon name="chip" size={16} />
              <span>{Math.round(settings.memoryMax / 1024)} ГБ RAM</span>
            </div>
            <div className={`hero-meta-item ${javaReady ? 'is-ok' : 'is-warn'}`}>
              <Icon name="coffee" size={16} />
              <span>
                {javaReady
                  ? `Java ${javaInfo?.major ?? requiredJava ?? '—'} готова`
                  : requiredJava
                    ? `Java ${requiredJava} скачается автоматически`
                    : 'Проверка Java…'}
              </span>
            </div>
            <button
              type="button"
              className="hero-meta-link"
              onClick={() => void window.api.app.openPath(settings.gameDir)}
            >
              <Icon name="folder" size={15} />
              Папка игры
            </button>
          </div>

          {(launching || running) && progress && (
            <div className={`launch-progress ${running ? 'is-done' : ''}`}>
              <div className="launch-progress-head">
                <div className="launch-progress-text">
                  <span className="launch-spinner">
                    {running ? <Icon name="check" size={15} /> : <span className="spinner" />}
                  </span>
                  <div>
                    <strong>{progress.stage}</strong>
                    <span>{progress.detail}</span>
                  </div>
                </div>
                <span className="launch-percent">
                  {running ? '100%' : percent === null ? '…' : `${Math.round(percent)}%`}
                </span>
              </div>
              <div className={`progress-track ${percent === null && !running ? 'is-indeterminate' : ''}`}>
                <span
                  className="progress-fill"
                  style={{ width: running ? '100%' : `${percent ?? 15}%` }}
                />
              </div>
            </div>
          )}
        </section>

        <aside className="play-aside">
          <section className="card side-card stats-card">
            <div className="side-card-head">
              <span className="side-icon">
                <Icon name="clock" size={18} />
              </span>
              <div>
                <h3>Статистика</h3>
                <span>Ваше время в игре</span>
              </div>
            </div>
            <div className="stats-big">{formatPlaytime(settings.playtimeSeconds)}</div>
            <div className="stats-row">
              <div>
                <span>Последний запуск</span>
                <strong>{formatDate(settings.lastPlayedAt)}</strong>
              </div>
              <div>
                <span>Версия</span>
                <strong>{selectedVersion || '—'}</strong>
              </div>
            </div>
          </section>

          <section className="card side-card news-card">
            <div className="side-card-head">
              <span className="side-icon">
                <Icon name="sparkles" size={18} />
              </span>
              <div>
                <h3>Новости Minecraft</h3>
                <span>Свежее из мира Java Edition</span>
              </div>
            </div>

            <div className="news-list">
              {news.slice(0, 4).map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className="news-item"
                  onClick={() => {
                    if (item.url) void window.api.app.openExternal(item.url)
                  }}
                  disabled={!item.url}
                >
                  {item.image ? (
                    <img
                      className="news-thumb"
                      src={item.image}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="news-thumb news-thumb-fallback">
                      <Icon name="sparkles" size={18} />
                    </span>
                  )}
                  <span className="news-info">
                    <span className="news-meta">
                      {item.category}
                      {item.date && <span>•</span>}
                      {formatNewsDate(item.date)}
                    </span>
                    <strong>{item.title}</strong>
                    <span className="news-text">{item.text}</span>
                  </span>
                </button>
              ))}
              {news.length === 0 && (
                <div className="news-empty">
                  <Icon name="info" size={18} />
                  Новости появятся при подключении к интернету
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      {logs.length > 0 && (
        <section className="card console-card">
          <div className="console-head">
            <div className="console-title">
              <Icon name="terminal" size={17} />
              Консоль запуска
              <span className="pill">{logs.length}</span>
            </div>
            <button type="button" className="btn btn-tiny btn-ghost" onClick={clearLogs}>
              <Icon name="trash" size={14} />
              Очистить
            </button>
          </div>
          <div className="console-output" ref={consoleRef}>
            {logs.map((line, index) => (
              <div
                key={`${index}-${line.slice(0, 12)}`}
                className={
                  line.includes('Ошибка') || line.includes('ERROR')
                    ? 'console-line is-error'
                    : line.startsWith('[launcher]')
                      ? 'console-line is-launcher'
                      : 'console-line'
                }
              >
                {line}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

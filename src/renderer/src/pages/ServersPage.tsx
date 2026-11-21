import { useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { PingResult, ServerEntry } from '@shared/types'
import type { AppContextValue } from '../context'
import { Icon } from '../components/Icon'
import { Modal, ConfirmDialog } from '../components/Modal'
import { copyText, errorText } from '../utils'

function pingClass(result?: PingResult): string {
  if (!result) return 'is-checking'
  if (!result.online) return 'is-offline'
  if ((result.ping ?? 999) < 90) return 'is-good'
  if ((result.ping ?? 999) < 180) return 'is-mid'
  return 'is-bad'
}

export function ServersPage({ ctx }: { ctx: AppContextValue }): JSX.Element {
  const { toast, quickJoin, launching, running } = ctx
  const [servers, setServers] = useState<ServerEntry[]>([])
  const [pings, setPings] = useState<Record<string, PingResult>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [adding, setAdding] = useState(false)
  const [formError, setFormError] = useState('')
  const [form, setForm] = useState({ name: '', address: '', note: '' })
  const [removeTarget, setRemoveTarget] = useState<ServerEntry | null>(null)
  const [joinTarget, setJoinTarget] = useState<string | null>(null)

  const pingOne = useCallback(async (server: ServerEntry) => {
    try {
      const result = await window.api.servers.ping({
        id: server.id,
        host: server.host,
        port: server.port
      })
      setPings((current) => ({ ...current, [server.id]: result }))
    } catch {
      setPings((current) => ({
        ...current,
        [server.id]: { id: server.id, online: false, ping: null, error: 'Ошибка' }
      }))
    }
  }, [])

  const pingAll = useCallback(
    async (list: ServerEntry[]) => {
      setRefreshing(true)
      await Promise.all(list.map((server) => pingOne(server)))
      setRefreshing(false)
    },
    [pingOne]
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await window.api.servers.list()
      setServers(list)
      setLoading(false)
      void pingAll(list)
    } catch (error) {
      setLoading(false)
      toast('error', 'Не удалось загрузить серверы', errorText(error))
    }
  }, [pingAll, toast])

  useEffect(() => {
    void load()
  }, [load])

  const addServer = async (): Promise<void> => {
    setFormError('')
    if (!form.name.trim()) {
      setFormError('Укажите название сервера')
      return
    }
    if (!form.address.trim()) {
      setFormError('Укажите адрес сервера')
      return
    }
    setAdding(true)
    try {
      const list = await window.api.servers.add({
        name: form.name,
        address: form.address,
        note: form.note
      })
      setServers(list)
      setShowAdd(false)
      setForm({ name: '', address: '', note: '' })
      toast('success', 'Сервер добавлен', form.name)
      const added = list[list.length - 1]
      if (added) void pingOne(added)
    } catch (error) {
      setFormError(errorText(error))
    } finally {
      setAdding(false)
    }
  }

  const removeServer = async (): Promise<void> => {
    if (!removeTarget) return
    const target = removeTarget
    setRemoveTarget(null)
    try {
      setServers(await window.api.servers.remove(target.id))
      toast('success', 'Сервер удалён', target.name)
    } catch (error) {
      toast('error', 'Не удалось удалить сервер', errorText(error))
    }
  }

  const playOnServer = async (server: ServerEntry): Promise<void> => {
    setJoinTarget(server.id)
    try {
      await quickJoin(server)
    } finally {
      window.setTimeout(() => setJoinTarget(null), 1500)
    }
  }

  const onlineCount = servers.filter((server) => pings[server.id]?.online).length

  return (
    <div className="page servers-page">
      <div className="page-head">
        <div>
          <span className="eyebrow">
            <Icon name="server" size={14} />
            Мультиплеер
          </span>
          <h1>Серверы</h1>
          <p>Проверяйте пинг и подключайтесь к серверу прямо из лаунчера.</p>
        </div>
        <div className="head-actions">
          <span className="chip">
            <span className="status-dot" />
            {onlineCount} из {servers.length} онлайн
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => void pingAll(servers)}
            disabled={refreshing || servers.length === 0}
          >
            <Icon name="refresh" size={16} className={refreshing ? 'spin' : ''} />
            Обновить пинг
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Icon name="plus" size={17} />
            Добавить сервер
          </button>
        </div>
      </div>

      {loading ? (
        <div className="card list-loading">
          <span className="spinner" />
          Загружаем список серверов…
        </div>
      ) : (
        <div className="servers-grid">
          {servers.map((server) => {
            const ping = pings[server.id]
            const players = ping?.players
            const playerPercent =
              players && players.max > 0 ? Math.min(100, (players.online / players.max) * 100) : 0
            return (
              <article className="card server-card" key={server.id}>
                <div className="server-head">
                  {ping?.icon ? (
                    <img className="server-icon" src={ping.icon} alt="" draggable={false} />
                  ) : (
                    <span className="server-icon server-icon-fallback">
                      {server.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="server-title">
                    <strong>{server.name}</strong>
                    <button
                      type="button"
                      className="server-address"
                      onClick={() => {
                        void copyText(`${server.host}:${server.port}`)
                        toast('success', 'Адрес скопирован', `${server.host}:${server.port}`)
                      }}
                      title="Скопировать адрес"
                    >
                      {server.host}
                      {server.port !== 25565 ? `:${server.port}` : ''}
                      <Icon name="copy" size={13} />
                    </button>
                  </div>
                  <span className={`ping-badge ${pingClass(ping)}`}>
                    {!ping ? (
                      <>
                        <span className="spinner tiny" />
                        …
                      </>
                    ) : ping.online ? (
                      <>
                        <span className="status-dot" />
                        {ping.ping} ms
                      </>
                    ) : (
                      'Офлайн'
                    )}
                  </span>
                </div>

                <p className="server-motd">
                  {ping?.motd || server.note || 'Описание сервера появится после проверки пинга.'}
                </p>

                <div className="server-players">
                  <div className="server-players-text">
                    <span>
                      <Icon name="users" size={14} />
                      {players ? `${players.online} / ${players.max}` : '— / —'}
                    </span>
                    {ping?.version && <span>{ping.version}</span>}
                  </div>
                  <div className="players-track">
                    <span style={{ width: `${playerPercent}%` }} />
                  </div>
                </div>

                <div className="server-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-server-play"
                    onClick={() => void playOnServer(server)}
                    disabled={launching || running}
                  >
                    {joinTarget === server.id ? (
                      <>
                        <span className="spinner" />
                        Подключаем…
                      </>
                    ) : (
                      <>
                        <Icon name="play" size={16} />
                        Играть
                      </>
                    )}
                  </button>
                  {server.custom ? (
                    <button
                      type="button"
                      className="icon-btn icon-btn-danger"
                      onClick={() => setRemoveTarget(server)}
                      title="Удалить сервер"
                      aria-label="Удалить сервер"
                    >
                      <Icon name="trash" size={17} />
                    </button>
                  ) : (
                    <span className="pill">Официальный список</span>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      )}

      <Modal
        open={showAdd}
        title="Добавить сервер"
        onClose={() => setShowAdd(false)}
        width={520}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setShowAdd(false)}>
              Отмена
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void addServer()}
              disabled={adding}
            >
              {adding ? <span className="spinner" /> : <Icon name="plus" size={16} />}
              Добавить
            </button>
          </>
        }
      >
        <form
          className="form-stack"
          onSubmit={(event) => {
            event.preventDefault()
            void addServer()
          }}
        >
          <label className="field-label" htmlFor="server-name">
            Название
          </label>
          <input
            id="server-name"
            className="text-input"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Например, FunTime"
            maxLength={40}
          />
          <label className="field-label" htmlFor="server-address">
            Адрес
          </label>
          <input
            id="server-address"
            className="text-input"
            value={form.address}
            onChange={(event) => setForm({ ...form, address: event.target.value })}
            placeholder="mc.example.com:25565"
            spellCheck={false}
          />
          <label className="field-label" htmlFor="server-note">
            Заметка <span className="field-optional">необязательно</span>
          </label>
          <input
            id="server-note"
            className="text-input"
            value={form.note}
            onChange={(event) => setForm({ ...form, note: event.target.value })}
            placeholder="Например, выживание с друзьями"
            maxLength={120}
          />
          {formError && (
            <div className="field-error">
              <Icon name="warning" size={14} />
              {formError}
            </div>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Удалить сервер?"
        message={`«${removeTarget?.name ?? ''}» будет удалён из вашего списка.`}
        confirmLabel="Удалить"
        danger
        onConfirm={() => void removeServer()}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  )
}

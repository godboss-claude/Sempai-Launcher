import { useCallback, useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { Friend } from '@shared/types'
import type { AppContextValue } from '../context'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { ConfirmDialog } from '../components/Modal'
import { copyText, errorText, formatDateTime } from '../utils'

export function FriendsPage({ ctx }: { ctx: AppContextValue }): JSX.Element {
  const { toast } = ctx
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [note, setNote] = useState('')
  const [adding, setAdding] = useState(false)
  const [formError, setFormError] = useState('')
  const [removeTarget, setRemoveTarget] = useState<Friend | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setFriends(await window.api.friends.list())
    } catch (error) {
      toast('error', 'Не удалось загрузить друзей', errorText(error))
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void load()
  }, [load])

  const addFriend = async (): Promise<void> => {
    setFormError('')
    if (!/^[A-Za-z0-9_]{2,16}$/.test(name.trim())) {
      setFormError('Ник: 2–16 символов, латиница, цифры или _')
      return
    }
    setAdding(true)
    try {
      const list = await window.api.friends.add(name.trim(), note.trim())
      setFriends(list)
      toast('success', 'Друг добавлен', name.trim())
      setName('')
      setNote('')
    } catch (error) {
      setFormError(errorText(error))
    } finally {
      setAdding(false)
    }
  }

  const removeFriend = async (): Promise<void> => {
    if (!removeTarget) return
    const target = removeTarget
    setRemoveTarget(null)
    try {
      setFriends(await window.api.friends.remove(target.id))
      toast('success', 'Друг удалён', target.name)
    } catch (error) {
      toast('error', 'Не удалось удалить друга', errorText(error))
    }
  }

  return (
    <div className="page friends-page">
      <div className="page-head">
        <div>
          <span className="eyebrow">
            <Icon name="users" size={14} />
            Сообщество
          </span>
          <h1>Друзья</h1>
          <p>Сохраняйте ники друзей, чтобы быстро копировать их и приглашать в игру.</p>
        </div>
        <span className="chip">
          <Icon name="users" size={15} />
          {friends.length} в списке
        </span>
      </div>

      <section className="card friend-add-card">
        <div className="side-card-head">
          <span className="side-icon">
            <Icon name="plus" size={18} />
          </span>
          <div>
            <h3>Добавить друга</h3>
            <span>Ник Minecraft и заметка</span>
          </div>
        </div>
        <form
          className="friend-form"
          onSubmit={(event) => {
            event.preventDefault()
            void addFriend()
          }}
        >
          <div className="friend-form-field">
            <label className="field-label" htmlFor="friend-name">
              Ник
            </label>
            <input
              id="friend-name"
              className="text-input"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setFormError('')
              }}
              placeholder="Например, Sempai"
              maxLength={16}
              spellCheck={false}
            />
          </div>
          <div className="friend-form-field is-wide">
            <label className="field-label" htmlFor="friend-note">
              Заметка <span className="field-optional">необязательно</span>
            </label>
            <input
              id="friend-note"
              className="text-input"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Например, играет на FunTime"
              maxLength={120}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={adding}>
            {adding ? <span className="spinner" /> : <Icon name="plus" size={17} />}
            Добавить
          </button>
        </form>
        {formError && (
          <div className="field-error">
            <Icon name="warning" size={14} />
            {formError}
          </div>
        )}
      </section>

      {loading ? (
        <div className="card list-loading">
          <span className="spinner" />
          Загружаем друзей…
        </div>
      ) : friends.length === 0 ? (
        <div className="card empty-state">
          <span className="empty-icon">
            <Icon name="users" size={34} />
          </span>
          <h3>Список друзей пуст</h3>
          <p>Добавьте ник друга, чтобы он всегда был под рукой.</p>
        </div>
      ) : (
        <div className="friends-grid">
          {friends.map((friend) => (
            <article className="card friend-card" key={friend.id}>
              <div className="friend-top">
                <Avatar name={friend.name} size={52} />
                <div className="friend-info">
                  <strong>{friend.name}</strong>
                  <span className={`pill ${friend.uuid ? 'pill-accent' : ''}`}>
                    {friend.uuid ? 'Профиль Mojang' : 'Офлайн-профиль'}
                  </span>
                </div>
                <button
                  type="button"
                  className="icon-btn icon-btn-danger"
                  onClick={() => setRemoveTarget(friend)}
                  title="Удалить друга"
                  aria-label="Удалить друга"
                >
                  <Icon name="trash" size={16} />
                </button>
              </div>
              <p className="friend-note">{friend.note || 'Без заметки'}</p>
              <div className="friend-footer">
                <span>
                  <Icon name="clock" size={13} />
                  Добавлен {formatDateTime(friend.addedAt)}
                </span>
                <button
                  type="button"
                  className="btn btn-tiny btn-ghost"
                  onClick={() => {
                    void copyText(friend.name)
                    toast('success', 'Ник скопирован', friend.name)
                  }}
                >
                  <Icon name="copy" size={14} />
                  Скопировать
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <section className="card info-strip">
        <div className="info-strip-icon">
          <Icon name="info" size={22} />
        </div>
        <div>
          <strong>Список хранится локально</strong>
          <p>
            Друзья сохраняются на этом компьютере. Статус «в сети» появится вместе с системой
            аккаунтов Sempai в следующих обновлениях.
          </p>
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Удалить друга?"
        message={`${removeTarget?.name ?? ''} будет удалён из списка друзей.`}
        confirmLabel="Удалить"
        danger
        onConfirm={() => void removeFriend()}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  )
}

import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import type { AppContextValue } from '../context'
import { Avatar } from '../components/Avatar'
import { Icon } from '../components/Icon'
import { copyText } from '../utils'

const PRESETS = ['Steve', 'Alex', 'Notch', 'jeb_', 'Dinnerbone', 'Herobrine']

export function SkinsPage({ ctx }: { ctx: AppContextValue }): JSX.Element {
  const { settings, snapshot, updateSettings, toast } = ctx
  const accountName = snapshot.settings.account?.name ?? 'Steve'
  const [draft, setDraft] = useState(accountName)
  const [preview, setPreview] = useState(accountName)
  const [bodyFailed, setBodyFailed] = useState(false)

  useEffect(() => {
    setBodyFailed(false)
  }, [preview])

  const applyPreview = (value: string): void => {
    const clean = value.trim()
    if (/^[A-Za-z0-9_]{2,16}$/.test(clean)) {
      setPreview(clean)
      setBodyFailed(false)
    }
  }

  return (
    <div className="page skins-page">
      <div className="page-head">
        <div>
          <span className="eyebrow">
            <Icon name="user" size={14} />
            Профиль
          </span>
          <h1>Скины</h1>
          <p>Посмотрите, как выглядит скин любого игрока, и настройте модель отображения.</p>
        </div>
        <span className="chip">
          <Icon name="eye" size={15} />
          Предпросмотр
        </span>
      </div>

      <div className="skins-grid">
        <section className="card skin-stage-card">
          <div className="skin-stage">
            <span className="skin-stage-glow" />
            <span className="skin-stage-grid" />
            {bodyFailed ? (
              <div className="skin-body-fallback">
                <Icon name="user" size={72} />
                <span>Скин недоступен</span>
              </div>
            ) : (
              <img
                className="skin-body"
                src={`https://mc-heads.net/body/${encodeURIComponent(preview)}/right`}
                alt={`Скин ${preview}`}
                draggable={false}
                referrerPolicy="no-referrer"
                onError={() => setBodyFailed(true)}
              />
            )}
            <div className="skin-nameplate">
              <Avatar name={preview} size={30} />
              <div>
                <strong>{preview}</strong>
                <span>{settings.skinModel === 'slim' ? 'Slim (Alex)' : 'Classic (Steve)'}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="card skin-controls">
          <div className="side-card-head">
            <span className="side-icon">
              <Icon name="image" size={18} />
            </span>
            <div>
              <h3>Предпросмотр скина</h3>
              <span>Введите ник игрока</span>
            </div>
          </div>

          <label className="field-label" htmlFor="skin-name">
            Ник для предпросмотра
          </label>
          <div className="input-with-icon">
            <Icon name="user" size={17} />
            <input
              id="skin-name"
              value={draft}
              maxLength={16}
              spellCheck={false}
              onChange={(event) => {
                setDraft(event.target.value)
                applyPreview(event.target.value)
              }}
              placeholder="Например, Notch"
            />
          </div>

          <div className="field-label">Модель скина</div>
          <div className="segmented">
            <button
              type="button"
              className={settings.skinModel === 'classic' ? 'is-active' : ''}
              onClick={() => void updateSettings({ skinModel: 'classic' })}
            >
              Classic
              <span>Steve / 4px</span>
            </button>
            <button
              type="button"
              className={settings.skinModel === 'slim' ? 'is-active' : ''}
              onClick={() => void updateSettings({ skinModel: 'slim' })}
            >
              Slim
              <span>Alex / 3px</span>
            </button>
          </div>

          <div className="skin-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                void copyText(preview)
                toast('success', 'Ник скопирован', preview)
              }}
            >
              <Icon name="copy" size={16} />
              Скопировать ник
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() =>
                void window.api.app.openExternal(`https://namemc.com/profile/${encodeURIComponent(preview)}`)
              }
            >
              <Icon name="external" size={16} />
              NameMC
            </button>
          </div>

          <button
            type="button"
            className="btn btn-primary skin-editor-btn"
            onClick={() => void window.api.app.openExternal('https://www.minecraft.net/en-us/msa/skin')}
          >
            <Icon name="external" size={17} />
            Открыть редактор скинов
          </button>

          <p className="muted-note">
            <Icon name="info" size={14} />
            Установка скина на аккаунт появится вместе с входом через Microsoft. Сейчас доступен
            предпросмотр любого скина.
          </p>
        </section>
      </div>

      <section className="card skin-gallery-card">
        <div className="side-card-head">
          <span className="side-icon">
            <Icon name="sparkles" size={18} />
          </span>
          <div>
            <h3>Популярные скины</h3>
            <span>Нажмите, чтобы посмотреть</span>
          </div>
        </div>
        <div className="skin-gallery">
          {PRESETS.map((name) => (
            <button
              type="button"
              key={name}
              className={`skin-preset ${preview === name ? 'is-active' : ''}`}
              onClick={() => {
                setDraft(name)
                setPreview(name)
              }}
            >
              <Avatar name={name} size={44} />
              <span>{name}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="card info-strip">
        <div className="info-strip-icon">
          <Icon name="shield" size={22} />
        </div>
        <div>
          <strong>Почему скин не меняется?</strong>
          <p>
            Скин хранится на серверах Mojang и привязан к лицензионному аккаунту. Офлайн-профиль
            использует стандартный скин, но вы можете проверить любой ник в предпросмотре.
          </p>
        </div>
      </section>
    </div>
  )
}

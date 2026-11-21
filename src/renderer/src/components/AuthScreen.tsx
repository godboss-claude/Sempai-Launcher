import { useEffect, useRef, useState } from 'react'
import type { JSX } from 'react'
import { Icon } from './Icon'
import { LogoMark } from './Logo'

interface AuthScreenProps {
  onLogin: (name: string) => Promise<void>
  appVersion: string
}

const FEATURES = [
  { icon: 'zap' as const, title: 'Быстрый запуск', text: 'Игра готова в пару кликов' },
  { icon: 'download' as const, title: 'Всё скачает сам', text: 'Версии, библиотеки и Java' },
  { icon: 'palette' as const, title: 'Две темы', text: 'Изумрудная и розовая' },
  { icon: 'shield' as const, title: 'Локальные данные', text: 'Настройки хранятся у вас' }
]

function randomNickname(): string {
  const adjectives = ['Emerald', 'Frost', 'Neon', 'Pixel', 'Shadow', 'Turbo', 'Cyber', 'Lucky']
  const noun = ['Fox', 'Wolf', 'Craft', 'Miner', 'Steve', 'Ninja', 'Panda', 'Ghost']
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const name = noun[Math.floor(Math.random() * noun.length)]
  return `${adjective}${name}${Math.floor(10 + Math.random() * 90)}`
}

export function AuthScreen({ onLogin, appVersion }: AuthScreenProps): JSX.Element {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const submit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault()
    const clean = name.trim()
    if (!/^[A-Za-z0-9_]{3,16}$/.test(clean)) {
      setError('Ник: 3–16 символов, латиница, цифры или _')
      return
    }
    setError('')
    setLoading(true)
    try {
      await onLogin(clean)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Не удалось войти')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-hero">
        <div className="auth-hero-glow" />
        <div className="auth-brand">
          <LogoMark size={76} />
          <div>
            <h1>
              SEMPAI<span>LAUNCHER</span>
            </h1>
            <p>Твой Minecraft. Твои правила.</p>
          </div>
        </div>

        <div className="auth-copy">
          <h2>
            Погружайся в игру <span className="text-gradient">без лишних хлопот</span>
          </h2>
          <p>
            Современный лаунчер для Minecraft Java Edition: выбор версии, серверы, моды,
            друзья и настройки — всё в одном месте.
          </p>
        </div>

        <div className="auth-features">
          {FEATURES.map((feature) => (
            <div className="auth-feature" key={feature.title}>
              <span className="auth-feature-icon">
                <Icon name={feature.icon} size={18} />
              </span>
              <div>
                <strong>{feature.title}</strong>
                <span>{feature.text}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="auth-hero-footer">
          <span className="status-dot" />
          Java Edition • Windows
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-card">
          <span className="eyebrow">Вход в аккаунт</span>
          <h2>Добро пожаловать</h2>
          <p className="auth-card-sub">
            Введите игровой ник, чтобы начать. Аккаунт сохранится на этом компьютере.
          </p>

          <form onSubmit={submit} className="auth-form">
            <label htmlFor="nickname">Игровой ник</label>
            <div className={`input-with-icon ${error ? 'has-error' : ''}`}>
              <Icon name="user" size={18} />
              <input
                id="nickname"
                ref={inputRef}
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  setError('')
                }}
                placeholder="Например, Sempai"
                maxLength={16}
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            {error && (
              <div className="field-error">
                <Icon name="warning" size={14} />
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner" />
                  Входим…
                </>
              ) : (
                <>
                  <Icon name="play" size={18} />
                  Войти и играть
                </>
              )}
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setName(randomNickname())
                setError('')
                inputRef.current?.focus()
              }}
            >
              <Icon name="sparkles" size={16} />
              Случайный ник
            </button>
          </form>

          <div className="auth-divider">
            <span>или</span>
          </div>

          <button type="button" className="btn btn-disabled auth-microsoft" disabled>
            <span className="ms-logo" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
            </span>
            Войти с Microsoft
            <span className="pill">Скоро</span>
          </button>

          <p className="auth-note">
            Офлайн-режим подходит для одиночной игры и серверов без проверки лицензии.
            Для официальных серверов понадобится вход через Microsoft.
          </p>
        </div>

        <div className="auth-legal">
          <span>Sempai Launcher v{appVersion}</span>
          <span>Не является официальным продуктом Mojang или Microsoft</span>
        </div>
      </div>
    </div>
  )
}

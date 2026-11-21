import { useCallback, useEffect, useMemo, useState } from 'react'
import type { JSX } from 'react'
import type { FabricInfo, ModCatalogEntry, ModEntry } from '@shared/types'
import type { AppContextValue } from '../context'
import { Icon } from '../components/Icon'
import { Toggle } from '../components/Toggle'
import { ConfirmDialog } from '../components/Modal'
import { errorText, formatBytes, formatDateTime } from '../utils'

export function ModsPage({ ctx }: { ctx: AppContextValue }): JSX.Element {
  const { toast, settings } = ctx
  const [mods, setMods] = useState<ModEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ModEntry | null>(null)
  const [tab, setTab] = useState<'catalog' | 'installed'>('catalog')
  const [catalog, setCatalog] = useState<ModCatalogEntry[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [fabric, setFabric] = useState<FabricInfo | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setMods(await window.api.mods.list(ctx.selectedVersion))
    } catch (error) {
      toast('error', 'Не удалось прочитать моды', errorText(error))
    } finally {
      setLoading(false)
    }
  }, [ctx.selectedVersion, toast])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    let active = true
    if (!ctx.selectedVersion) return
    window.api.mods.fabricInfo(ctx.selectedVersion)
      .then((info) => { if (active) setFabric(info) })
      .catch((error) => toast('error', 'Не удалось проверить Fabric', errorText(error)))
    return () => { active = false }
  }, [ctx.selectedVersion, toast])

  useEffect(() => {
    let active = true
    if (tab !== 'catalog' || !ctx.selectedVersion) return
    setCatalogLoading(true)
    const timer = window.setTimeout(() => {
      window.api.mods.search(query, ctx.selectedVersion)
        .then((results) => { if (active) setCatalog(results) })
        .catch((error) => {
          if (active) {
            setCatalog([])
            toast('error', 'Каталог модов недоступен', errorText(error))
          }
        })
        .finally(() => { if (active) setCatalogLoading(false) })
    }, query.trim() ? 300 : 0)
    return () => { active = false; window.clearTimeout(timer) }
  }, [query, tab, ctx.selectedVersion, toast])

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return mods
    return mods.filter(
      (mod) =>
        mod.name.toLowerCase().includes(search) || mod.fileName.toLowerCase().includes(search)
    )
  }, [mods, query])

  const enabledCount = mods.filter((mod) => mod.enabled).length
  const totalSize = mods.reduce((sum, mod) => sum + mod.size, 0)

  const toggle = async (mod: ModEntry): Promise<void> => {
    setBusy(mod.fileName)
    try {
      setMods(await window.api.mods.toggle(mod.fileName, ctx.selectedVersion))
    } catch (error) {
      toast('error', 'Не удалось переключить мод', errorText(error))
    } finally {
      setBusy(null)
    }
  }

  const addMods = async (): Promise<void> => {
    try {
      const before = mods.length
      const next = await window.api.mods.add(ctx.selectedVersion)
      setMods(next)
      if (next.length > before) {
        toast('success', 'Моды добавлены', `Файлов добавлено: ${next.length - before}`)
      }
    } catch (error) {
      toast('error', 'Не удалось добавить моды', errorText(error))
    }
  }

  const removeMod = async (): Promise<void> => {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleteTarget(null)
    setBusy(target.fileName)
    try {
      setMods(await window.api.mods.remove(target.fileName, ctx.selectedVersion))
      toast('success', 'Мод удалён', target.name)
    } catch (error) {
      toast('error', 'Не удалось удалить мод', errorText(error))
    } finally {
      setBusy(null)
    }
  }

  const installFabric = async (): Promise<void> => {
    if (!ctx.selectedVersion) return
    setBusy('fabric')
    try {
      const installed = await window.api.mods.installFabric(ctx.selectedVersion)
      setFabric(installed)
      toast('success', 'Fabric готов', `Моды будут работать с Minecraft ${ctx.selectedVersion}`)
    } catch (error) {
      toast('error', 'Не удалось установить Fabric', errorText(error))
    } finally {
      setBusy(null)
    }
  }

  const installCatalogMod = async (entry: ModCatalogEntry): Promise<void> => {
    if (!ctx.selectedVersion) return
    setBusy(entry.projectId)
    try {
      const before = mods.length
      const next = await window.api.mods.install(entry.projectId, ctx.selectedVersion)
      setMods(next)
      toast('success', 'Мод установлен', `${entry.title}${next.length - before > 1 ? ` и зависимостей: ${next.length - before - 1}` : ''}`)
    } catch (error) {
      toast('error', `Не удалось установить ${entry.title}`, errorText(error))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="page mods-page">
      <div className="page-head">
        <div>
          <span className="eyebrow">
            <Icon name="box" size={14} />
            Библиотека
          </span>
          <h1>Моды</h1>
          <p>Ищите и устанавливайте Fabric-моды прямо в лаунчере или управляйте уже установленными.</p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn btn-ghost" onClick={() => void window.api.mods.openFolder(ctx.selectedVersion)}>
            <Icon name="folder" size={16} />
            Папка модов
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void addMods()}>
            <Icon name="plus" size={17} />
            Добавить мод
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="card mini-stat">
          <span className="mini-stat-icon">
            <Icon name="box" size={18} />
          </span>
          <div>
            <span>Всего модов</span>
            <strong>{mods.length}</strong>
          </div>
        </div>
        <div className="card mini-stat">
          <span className="mini-stat-icon is-green">
            <Icon name="check" size={18} />
          </span>
          <div>
            <span>Включено</span>
            <strong>{enabledCount}</strong>
          </div>
        </div>
        <div className="card mini-stat">
          <span className="mini-stat-icon is-blue">
            <Icon name="download" size={18} />
          </span>
          <div>
            <span>Размер</span>
            <strong>{formatBytes(totalSize)}</strong>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="input-with-icon toolbar-search">
          <Icon name="search" size={17} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tab === 'catalog' ? 'Найти мод в каталоге Modrinth…' : 'Поиск среди установленных…'}
            spellCheck={false}
          />
        </div>
        <span className="toolbar-path" title={settings.gameDir}>
          <Icon name="folder" size={14} />
          {settings.gameDir}\mods\{ctx.selectedVersion}
        </span>
        <button
          type="button"
          className="icon-btn"
          onClick={() => void load()}
          title="Обновить"
          aria-label="Обновить"
        >
          <Icon name="refresh" size={17} />
        </button>
      </div>

      <div className="mods-tabs" role="tablist" aria-label="Моды">
        <button type="button" role="tab" aria-selected={tab === 'catalog'} className={tab === 'catalog' ? 'is-active' : ''} onClick={() => setTab('catalog')}>
          <Icon name="download" size={16} /> Каталог модов
        </button>
        <button type="button" role="tab" aria-selected={tab === 'installed'} className={tab === 'installed' ? 'is-active' : ''} onClick={() => setTab('installed')}>
          <Icon name="box" size={16} /> Установлено <span className="mods-tab-count">{mods.length}</span>
        </button>
      </div>

      {tab === 'catalog' && (
        <>
          <section className="card fabric-banner">
            <div className="fabric-banner-icon"><Icon name="sparkles" size={20} /></div>
            <div className="fabric-banner-copy">
              <strong>{fabric?.installed ? `Fabric установлен · ${fabric.loaderVersion}` : 'Сначала установим Fabric'}</strong>
              <span>{fabric?.installed ? `Подходящие моды для Minecraft ${ctx.selectedVersion}` : `Загрузчик нужен для Mod Menu, автоспринта и визуальных модов · Minecraft ${ctx.selectedVersion || '—'}`}</span>
            </div>
            {!fabric?.installed && (
              <button type="button" className="btn btn-primary" onClick={() => void installFabric()} disabled={busy === 'fabric' || !ctx.selectedVersion}>
                {busy === 'fabric' ? <><span className="spinner" /> Устанавливаем…</> : <><Icon name="download" size={16} /> Установить Fabric</>}
              </button>
            )}
          </section>
          <div className="mod-presets" aria-label="Популярные запросы">
            {[['Mod Menu', 'Mod Menu'], ['Автоспринт', 'Auto Sprint'], ['Визуальные', 'visual']].map(([label, value]) => (
              <button type="button" className={query === value ? 'is-active' : ''} key={value} onClick={() => setQuery(value)}>{label}</button>
            ))}
            <button type="button" onClick={() => setQuery('')}>Популярные</button>
          </div>
          <section className="card mod-catalog">
            {catalogLoading ? (
              <div className="list-loading"><span className="spinner" /> Ищем совместимые моды…</div>
            ) : catalog.length === 0 ? (
              <div className="empty-state compact"><span className="empty-icon"><Icon name="search" size={28} /></span><h3>Моды не найдены</h3><p>Попробуйте другой запрос или выберите другую версию Minecraft.</p></div>
            ) : (
              <div className="mod-catalog-grid">
                {catalog.map((entry) => (
                  <article className="mod-catalog-card" key={entry.projectId}>
                    {entry.iconUrl ? <img className="mod-catalog-icon" src={entry.iconUrl} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span className="mod-catalog-icon mod-catalog-placeholder"><Icon name="box" size={22} /></span>}
                    <div className="mod-catalog-title"><strong>{entry.title}</strong><span>от {entry.author}</span></div>
                    <p>{entry.description}</p>
                    <div className="mod-catalog-footer"><span><Icon name="download" size={13} /> {new Intl.NumberFormat('ru-RU', { notation: 'compact' }).format(entry.downloads)}</span>
                      <button type="button" className="btn btn-primary btn-small" onClick={() => void installCatalogMod(entry)} disabled={!fabric?.installed || busy === entry.projectId}>
                        {busy === entry.projectId ? <><span className="spinner" /> Скачиваем</> : <><Icon name="plus" size={14} /> Установить</>}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {tab === 'installed' && <section className="card mods-list-card">
        {loading ? (
          <div className="list-loading">
            <span className="spinner" />
            Читаем папку модов…
          </div>
        ) : mods.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">
              <Icon name="box" size={34} />
            </span>
            <h3>Пока нет модов</h3>
            <p>
              Скачайте моды для своей версии Minecraft и добавьте их сюда. Лаунчер сохранит файлы в
              папку <code>mods</code>.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => void addMods()}>
              <Icon name="plus" size={17} />
              Добавить первый мод
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state compact">
            <span className="empty-icon">
              <Icon name="search" size={28} />
            </span>
            <h3>Ничего не найдено</h3>
            <p>Попробуйте другой запрос.</p>
          </div>
        ) : (
          <div className="mods-list">
            {filtered.map((mod) => (
              <div className={`mod-row ${!mod.enabled ? 'is-disabled' : ''}`} key={mod.fileName}>
                <span className="mod-icon">
                  <Icon name="box" size={20} />
                </span>
                <div className="mod-info">
                  <strong>{mod.name}</strong>
                  <span>
                    {mod.fileName}
                    <i>•</i>
                    {formatBytes(mod.size)}
                    <i>•</i>
                    {formatDateTime(mod.modified)}
                  </span>
                </div>
                <span className={`pill ${mod.enabled ? 'pill-accent' : ''}`}>
                  {mod.enabled ? 'Включён' : 'Отключён'}
                </span>
                <Toggle
                  checked={mod.enabled}
                  disabled={busy === mod.fileName}
                  onChange={() => void toggle(mod)}
                  label={`Переключить ${mod.name}`}
                />
                <button
                  type="button"
                  className="icon-btn icon-btn-danger"
                  onClick={() => setDeleteTarget(mod)}
                  title="Удалить мод"
                  aria-label="Удалить мод"
                >
                  <Icon name="trash" size={17} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>}

      <section className="card info-strip">
        <div className="info-strip-icon">
          <Icon name="info" size={22} />
        </div>
        <div>
          <strong>Как работают моды</strong>
          <p>
            Каталог загружает моды с Modrinth и показывает только Fabric-моды для выбранной версии. При установке лаунчер также скачивает обязательные зависимости; после этого запускайте игру через эту же версию в лаунчере.
          </p>
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Удалить мод?"
        message={`Файл «${deleteTarget?.fileName ?? ''}» будет перемещён в корзину.`}
        confirmLabel="Удалить"
        danger
        onConfirm={() => void removeMod()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

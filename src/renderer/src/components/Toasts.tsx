import { Icon } from './Icon'
import type { JSX } from 'react'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  kind: ToastKind
  title: string
  message?: string
}

interface ToastsProps {
  items: ToastItem[]
  onDismiss: (id: number) => void
}

export function Toasts({ items, onDismiss }: ToastsProps): JSX.Element {
  return (
    <div className="toasts" aria-live="polite">
      {items.map((item) => (
        <div key={item.id} className={`toast toast-${item.kind}`}>
          <div className="toast-icon">
            <Icon
              name={item.kind === 'success' ? 'check' : item.kind === 'error' ? 'warning' : 'info'}
              size={18}
            />
          </div>
          <div className="toast-body">
            <strong>{item.title}</strong>
            {item.message && <span>{item.message}</span>}
          </div>
          <button
            type="button"
            className="icon-btn toast-close"
            onClick={() => onDismiss(item.id)}
            aria-label="Закрыть"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}

import { useEffect, useState } from 'react'
import type { JSX } from 'react'

interface AvatarProps {
  name?: string | null
  size?: number
  className?: string
}

export function Avatar({ name, size = 40, className = '' }: AvatarProps): JSX.Element {
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [name])

  const style = { width: size, height: size }
  const initial = name?.trim().slice(0, 1).toUpperCase() || '?'

  if (!name || failed) {
    return (
      <div
        className={`avatar avatar-fallback ${className}`}
        style={{ ...style, fontSize: Math.max(12, size * 0.38) }}
        aria-hidden="true"
      >
        {initial}
      </div>
    )
  }

  return (
    <img
      className={`avatar ${className}`}
      style={style}
      src={`https://mc-heads.net/avatar/${encodeURIComponent(name)}/64`}
      alt={name}
      draggable={false}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  )
}

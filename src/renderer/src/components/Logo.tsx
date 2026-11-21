import { useId } from 'react'
import type { JSX } from 'react'

interface LogoMarkProps {
  size?: number
  className?: string
}

export function LogoMark({ size = 44, className = '' }: LogoMarkProps): JSX.Element {
  const rawId = useId()
  const gradientId = `logo-gradient-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`

  return (
    <svg
      className={`logo-mark ${className}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--accent)" />
          <stop offset="0.55" stopColor="var(--accent-3)" />
          <stop offset="1" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="18" fill={`url(#${gradientId})`} />
      <path
        d="M32 13.5 50 23.8v18.4L32 52.5 14 42.2V23.8L32 13.5Z"
        fill="rgba(3,20,27,0.22)"
        stroke="rgba(4,26,32,0.92)"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path
        d="M14 23.8 32 34l18-10.2M32 34v18.5"
        stroke="rgba(4,26,32,0.92)"
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
      <path
        d="m23.5 19.8 17 9.7"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Logo({ compact = false }: { compact?: boolean }): JSX.Element {
  return (
    <div className={`logo ${compact ? 'logo-compact' : ''}`}>
      <LogoMark size={compact ? 34 : 42} />
      <div className="logo-text">
        <span className="logo-name">SEMPAI</span>
        {!compact && <span className="logo-sub">LAUNCHER</span>}
      </div>
    </div>
  )
}

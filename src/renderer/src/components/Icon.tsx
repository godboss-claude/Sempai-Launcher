import type { JSX, SVGProps } from 'react'

export type IconName =
  | 'play'
  | 'user'
  | 'box'
  | 'server'
  | 'users'
  | 'settings'
  | 'palette'
  | 'check'
  | 'close'
  | 'minimize'
  | 'maximize'
  | 'restore'
  | 'plus'
  | 'trash'
  | 'folder'
  | 'refresh'
  | 'copy'
  | 'external'
  | 'search'
  | 'chevronDown'
  | 'chevronRight'
  | 'chevronLeft'
  | 'download'
  | 'sparkles'
  | 'info'
  | 'logout'
  | 'shield'
  | 'chip'
  | 'monitor'
  | 'coffee'
  | 'clock'
  | 'globe'
  | 'upload'
  | 'warning'
  | 'eye'
  | 'link'
  | 'zap'
  | 'image'
  | 'terminal'
  | 'gamepad'
  | 'arrowRight'

const paths: Record<IconName, JSX.Element> = {
  play: <path d="M8 5.4v13.2L19 12 8 5.4Z" fill="currentColor" stroke="none" />,
  user: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.2 20c.7-3.4 3.4-5.2 6.8-5.2s6.1 1.8 6.8 5.2" />
    </>
  ),
  box: (
    <>
      <path d="m21 8.2-9-5.2-9 5.2v7.6l9 5.2 9-5.2V8.2Z" />
      <path d="M3 8.2 12 13.5l9-5.3M12 13.5V21" />
    </>
  ),
  server: (
    <>
      <rect x="3" y="4" width="18" height="6" rx="2" />
      <rect x="3" y="14" width="18" height="6" rx="2" />
      <path d="M7 7h.01M7 17h.01" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 19c.6-3 3-4.6 6.2-4.6s5.6 1.6 6.2 4.6" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 6.1M18.3 14.7c2.1.5 3.5 1.9 3.9 4.3" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2.2" />
      <circle cx="9" cy="17" r="2.2" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18h1.4a1.9 1.9 0 0 0 1.3-3.3 1.9 1.9 0 0 1 1.3-3.3H18a3 3 0 0 0 3-3A9 9 0 0 0 12 3Z" />
      <path d="M7.5 10h.01M10 6.8h.01M14.2 6.5h.01M17 9.5h.01" />
    </>
  ),
  check: <path d="m4.5 12.5 5 5 10-11" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  minimize: <path d="M5 12h14" />,
  maximize: <rect x="5" y="5" width="14" height="14" rx="1.5" />,
  restore: (
    <>
      <rect x="8" y="8" width="11" height="11" rx="1.5" />
      <path d="M5 16V6a1 1 0 0 1 1-1h10" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  trash: (
    <>
      <path d="M4 7h16M9.5 7V4.8h5V7M6.5 7l.9 13h9.2l.9-13" />
      <path d="M10 11v5.5M14 11v5.5" />
    </>
  ),
  folder: (
    <path d="M3.5 6.8A2 2 0 0 1 5.5 5h4l2 2.4h7a2 2 0 0 1 2 2v8.8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2V6.8Z" />
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 1 0-2.3 5.7" />
      <path d="M20 5v6h-6" />
    </>
  ),
  copy: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6M20 4l-8 8" />
      <path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>
  ),
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  chevronLeft: <path d="m15 6-6 6 6 6" />,
  download: (
    <>
      <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5" />
      <path d="M5 19.5h14" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 3.5 13.7 9l5.5 1.7-5.5 1.7L12 18l-1.7-5.6L4.8 10.7 10.3 9 12 3.5Z" />
      <path d="M19 3v3M17.5 4.5h3M5 18v2.5M3.8 19.2h2.5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  logout: (
    <>
      <path d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4" />
      <path d="M15 8l4 4-4 4M9 12h10" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5.5c0 4.2 2.9 7.8 7 9.5 4.1-1.7 7-5.3 7-9.5V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  chip: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M9.5 9.5h5v5h-5zM9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" />
    </>
  ),
  monitor: (
    <>
      <rect x="3" y="4.5" width="18" height="12.5" rx="2" />
      <path d="M9 21h6M12 17v4" />
    </>
  ),
  coffee: (
    <>
      <path d="M4 8h13v5.5A5.5 5.5 0 0 1 11.5 19h-2A5.5 5.5 0 0 1 4 13.5V8Z" />
      <path d="M17 9h2a2.5 2.5 0 0 1 0 5h-2M6.5 3v2.5M10 3v2.5M13.5 3v2.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.8 9.5h16.4M3.8 14.5h16.4M12 3.5c-2.2 2.4-3.3 5.3-3.3 8.5s1.1 6.1 3.3 8.5c2.2-2.4 3.3-5.3 3.3-8.5S14.2 5.9 12 3.5Z" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V5M7.5 9.5 12 5l4.5 4.5" />
      <path d="M5 19.5h14" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3.5 21 20H3L12 3.5Z" />
      <path d="M12 9v5M12 17h.01" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7L11.5 6.8" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 0 0 5.7 5.7l1.3-1.3" />
    </>
  ),
  zap: <path d="M13.5 3 5 13.5h5.5L10 21l8.5-10.5H13L13.5 3Z" />,
  image: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="m5 17 5-5 3.5 3.5L16 13l3 3.5" />
    </>
  ),
  terminal: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2" />
      <path d="m7 9 3 3-3 3M13 15h4" />
    </>
  ),
  gamepad: (
    <>
      <path d="M7.5 7h9a4.5 4.5 0 0 1 4.4 5.4l-.8 4a2.4 2.4 0 0 1-4.2 1.1L14.5 16h-5l-1.4 1.5a2.4 2.4 0 0 1-4.2-1.1l-.8-4A4.5 4.5 0 0 1 7.5 7Z" />
      <path d="M7.5 10v3M6 11.5h3M16 11h.01M18 13h.01" />
    </>
  ),
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />
}

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
}

export function Icon({ name, size = 20, ...rest }: IconProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {paths[name]}
    </svg>
  )
}

const paths = {
  play: <path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none" />,
  pause: <path d="M7 4h3.5v16H7zM13.5 4H17v16h-3.5z" fill="currentColor" stroke="none" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  skip: <path d="M5 5l9 7-9 7zM18 5v14" />,
  restart: <path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4.5h4.5" />,
  back: <path d="M15 5l-7 7 7 7" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
  copy: <path d="M9 9h11v11H9zM5 15H4V4h11v1" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13M10 11v6M14 11v6" />,
  settings: (
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9M15 4.5v5M9 14.5v5" />
  ),
  volume: <path d="M4 9.5v5h3.5L12 19V5L7.5 9.5zM15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" />,
  mute: <path d="M4 9.5v5h3.5L12 19V5L7.5 9.5zM16 9.5l5 5M21 9.5l-5 5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  fullscreen: <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />,
} as const

export type IconName = keyof typeof paths

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

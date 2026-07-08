import { useEffect, useState } from 'react'

const COMPACT_BATTLE_QUERY = '(max-height: 520px) and (orientation: landscape)'

function getInitialOpen(defaultOpen) {
  if (typeof window === 'undefined' || !window.matchMedia) return defaultOpen
  return defaultOpen && !window.matchMedia(COMPACT_BATTLE_QUERY).matches
}

export function CollapsibleBattlePanel({ className = '', title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(() => getInitialOpen(defaultOpen))

  useEffect(() => {
    if (!window.matchMedia) return undefined

    const mediaQuery = window.matchMedia(COMPACT_BATTLE_QUERY)
    const syncOpenState = () => setOpen(defaultOpen && !mediaQuery.matches)

    syncOpenState()
    mediaQuery.addEventListener('change', syncOpenState)

    return () => mediaQuery.removeEventListener('change', syncOpenState)
  }, [defaultOpen])

  return (
    <details
      className={`collapsible-battle-panel ${className}`}
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>{title}</summary>
      <div className="collapsible-battle-panel__content">
        {children}
      </div>
    </details>
  )
}

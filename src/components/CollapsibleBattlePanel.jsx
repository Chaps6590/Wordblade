import { useEffect, useState } from 'react'

const COMPACT_BATTLE_QUERY = '(max-height: 520px) and (orientation: landscape)'

function isCompactBattleViewport() {
  if (typeof window === 'undefined') return false
  const mediaMatches = window.matchMedia?.(COMPACT_BATTLE_QUERY).matches ?? false
  return mediaMatches || (window.innerHeight <= 520 && window.innerWidth > window.innerHeight)
}

function getInitialOpen(defaultOpen) {
  return defaultOpen && !isCompactBattleViewport()
}

export function CollapsibleBattlePanel({ className = '', title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(() => getInitialOpen(defaultOpen))

  useEffect(() => {
    if (!window.matchMedia) return undefined

    const mediaQuery = window.matchMedia?.(COMPACT_BATTLE_QUERY)
    const syncOpenState = () => setOpen(defaultOpen && !isCompactBattleViewport())

    syncOpenState()
    mediaQuery?.addEventListener('change', syncOpenState)
    window.addEventListener('resize', syncOpenState)

    return () => {
      mediaQuery?.removeEventListener('change', syncOpenState)
      window.removeEventListener('resize', syncOpenState)
    }
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

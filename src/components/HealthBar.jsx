import { useEffect, useRef, useState } from 'react'

// Barra de vida reusable. El HUD puede vestirla con marcos y retratos,
// pero los números dinámicos siempre salen del estado de batalla.

export function HealthBar({ name, hp, maxHp, shield = 0, side = 'left', variant = side, showName = true }) {
  const previousHp = useRef(hp)
  const [flashing, setFlashing] = useState(false)
  const safeMax = Math.max(0, Number(maxHp) || 0)
  const safeHp = Math.max(0, Number(hp) || 0)
  const percent = safeMax > 0 ? Math.min(100, Math.max(0, (safeHp / safeMax) * 100)) : 0
  const ratio = percent / 100
  const level = ratio > 0.5 ? 'high' : ratio > 0.25 ? 'mid' : 'low'
  const roundedHp = Math.round(safeHp)
  const roundedMax = Math.round(safeMax)

  useEffect(() => {
    if (Number(hp) < Number(previousHp.current)) {
      setFlashing(true)
      const timeout = window.setTimeout(() => setFlashing(false), 300)
      previousHp.current = hp
      return () => window.clearTimeout(timeout)
    }
    previousHp.current = hp
  }, [hp])

  return (
    <div className={`health-bar side-${side} health-bar--${variant} ${flashing ? 'is-flashing' : ''}`} aria-label={`Vida de ${name}`}>
      {showName && (
        <div className="health-header">
          <span className="health-name">{name}</span>
        </div>
      )}
      <div className="health-track">
        <div className={`health-fill ${level}`} style={{ width: `${percent}%` }} />
        <span className="health-numbers">
          {roundedHp} / {roundedMax}
          {shield > 0 && <span className="shield-value"> 🛡{shield}</span>}
        </span>
      </div>
    </div>
  )
}

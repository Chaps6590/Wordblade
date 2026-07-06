// Barra de vida con escudo opcional.

export function HealthBar({ name, hp, maxHp, shield = 0, side = 'left' }) {
  const ratio = maxHp > 0 ? hp / maxHp : 0
  const level = ratio > 0.5 ? 'high' : ratio > 0.25 ? 'mid' : 'low'

  return (
    <div className={`health-bar side-${side}`}>
      <div className="health-header">
        <span className="health-name">{name}</span>
        <span className="health-numbers">
          {hp} / {maxHp}
          {shield > 0 && <span className="shield-value"> 🛡{shield}</span>}
        </span>
      </div>
      <div className="health-track">
        <div className={`health-fill ${level}`} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  )
}

// Barra de tiempo restante con formato mm:ss.

export function TimerBar({ timeLeft, totalTime }) {
  const safeTotal = Math.max(0, Number(totalTime) || 0)
  const safeTime = Math.max(0, Number(timeLeft) || 0)
  const percent = safeTotal > 0 ? Math.min(100, Math.max(0, (safeTime / safeTotal) * 100)) : 0
  const minutes = Math.floor(safeTime / 60)
  const seconds = safeTime % 60
  const label = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  const warning = safeTime <= 10
  const danger = safeTime <= 5

  return (
    <div className={`timer-bar ${warning ? 'warning' : ''} ${danger ? 'danger' : ''}`}>
      <span className="timer-label">{label}</span>
      <div className="timer-track">
        <div className="timer-fill" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

// Barra de tiempo restante con formato mm:ss.

export function TimerBar({ timeLeft, totalTime }) {
  const ratio = totalTime > 0 ? timeLeft / totalTime : 0
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60
  const label = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  const danger = ratio < 0.25

  return (
    <div className={`timer-bar ${danger ? 'danger' : ''}`}>
      <span className="timer-label">⏱ {label}</span>
      <div className="timer-track">
        <div className="timer-fill" style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  )
}

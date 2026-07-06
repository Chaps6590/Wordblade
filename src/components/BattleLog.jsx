import { useEffect, useRef } from 'react'

// Log de batalla tipo consola RPG. Auto-scroll al último mensaje.

const KIND_CLASS = {
  playerAttack: 'log-player',
  enemyAttack: 'log-enemy',
  invalid: 'log-invalid',
  effect: 'log-effect',
  statusTick: 'log-effect',
  letterBlocked: 'log-enemy',
  letterCursed: 'log-enemy',
  letterPoisoned: 'log-enemy',
  enemyHeal: 'log-enemy',
  phase: 'log-phase',
  end: 'log-end',
  info: 'log-info'
}

export function BattleLog({ entries }) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [entries.length])

  return (
    <div className="battle-log">
      {entries.map((entry, i) => (
        <p key={i} className={`log-entry ${KIND_CLASS[entry.kind] ?? 'log-info'}`}>
          › {entry.text}
        </p>
      ))}
      <div ref={endRef} />
    </div>
  )
}

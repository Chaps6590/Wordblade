import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { getDuelSocket, closeDuelSocket } from '../services/duelSocket.js'
import { validateWordHybrid } from '../game/core/wordValidator.js'
import { calculateDamage } from '../game/core/damageCalculator.js'
import { LetterTile } from '../components/LetterTile.jsx'
import { WordInput } from '../components/WordInput.jsx'
import { HealthBar } from '../components/HealthBar.jsx'
import { BattleLog } from '../components/BattleLog.jsx'

// Duelo 1v1 en tiempo real. Fases: menu -> lobby -> duel -> finished.
// El server es dueño de la sala, la grilla (idéntica para ambos), el
// reloj y los HP; este componente solo refleja su estado.

export function MultiplayerPage() {
  const navigate = useNavigate()
  const { player } = useAuth()

  const [phase, setPhase] = useState('menu')
  const [duel, setDuel] = useState(null)
  const [letters, setLetters] = useState([])
  const [endsAt, setEndsAt] = useState(null)
  const [now, setNow] = useState(Date.now())
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState(null)
  const [log, setLog] = useState([])
  const [word, setWord] = useState('')
  const [selectedTileIds, setSelectedTileIds] = useState([])
  const [validating, setValidating] = useState(false)
  const playedWordsRef = useRef([])

  const pushLog = useCallback((text, kind = 'info') => {
    setLog((entries) => [...entries.slice(-40), { text, kind }])
  }, [])

  // Conexión y eventos del socket
  useEffect(() => {
    const socket = getDuelSocket()

    const onState = (state) => setDuel(state)
    const onStart = ({ duel: state, letters: grid, endsAt: end }) => {
      setDuel(state)
      setLetters(grid)
      setEndsAt(end)
      setWord('')
      setSelectedTileIds([])
      playedWordsRef.current = []
      setPhase('duel')
      pushLog('¡Comienza el duelo! Misma grilla para los dos: cada palabra golpea al rival.', 'phase')
    }
    const onHit = ({ by, byName, word: playedWord, damage, foundHiddenWord, duel: state }) => {
      setDuel(state)
      const mine = by === player?.id
      let text = mine
        ? `Tu palabra ${playedWord} le pegó ${damage} a ${opponentOf(state, player?.id)?.name ?? 'tu rival'}.`
        : `${byName} usó ${playedWord} y te pegó ${damage}.`
      if (foundHiddenWord) text = `¡PALABRA OCULTA! ${text}`
      pushLog(text, mine ? 'playerAttack' : 'enemyAttack')
    }
    const onEnd = (state) => {
      setDuel(state)
      setPhase('finished')
      pushLog('El duelo terminó.', 'end')
    }
    const onError = ({ error: message }) => setError(message)
    const onConnectError = (err) => setError(err.message || 'No se pudo conectar al servidor de duelos.')

    socket.on('duel:state', onState)
    socket.on('duel:start', onStart)
    socket.on('duel:hit', onHit)
    socket.on('duel:end', onEnd)
    socket.on('duel:error', onError)
    socket.on('connect_error', onConnectError)

    return () => {
      socket.off('duel:state', onState)
      socket.off('duel:start', onStart)
      socket.off('duel:hit', onHit)
      socket.off('duel:end', onEnd)
      socket.off('duel:error', onError)
      socket.off('connect_error', onConnectError)
      socket.emit('duel:leave')
      closeDuelSocket()
    }
  }, [player?.id, pushLog])

  // Reloj local que sigue al endsAt del server
  useEffect(() => {
    if (!endsAt || phase !== 'duel') return
    const interval = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(interval)
  }, [endsAt, phase])

  const secondsLeft = endsAt ? Math.max(0, Math.ceil((endsAt - now) / 1000)) : 0
  const you = useMemo(() => duel?.players.find((p) => p.playerId === player?.id) ?? null, [duel, player?.id])
  const rival = useMemo(() => opponentOf(duel, player?.id), [duel, player?.id])

  const handleCreate = () => {
    setError(null)
    getDuelSocket().emit('duel:create', (res) => {
      if (!res?.ok) return setError(res?.error ?? 'No se pudo crear la sala.')
      setDuel(res.duel)
      setPhase('lobby')
    })
  }

  const handleJoin = () => {
    setError(null)
    getDuelSocket().emit('duel:join', { code: joinCode }, (res) => {
      if (!res?.ok) return setError(res?.error ?? 'No se pudo entrar a la sala.')
      setDuel(res.duel)
      setPhase('lobby')
    })
  }

  const handleReady = () => {
    setError(null)
    getDuelSocket().emit('duel:ready', (res) => {
      if (!res?.ok) setError(res?.error ?? 'No se pudo marcar listo.')
    })
  }

  const handleTileClick = (tile) => {
    if (phase !== 'duel' || validating || tile.locked || selectedTileIds.includes(tile.id)) return
    setWord((current) => (current.length < 16 ? current + tile.value : current))
    setSelectedTileIds((ids) => [...ids, tile.id])
  }

  const handleClear = () => {
    setWord('')
    setSelectedTileIds([])
  }

  const handleSubmit = async (rawWord) => {
    if (phase !== 'duel' || validating) return
    setValidating(true)
    setError(null)

    try {
      // Ortografía por API (LanguageTool) + estructura contra la grilla local
      const validation = await validateWordHybrid(rawWord, letters, playedWordsRef.current)

      if (validation.retryable) {
        pushLog(`⚠ ${validation.reason}`, 'invalid')
        return
      }
      if (!validation.valid) {
        pushLog(`✗ ${validation.reason}`, 'invalid')
        return
      }

      const usableCount = letters.filter((t) => !t.locked).length
      const damage = calculateDamage(validation.word, validation.usedTiles, usableCount).total

      // El server aplica el daño (con tope), suma el bonus de palabra
      // oculta si sos el primero, y avisa a los dos por duel:hit
      getDuelSocket().emit('duel:word', { word: validation.word, damage }, (res) => {
        if (!res?.ok) {
          pushLog(`✗ ${res?.error ?? 'La palabra fue rechazada.'}`, 'invalid')
          return
        }
        playedWordsRef.current = [...playedWordsRef.current, { word: validation.word }]
      })
    } finally {
      setValidating(false)
      setWord('')
      setSelectedTileIds([])
    }
  }

  const handleExit = () => navigate('/')

  return (
    <div className="page battle-page">
      <h2 className="page-title">Duelo Multijugador</h2>

      {error && <p className="duel-error">{error}</p>}

      {phase === 'menu' && (
        <div className="duel-menu">
          <button className="btn btn-primary" onClick={handleCreate}>
            ⚔ Crear sala
          </button>
          <div className="duel-join">
            <input
              className="text-field duel-code-input"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="CÓDIGO"
              maxLength={5}
            />
            <button className="btn" onClick={handleJoin} disabled={joinCode.trim().length < 5}>
              Unirse
            </button>
          </div>
          <button className="btn btn-back" onClick={handleExit}>← Volver al menú</button>
        </div>
      )}

      {phase === 'lobby' && duel && (
        <div className="duel-lobby">
          <p className="duel-share">Compartí este código con tu rival:</p>
          <div className="room-code">{duel.code}</div>

          <ul className="lobby-players">
            {duel.players.map((p) => (
              <li key={p.playerId} className={p.ready ? 'ready' : ''}>
                <span>{p.playerId === player?.id ? `${p.name} (vos)` : p.name}</span>
                <small>{p.ready ? '✓ Listo' : 'Esperando...'}</small>
              </li>
            ))}
            {duel.players.length < 2 && (
              <li className="empty-slot"><span>Esperando rival...</span></li>
            )}
          </ul>

          <button
            className="btn btn-primary"
            onClick={handleReady}
            disabled={duel.players.length < 2 || you?.ready}
          >
            {you?.ready ? 'Esperando al rival...' : '⚔ ¡Listo para pelear!'}
          </button>
          <button className="btn btn-back" onClick={handleExit}>← Abandonar sala</button>
        </div>
      )}

      {(phase === 'duel' || phase === 'finished') && duel && (
        <>
          <div className="duel-header">
            <span className={`duel-timer ${secondsLeft <= 15 ? 'danger' : ''}`}>
              ⏱ {String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:{String(secondsLeft % 60).padStart(2, '0')}
            </span>
            {duel.hiddenWordLength && !duel.hiddenWordFoundBy && (
              <span className="duel-secret">Oculta: {'◆'.repeat(duel.hiddenWordLength)} (+35, para el primero)</span>
            )}
          </div>

          {rival && (
            <HealthBar name={rival.name} hp={rival.hp} maxHp={100} side="right" />
          )}
          {you && (
            <HealthBar name={`${you.name} (vos)`} hp={you.hp} maxHp={100} side="left" />
          )}

          {phase === 'duel' && (
            <section className="battle-console">
              <section className="letters-row">
                {letters.map((tile) => (
                  <LetterTile
                    key={tile.id}
                    tile={tile}
                    onClick={handleTileClick}
                    selected={selectedTileIds.includes(tile.id)}
                    disabled={validating}
                  />
                ))}
              </section>
              <WordInput
                value={word}
                onChange={setWord}
                onSubmit={handleSubmit}
                onClear={handleClear}
                disabled={false}
                busy={validating}
              />
            </section>
          )}

          {phase === 'finished' && (
            <div className={`result-panel ${duel.winnerId === player?.id ? 'result-victory' : 'result-defeat'}`}>
              <h2 className="result-title">
                {duel.winnerId === null ? 'EMPATE' : duel.winnerId === player?.id ? '¡VICTORIA!' : 'DERROTA'}
              </h2>
              <p className="result-scenario">
                {duel.endReason === 'ko' && 'Nocaut por palabras.'}
                {duel.endReason === 'time' && 'Se acabó el tiempo.'}
                {duel.endReason === 'abandon' && 'El rival abandonó el duelo.'}
              </p>
              <div className="result-stats">
                {duel.players.map((p) => (
                  <div className="stat" key={p.playerId}>
                    <span className="stat-value">{p.stats.damage}</span>
                    <span className="stat-label">{p.playerId === player?.id ? 'Tu daño' : `Daño de ${p.name}`}</span>
                  </div>
                ))}
              </div>
              {duel.players.some((p) => p.stats.bestWord) && (
                <p className="result-longest">
                  Mejores palabras:{' '}
                  {duel.players
                    .filter((p) => p.stats.bestWord)
                    .map((p) => `${p.name}: ${p.stats.bestWord} (${p.stats.bestDamage})`)
                    .join(' · ')}
                </p>
              )}
              <div className="result-buttons">
                <button className="btn btn-primary" onClick={handleExit}>⌂ Volver al menú</button>
              </div>
            </div>
          )}

          <div className="battle-bottom">
            <BattleLog entries={log} />
          </div>

          {phase === 'duel' && (
            <button className="btn btn-back" onClick={handleExit}>← Abandonar duelo</button>
          )}
        </>
      )}
    </div>
  )
}

function opponentOf(duel, playerId) {
  return duel?.players.find((p) => p.playerId !== playerId) ?? null
}

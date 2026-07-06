import { LETTER_DATA } from '../game/data/letters.js'

// Ficha de letra. Estados visuales: normal, bloqueada (🔒 gris),
// envenenada (verde) y maldita (violeta).

export function LetterTile({ tile, onClick, disabled }) {
  const data = LETTER_DATA[tile.value]
  const classes = ['letter-tile']
  if (tile.locked) classes.push('locked')
  if (tile.poisoned) classes.push('poisoned')
  if (tile.cursed) classes.push('cursed')
  if (data?.effect) classes.push('has-skill')

  const title = [
    `${tile.value} · ${data?.points ?? 1} pts`,
    data?.effectDesc,
    tile.locked ? `Bloqueada (${tile.lockTurns} turnos)` : null,
    tile.poisoned ? 'Envenenada: usarla daña a Kael' : null,
    tile.cursed ? 'Maldita: reduce el daño de la palabra' : null
  ]
    .filter(Boolean)
    .join(' | ')

  return (
    <button
      type="button"
      className={classes.join(' ')}
      onClick={() => onClick?.(tile)}
      disabled={disabled || tile.locked}
      title={title}
    >
      <span className="letter-value">{tile.locked ? '🔒' : tile.value}</span>
      <span className="letter-points">{data?.points ?? 1}</span>
      {tile.poisoned && <span className="letter-badge">☠</span>}
      {tile.cursed && <span className="letter-badge">✦</span>}
    </button>
  )
}

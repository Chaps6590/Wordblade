import { LETTER_DATA } from '../game/data/letters.js'
import { LetterTile } from './LetterTile.jsx'

function getPowerClass(tile) {
  const effect = tile?.effect ?? tile?.data?.effect
  switch (effect) {
    case 'heal':
    case 'shield':
      return 'power-green'
    case 'energy':
    case 'quick':
      return 'power-yellow'
    case 'burn':
    case 'poison':
    case 'bleed':
    case 'lightning':
    case 'heavy':
    case 'break':
    case 'ancestral':
      return 'power-red'
    default:
      return ''
  }
}

export function BattleBoardPanel({
  battle,
  word,
  statusMessage,
  selectedTileIds,
  onTileClick,
  playing,
  validating
}) {
  const hasWord = word.length > 0
  const selectedTiles = selectedTileIds
    .map((id) => battle.letters.find((tile) => tile.id === id))
    .filter(Boolean)

  return (
    <section className="battle-console board-container">
      {hasWord ? (
        <output className="current-word-float" aria-live="polite" aria-label={`Palabra actual: ${word}`}>
          {word.split('').map((letter, index) => {
            const tile = selectedTiles[index]
            const powerClass = getPowerClass(tile ? { ...tile, effect: LETTER_DATA[tile.value]?.effect } : null)

            return (
              <span
                key={`${letter}-${index}`}
                className={powerClass ? `current-word-letter ${powerClass}` : 'current-word-letter'}
                style={{ animationDelay: `${index * 70}ms` }}
              >
                {letter}
              </span>
            )
          })}
        </output>
      ) : null}

      {statusMessage && <p className="console-status">{statusMessage}</p>}

      <section className="letters-row letter-grid">
        {battle.letters.map((tile) => (
          <LetterTile
            key={tile.id}
            tile={tile}
            onClick={onTileClick}
            selected={selectedTileIds.includes(tile.id)}
            disabled={!playing || validating}
          />
        ))}
      </section>
    </section>
  )
}

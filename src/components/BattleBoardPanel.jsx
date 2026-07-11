import { LetterTile } from './LetterTile.jsx'

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

  return (
    <section className="battle-console board-container">
      {hasWord ? (
        <output className="current-word-float" aria-live="polite" aria-label={`Palabra actual: ${word}`}>
          {word.split('').map((letter, index) => (
            <span key={`${letter}-${index}`}>{letter}</span>
          ))}
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

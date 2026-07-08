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
      <section className={`word-board-header ${hasWord ? 'has-current-word' : ''}`}>
        <span className="word-board-label">{hasWord ? 'PALABRA ACTUAL' : 'PALABRA OCULTA'}</span>
        <strong className="word-board-value">
          {hasWord
            ? word.split('').map((letter, index) => <span key={`${letter}-${index}`}>{letter}</span>)
            : '◆'.repeat(battle.hiddenWordLength)}
        </strong>
        {!hasWord ? <small>Descubrila para sumar +35 de daño</small> : null}
      </section>

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

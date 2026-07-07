import { useState } from 'react'

// La palabra se arma exclusivamente tocando fichas. El campo es de solo
// lectura para no abrir el teclado ni permitir borrar letra por letra.

export function WordInput({ onSubmit, onClear, onSwap, disabled, busy, value, onChange, showInput = true }) {
  const [internal, setInternal] = useState('')
  const word = value ?? internal
  const setWord = onChange ?? setInternal

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!word.trim() || disabled) return
    onSubmit(word)
    setWord('')
  }

  return (
    <form className="word-input" onSubmit={handleSubmit}>
      {showInput && (
        <input
          type="text"
          value={word}
          readOnly
          inputMode="none"
          onFocus={(event) => event.currentTarget.blur()}
          placeholder="Tocá las letras..."
          disabled={disabled}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={16}
          aria-label="Palabra formada con las fichas"
        />
      )}
      <button
        type="button"
        className="btn clear-btn"
        onClick={onClear}
        disabled={disabled || busy || !word.trim()}
      >
        ✕ BORRAR
      </button>
      {onSwap && (
        <button
          type="button"
          className="btn swap-btn"
          onClick={onSwap}
          disabled={disabled || busy}
          title="Genera una grilla nueva con la API. Cuesta el turno: el enemigo ataca."
        >
          ♻ CAMBIAR
        </button>
      )}
      <button type="submit" className="btn attack-btn" disabled={disabled || busy || !word.trim()}>
        {busy ? '⏳ VALIDANDO...' : '⚔ ATACAR'}
      </button>
    </form>
  )
}

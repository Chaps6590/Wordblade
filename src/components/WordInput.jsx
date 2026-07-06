import { useState } from 'react'

// Input de palabra + botón Atacar. También expone appendLetter para
// que las fichas clickeadas agreguen su letra.

export function WordInput({ onSubmit, disabled, busy, value, onChange }) {
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
      <input
        type="text"
        value={word}
        onChange={(e) => setWord(e.target.value.toUpperCase())}
        placeholder="Escribí una palabra..."
        disabled={disabled}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        maxLength={12}
      />
      <button type="submit" className="btn attack-btn" disabled={disabled || busy || !word.trim()}>
        {busy ? '⏳ VALIDANDO...' : '⚔ ATACAR'}
      </button>
    </form>
  )
}

// Utilidades de debug para desarrollo. Muestra en consola las palabras
// que devolvió la API y cómo quedaron escondidas en la grilla.
//
// Se activa automáticamente en dev (npm run dev). En producción se puede
// activar a mano desde la consola del navegador:
//   localStorage.setItem('wordblade-debug', '1')   // activar
//   localStorage.removeItem('wordblade-debug')     // desactivar

export function isDebugEnabled() {
  if (import.meta.env?.DEV) return true
  try {
    return localStorage.getItem('wordblade-debug') === '1'
  } catch {
    return false
  }
}

function tileLabel(tile) {
  let label = tile.value
  if (tile.devoured) label = '✕'
  else if (tile.locked) label += '🔒'
  if (tile.poisoned) label += '☠'
  if (tile.cursed) label += '✦'
  if (tile.bonusDamage > 0) label += `(+${tile.bonusDamage})`
  return label
}

export function logBattleDebug(battle, label = 'Grilla') {
  if (!isDebugEnabled() || !battle) return

  const rows = []
  for (let i = 0; i < battle.letters.length; i += 4) {
    rows.push(battle.letters.slice(i, i + 4).map(tileLabel).join('  '))
  }

  console.groupCollapsed(`🗡 [Wordblade DEBUG] ${label} — oculta: ${battle.hiddenWord}`)
  console.log('Estrategia:', battle.generationStrategy)
  console.log('Palabras que devolvió la API:', battle.challengeWords.join(', '))
  console.log(`Palabra oculta (+35 daño): ${battle.hiddenWord}`)
  if (battle.supportWord) console.log(`Palabra de apoyo (también en la grilla): ${battle.supportWord}`)
  console.log('Grilla 4x4:\n' + rows.map((r) => '  ' + r).join('\n'))
  console.groupEnd()
}

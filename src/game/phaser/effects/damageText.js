// Texto flotante de daño / curación sobre un punto de la escena.

export function showFloatingText(scene, x, y, text, { color = '#ff5555', fontSize = 24 } = {}) {
  // La escena pudo haberse destruido (desmontar la página, o el doble montaje
  // de React en dev): sin sistemas activos `scene.add`/`scene.tweens` son null.
  if (!scene?.sys?.isActive() || !scene.add || !scene.tweens) return

  const label = scene.add
    .text(x, y, text, {
      fontFamily: 'monospace',
      fontSize: `${fontSize}px`,
      color,
      stroke: '#000000',
      strokeThickness: 4
    })
    .setOrigin(0.5)
    .setDepth(100)

  scene.tweens.add({
    targets: label,
    y: y - 50,
    alpha: 0,
    duration: 900,
    ease: 'Cubic.easeOut',
    onComplete: () => label.destroy()
  })
}

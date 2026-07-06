// Texto flotante de daño / curación sobre un punto de la escena.

export function showFloatingText(scene, x, y, text, { color = '#ff5555', fontSize = 24 } = {}) {
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

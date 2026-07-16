// Texto flotante de daño / curación sobre un punto de la escena.

export function showFloatingText(scene, x, y, text, {
  color = '#ff5555',
  fontSize = 24,
  duration = 900,
  lift = 50,
  bubble = false,
  bubbleColor = 0xffffff,
  bubbleAlpha = 0.92,
  bubbleStroke = 0x1b1030
} = {}) {
  // La escena pudo haberse destruido (desmontar la página, o el doble montaje
  // de React en dev): sin sistemas activos `scene.add`/`scene.tweens` son null.
  if (!scene?.sys?.isActive() || !scene.add || !scene.tweens) return

  const label = scene.add
    .text(x, y, text, {
      fontFamily: 'monospace',
      fontSize: `${fontSize}px`,
      color,
      stroke: '#000000',
      strokeThickness: bubble ? 0 : 4,
      align: 'center',
      wordWrap: bubble ? { width: 270 } : undefined
    })
    .setOrigin(0.5)
    .setDepth(101)

  let target = label

  if (bubble) {
    const paddingX = 18
    const paddingY = 10
    const tailHeight = 10
    const width = label.width + paddingX * 2
    const height = label.height + paddingY * 2
    const bubbleBox = scene.add
      .graphics()
      .fillStyle(bubbleColor, bubbleAlpha)
      .fillRoundedRect(-width / 2, -height / 2, width, height, 12)
      .fillTriangle(-12, height / 2 - 1, 12, height / 2 - 1, 0, height / 2 + tailHeight)
      .lineStyle(2, bubbleStroke, 0.62)
      .strokeRoundedRect(-width / 2, -height / 2, width, height, 12)

    const group = scene.add.container(x, y, [bubbleBox, label.setPosition(0, 0)])
      .setDepth(104)
      .setScale(0.92)

    target = group
    scene.tweens.add({
      targets: group,
      scale: 1,
      duration: 130,
      ease: 'Back.easeOut'
    })
  }

  scene.tweens.add({
    targets: target,
    y: y - lift,
    alpha: 0,
    duration,
    delay: bubble ? 420 : 0,
    ease: 'Cubic.easeOut',
    onComplete: () => target.destroy()
  })
}

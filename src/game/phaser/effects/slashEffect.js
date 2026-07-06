import Phaser from 'phaser'

// Efecto de tajo de espada: una línea blanca diagonal que aparece y se desvanece.

export function showSlash(scene, x, y, { color = 0xffffff } = {}) {
  const slash = scene.add.graphics().setDepth(90)
  slash.lineStyle(4, color, 1)
  slash.beginPath()
  slash.moveTo(-30, -30)
  slash.lineTo(30, 30)
  slash.strokePath()
  slash.setPosition(x, y)
  slash.setRotation(Phaser.Math.FloatBetween(-0.4, 0.4))

  scene.tweens.add({
    targets: slash,
    alpha: 0,
    scaleX: 1.6,
    scaleY: 1.6,
    duration: 250,
    onComplete: () => slash.destroy()
  })
}

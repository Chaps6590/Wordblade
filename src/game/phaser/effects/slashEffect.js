import Phaser from 'phaser'

// Efecto de tajo de espada: una línea blanca diagonal que aparece y se desvanece.

export function showSlash(scene, x, y, { color = 0xffffff, intensity = 1 } = {}) {
  const slash = scene.add.graphics().setDepth(90)
  const width = 4 + Math.max(0, intensity - 1) * 2
  slash.lineStyle(width, color, 1)
  slash.beginPath()
  slash.moveTo(-30, -30)
  slash.lineTo(30, 30)
  slash.strokePath()
  slash.lineStyle(Math.max(2, width - 2), 0xffffff, 0.62)
  slash.beginPath()
  slash.moveTo(-22, -34)
  slash.lineTo(22, 34)
  slash.strokePath()
  slash.setPosition(x, y)
  slash.setRotation(Phaser.Math.FloatBetween(-0.4, 0.4))

  scene.tweens.add({
    targets: slash,
    alpha: 0,
    scaleX: 1.6 + intensity * 0.18,
    scaleY: 1.6 + intensity * 0.18,
    duration: 250 + intensity * 35,
    onComplete: () => slash.destroy()
  })
}

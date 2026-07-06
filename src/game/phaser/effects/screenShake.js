// Shake de cámara para golpes fuertes.

export function screenShake(scene, { intensity = 0.01, duration = 200 } = {}) {
  scene.cameras.main.shake(duration, intensity)
}

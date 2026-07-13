export function getAnimationFrameSequence(animation) {
  const frameCount = animation?.frames ?? 1
  if (!Array.isArray(animation?.frameSequence) || animation.frameSequence.length === 0) {
    return null
  }

  const sequence = animation.frameSequence
    .map((frame) => Number(frame))
    .filter((frame) => Number.isInteger(frame) && frame >= 0 && frame < frameCount)

  return sequence.length > 0 ? sequence : null
}

export function getAnimationFrameDurationMs(animation) {
  if (Number.isFinite(animation?.frameDurationMs) && animation.frameDurationMs > 0) {
    return animation.frameDurationMs
  }

  const frameRate = animation?.frameRate ?? 6
  return 1000 / frameRate
}

export function getAnimationFramePositionPercent(animation, frame) {
  const frameCount = animation?.frames ?? 1
  if (frameCount <= 1) return 0
  return (frame / (frameCount - 1)) * 100
}

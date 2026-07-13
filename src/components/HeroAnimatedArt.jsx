import { useEffect, useMemo, useState } from 'react'
import { getAnimationFrameDurationMs, getAnimationFrameSequence } from '../game/animationTiming.js'

export function HeroAnimatedArt({ hero, className = '', alt = '', scale }) {
  const idle = hero?.animations?.idle
  const frameCount = idle?.frames ?? 1
  const frameRate = idle?.frameRate ?? 6
  const frameSequence = useMemo(() => getAnimationFrameSequence(idle), [idle])
  const [sequenceStep, setSequenceStep] = useState(0)
  const artScale = scale ?? hero?.artScale ?? 1
  const currentFrame = frameSequence?.[sequenceStep % frameSequence.length] ?? 0

  useEffect(() => {
    setSequenceStep(0)
  }, [idle?.sheet])

  useEffect(() => {
    if (!frameSequence || frameSequence.length <= 1) return undefined

    const interval = window.setInterval(() => {
      setSequenceStep((step) => (step + 1) % frameSequence.length)
    }, getAnimationFrameDurationMs(idle))

    return () => window.clearInterval(interval)
  }, [frameSequence, idle])

  if (!idle?.sheet) {
    return <img className={className} src={hero?.portrait} alt={alt || hero?.name || ''} />
  }

  const style = {
    '--hero-sheet': `url(${idle.sheet})`,
    '--hero-frame-aspect': idle.frameWidth / idle.frameHeight,
    '--hero-frame-width': `${idle.frameWidth}px`,
    '--hero-frame-height': `${idle.frameHeight}px`,
    '--hero-frame-count': frameCount,
    '--hero-step-count': Math.max(frameCount - 1, 1),
    '--hero-sheet-width': `${frameCount * 100}%`,
    '--hero-last-frame-translate': `${((frameCount - 1) / frameCount) * 100}%`,
    '--hero-current-frame-translate': `${(currentFrame / frameCount) * 100}%`,
    '--hero-animation-duration': `${frameCount / frameRate}s`,
    '--hero-art-scale': artScale,
    '--hero-art-scale-lift': artScale * 1.012
  }
  const classes = [
    'hero-animated-art',
    frameSequence ? 'is-sequenced' : '',
    className
  ].filter(Boolean).join(' ')

  return (
    <span
      className={classes}
      style={style}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : 'true'}
    >
      <span className="hero-animated-art__sheet" aria-hidden="true" />
    </span>
  )
}

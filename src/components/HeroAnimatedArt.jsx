export function HeroAnimatedArt({ hero, className = '', alt = '', scale }) {
  if (!hero?.animations?.idle?.sheet) {
    return <img className={className} src={hero?.portrait} alt={alt || hero?.name || ''} />
  }

  const { idle } = hero.animations
  const frameCount = idle.frames ?? 1
  const frameRate = idle.frameRate ?? 6
  const artScale = scale ?? hero.artScale ?? 1
  const style = {
    '--hero-sheet': `url(${idle.sheet})`,
    '--hero-frame-aspect': idle.frameWidth / idle.frameHeight,
    '--hero-frame-width': `${idle.frameWidth}px`,
    '--hero-frame-height': `${idle.frameHeight}px`,
    '--hero-frame-count': frameCount,
    '--hero-step-count': Math.max(frameCount - 1, 1),
    '--hero-sheet-width': `${frameCount * 100}%`,
    '--hero-last-frame-translate': `${((frameCount - 1) / frameCount) * 100}%`,
    '--hero-animation-duration': `${frameCount / frameRate}s`,
    '--hero-art-scale': artScale,
    '--hero-art-scale-lift': artScale * 1.012
  }

  return (
    <span
      className={`hero-animated-art ${className}`.trim()}
      style={style}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : 'true'}
    >
      <span className="hero-animated-art__sheet" aria-hidden="true" />
    </span>
  )
}

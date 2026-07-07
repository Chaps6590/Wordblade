export function HeroAnimatedArt({ hero, className = '', alt = '' }) {
  if (!hero?.animations?.idle?.sheet) {
    return <img className={className} src={hero?.portrait} alt={alt || hero?.name || ''} />
  }

  const { idle } = hero.animations
  const frameCount = idle.frames ?? 1
  const style = {
    '--hero-sheet': `url(${idle.sheet})`,
    '--hero-frame-width': `${idle.frameWidth}px`,
    '--hero-frame-height': `${idle.frameHeight}px`,
    '--hero-frame-count': frameCount,
    '--hero-step-count': Math.max(frameCount - 1, 1),
    '--hero-sheet-width': `${frameCount * 100}%`,
    '--hero-last-frame-translate': `${((frameCount - 1) / frameCount) * 100}%`
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

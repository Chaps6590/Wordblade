import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HEROES } from '../game/data/heroes.js'

export function FramesPage() {
  const navigate = useNavigate()
  const heroes = useMemo(() => HEROES.filter((hero) => hero.animations), [])
  const [heroRace, setHeroRace] = useState(heroes[0]?.race)
  const hero = heroes.find((candidate) => candidate.race === heroRace) ?? heroes[0]
  const animationEntries = Object.entries(hero?.animations ?? {})
  const [animationName, setAnimationName] = useState(animationEntries[0]?.[0])
  const [previewRun, setPreviewRun] = useState(0)
  const animation = hero?.animations?.[animationName] ?? animationEntries[0]?.[1]
  const activeName = hero?.animations?.[animationName] ? animationName : animationEntries[0]?.[0]

  function selectHero(race) {
    const nextHero = heroes.find((candidate) => candidate.race === race)
    setHeroRace(race)
    setAnimationName(Object.keys(nextHero?.animations ?? {})[0])
    setPreviewRun((run) => run + 1)
  }

  function selectAnimation(name) {
    setAnimationName(name)
    setPreviewRun((run) => run + 1)
  }

  if (!hero || !animation) {
    return (
      <main className="frames-page">
        <p>No hay animaciones configuradas.</p>
        <button className="btn" onClick={() => navigate('/')}>Volver</button>
      </main>
    )
  }

  return (
    <main className="frames-page">
      <div className="frames-stage-bg" aria-hidden="true" />
      <header className="frames-header">
        <button className="btn frames-back" type="button" onClick={() => navigate('/')}>
          ← Menú
        </button>
        <div className="frames-heading">
          <h1>Laboratorio de Frames</h1>
          <p>{hero.name} · {labelAnimation(activeName)}</p>
        </div>
        <div className="frames-metadata">
          <span>{animation.frames} frames</span>
          <span>{animation.frameWidth}×{animation.frameHeight}</span>
          <span>{animation.frameRate} fps</span>
        </div>
      </header>

      <section className="frames-character-stage" aria-label={`Vista previa de ${hero.name}`}>
        <AnimatedSheet
          key={`${hero.race}-${activeName}-${previewRun}`}
          animation={animation}
          label={`${hero.name}: ${activeName}`}
        />
        <span className="frames-ground-shadow" aria-hidden="true" />
        <button
          className="btn frames-replay"
          type="button"
          onClick={() => setPreviewRun((run) => run + 1)}
        >
          ↻ Repetir {labelAnimation(activeName)}
        </button>
      </section>

      <aside className="frames-controls">
        <section>
          <h2>Héroes</h2>
          <div className="frames-choice-list">
            {heroes.map((candidate) => (
              <button
                key={candidate.race}
                className={candidate.race === hero.race ? 'is-active' : ''}
                type="button"
                onClick={() => selectHero(candidate.race)}
              >
                {candidate.name}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2>Animaciones</h2>
          <div className="frames-choice-list frames-animation-list">
            {animationEntries.map(([name, definition]) => (
              <button
                key={name}
                className={name === activeName ? 'is-active' : ''}
                type="button"
                onClick={() => selectAnimation(name)}
              >
                <strong>{labelAnimation(name)}</strong>
                <small>{definition.frames}f · {definition.frameRate}fps</small>
              </button>
            ))}
          </div>
        </section>
      </aside>

      <section className="frames-strip-panel" aria-label="Frames individuales">
        <h2>{labelAnimation(activeName)} — frames individuales</h2>
        <div className="frames-strip">
          {Array.from({ length: animation.frames }, (_, index) => (
            <figure key={index}>
              <FrameCell animation={animation} index={index} />
              <figcaption>{index + 1}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </main>
  )
}

function AnimatedSheet({ animation, label }) {
  const frames = animation.frames ?? 1
  const frameRate = animation.frameRate ?? 6
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    if (frames <= 1) return undefined

    let current = 0
    let direction = 1
    const interval = window.setInterval(() => {
      if (animation.yoyo) {
        if (current >= frames - 1) direction = -1
        if (current <= 0) direction = 1
        current += direction
      } else {
        current = (current + 1) % frames
      }
      setFrame(current)
    }, 1000 / frameRate)

    return () => window.clearInterval(interval)
  }, [animation.yoyo, frameRate, frames])

  const position = frames <= 1 ? 0 : (frame / (frames - 1)) * 100
  const style = {
    '--preview-sheet': `url(${animation.sheet})`,
    '--preview-aspect': animation.frameWidth / animation.frameHeight,
    '--preview-sheet-size': `${frames * 100}% 100%`,
    '--preview-position': `${position}% 0%`
  }

  return (
    <div
      className="frames-animation-preview"
      style={style}
      role="img"
      aria-label={`${label}, frame ${frame + 1} de ${frames}`}
    >
      <span />
      <strong className="frames-live-counter">{frame + 1}/{frames}</strong>
    </div>
  )
}

function FrameCell({ animation, index }) {
  const frames = animation.frames ?? 1
  const position = frames <= 1 ? 0 : (index / (frames - 1)) * 100
  return (
    <span
      className="frame-cell"
      style={{
        '--frame-image': `url(${animation.sheet})`,
        '--frame-sheet-size': `${frames * 100}% 100%`,
        '--frame-position': `${position}% 0%`,
        '--frame-aspect': animation.frameWidth / animation.frameHeight
      }}
    />
  )
}

function labelAnimation(name) {
  return String(name)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (letter) => letter.toUpperCase())
}

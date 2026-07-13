import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAnimationFrameDurationMs, getAnimationFramePositionPercent, getAnimationFrameSequence } from '../game/animationTiming.js'
import { HEROES } from '../game/data/heroes.js'

const LAB_COMBO_KEY = 'idleLaboratoryCombo'

export function FramesPage() {
  const navigate = useNavigate()
  const heroes = useMemo(() => HEROES.filter((hero) => hero.animations), [])
  const [heroRace, setHeroRace] = useState(heroes[0]?.race)
  const hero = heroes.find((candidate) => candidate.race === heroRace) ?? heroes[0]
  const labEntries = useMemo(() => buildFrameLabEntries(hero), [hero])
  const [animationName, setAnimationName] = useState(labEntries[0]?.[0])
  const [previewRun, setPreviewRun] = useState(0)
  const animation = labEntries.find(([name]) => name === animationName)?.[1] ?? labEntries[0]?.[1]
  const activeName = labEntries.find(([name]) => name === animationName)?.[0] ?? labEntries[0]?.[0]

  function selectHero(race) {
    const nextHero = heroes.find((candidate) => candidate.race === race)
    const nextEntries = buildFrameLabEntries(nextHero)
    setHeroRace(race)
    setAnimationName(nextEntries[0]?.[0])
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
          {getMetadataBadges(animation).map((badge) => (
            <span key={badge}>{badge}</span>
          ))}
        </div>
      </header>

      <section className="frames-character-stage" aria-label={`Vista previa de ${hero.name}`}>
        <FrameLabPreview
          key={`${hero.race}-${activeName}-${previewRun}`}
          animation={animation}
          label={`${hero.name}: ${labelAnimation(activeName)}`}
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
            {labEntries.map(([name, definition]) => (
              <button
                key={name}
                className={name === activeName ? 'is-active' : ''}
                type="button"
                onClick={() => selectAnimation(name)}
              >
                <strong>{labelAnimation(name)}</strong>
                <small>{formatAnimationSummary(definition)}</small>
              </button>
            ))}
          </div>
        </section>

        <AnimationSpecs animation={animation} name={activeName} />
      </aside>

      <section className="frames-strip-panel" aria-label="Frames individuales">
        <h2>{labelAnimation(activeName)} — frames individuales</h2>
        <FrameStrip animation={animation} />
      </section>
    </main>
  )
}

function buildFrameLabEntries(hero) {
  const entries = Object.entries(hero?.animations ?? {})
  const combo = buildIdleLabCombo(hero)
  return combo ? [...entries, [LAB_COMBO_KEY, combo]] : entries
}

function buildIdleLabCombo(hero) {
  const animations = hero?.animations
  const base = animations?.idle
  const casualGuard = animations?.idleCasualGuard
  const casualRead = animations?.idleCasualRead
  if (!base || !casualGuard || !casualRead) return null

  return {
    type: 'combo',
    frameWidth: base.frameWidth,
    frameHeight: base.frameHeight,
    frames: base.frames,
    frameRate: base.frameRate,
    segments: [
      { key: 'idle', label: 'Base', animation: base },
      { key: 'idleCasualGuard', label: 'Casual guard', animation: casualGuard },
      { key: 'idle', label: 'Base', animation: base },
      { key: 'idleCasualRead', label: 'Casual read', animation: casualRead }
    ]
  }
}

function FrameLabPreview({ animation, label }) {
  const timeline = useMemo(() => getPreviewTimeline(animation, label), [animation, label])
  const [step, setStep] = useState(timeline[0] ?? null)

  useEffect(() => {
    if (timeline.length === 0) return undefined

    let index = 0
    let timeoutId
    let cancelled = false

    function showNextStep() {
      const current = timeline[index]
      setStep(current)
      timeoutId = window.setTimeout(() => {
        if (cancelled) return
        index = (index + 1) % timeline.length
        showNextStep()
      }, current.durationMs)
    }

    showNextStep()

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [timeline])

  if (!step) return null

  const position = getAnimationFramePositionPercent(step.animation, step.frame)
  const frames = step.animation.frames ?? 1
  const style = {
    '--preview-sheet': `url(${step.animation.sheet})`,
    '--preview-aspect': step.animation.frameWidth / step.animation.frameHeight,
    '--preview-sheet-size': `${frames * 100}% 100%`,
    '--preview-position': `${position}% 0%`
  }

  return (
    <div
      className="frames-animation-preview"
      style={style}
      role="img"
      aria-label={`${label}, ${step.label}, frame ${step.frame + 1} de ${frames}`}
    >
      <span />
      <strong className="frames-live-counter">
        {step.label} {step.frame + 1}/{frames}
      </strong>
    </div>
  )
}

function getPreviewTimeline(animation, label = 'Animacion') {
  if (animation?.type === 'combo') {
    return animation.segments.flatMap((segment) => (
      buildAnimationTimeline(segment.animation, segment.label)
    ))
  }

  return buildAnimationTimeline(animation, label)
}

function buildAnimationTimeline(animation, label) {
  const frames = animation?.frames ?? 1
  const durationMs = getAnimationFrameDurationMs(animation)
  const sequence = getAnimationFrameSequence(animation) ?? getDefaultFrameSequence(animation)

  return sequence
    .filter((frame) => frame >= 0 && frame < frames)
    .map((frame) => ({
      animation,
      frame,
      label,
      durationMs
    }))
}

function getDefaultFrameSequence(animation) {
  const frames = animation?.frames ?? 1
  const forward = Array.from({ length: frames }, (_, index) => index)
  if (!animation?.yoyo || frames <= 2) return forward
  return [...forward, ...forward.slice(1, -1).reverse()]
}

function FrameStrip({ animation }) {
  if (animation?.type === 'combo') {
    return (
      <div className="frames-strip-combo">
        {animation.segments.map((segment, segmentIndex) => (
          <section className="frames-strip-group" key={`${segment.key}-${segmentIndex}`}>
            <h3>{segment.label}</h3>
            <div className="frames-strip">
              {Array.from({ length: segment.animation.frames }, (_, index) => (
                <figure key={index}>
                  <FrameCell animation={segment.animation} index={index} />
                  <figcaption>{index + 1}</figcaption>
                </figure>
              ))}
            </div>
          </section>
        ))}
      </div>
    )
  }

  return (
    <div className="frames-strip">
      {Array.from({ length: animation.frames }, (_, index) => (
        <figure key={index}>
          <FrameCell animation={animation} index={index} />
          <figcaption>{index + 1}</figcaption>
        </figure>
      ))}
    </div>
  )
}

function FrameCell({ animation, index }) {
  const frames = animation.frames ?? 1
  const position = getAnimationFramePositionPercent(animation, index)
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

function AnimationSpecs({ animation, name }) {
  const rows = animation?.type === 'combo'
    ? getComboSpecRows(animation)
    : getSingleSpecRows(animation)

  return (
    <section className="frames-spec-panel">
      <h2>Specs</h2>
      <dl>
        <div>
          <dt>Vista</dt>
          <dd>{labelAnimation(name)}</dd>
        </div>
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function getSingleSpecRows(animation) {
  const sequence = getAnimationFrameSequence(animation)
  const duration = Math.round(getAnimationFrameDurationMs(animation))
  const sequenceText = sequence
    ? sequence.map((frame) => frame + 1).join(' -> ')
    : animation?.yoyo ? '1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 5 -> 4 -> 3 -> 2' : '1 -> 2 -> 3 -> 4 -> 5 -> 6'

  return [
    ['Sheet', getFileName(animation?.sheet)],
    ['Frame', `${animation?.frameWidth}x${animation?.frameHeight}`],
    ['Total', `${(animation?.frameWidth ?? 0) * (animation?.frames ?? 0)}x${animation?.frameHeight}`],
    ['Timing', `${duration}ms / frame`],
    ['Loop', sequenceText]
  ]
}

function getComboSpecRows(animation) {
  const labels = animation.segments.map((segment) => segment.label).join(' -> ')
  const sheets = [...new Set(animation.segments.map((segment) => getFileName(segment.animation.sheet)))].join(', ')
  const totalSteps = getPreviewTimeline(animation).length

  return [
    ['Orden', labels],
    ['Sheets', sheets],
    ['Frame', `${animation.frameWidth}x${animation.frameHeight}`],
    ['Steps', String(totalSteps)],
    ['Loop', 'Base -> casual -> base -> casual']
  ]
}

function getMetadataBadges(animation) {
  if (animation?.type === 'combo') {
    return [
      `${animation.segments.length} bloques`,
      `${animation.frameWidth}×${animation.frameHeight}`,
      `${getPreviewTimeline(animation).length} steps`
    ]
  }

  return [
    `${animation.frames} frames`,
    `${animation.frameWidth}×${animation.frameHeight}`,
    `${animation.frameRate} fps`
  ]
}

function formatAnimationSummary(animation) {
  if (animation?.type === 'combo') {
    return `${animation.segments.length} bloques`
  }

  return `${animation.frames}f · ${animation.frameRate}fps`
}

function getFileName(path) {
  return String(path ?? '').split('/').pop()
}

function labelAnimation(name) {
  if (name === LAB_COMBO_KEY) return 'Combo laboratorio'

  return String(name)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (letter) => letter.toUpperCase())
}

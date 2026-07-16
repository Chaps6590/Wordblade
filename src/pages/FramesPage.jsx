import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAnimationFrameDurationMs, getAnimationFrameSequence } from '../game/animationTiming.js'
import { ENEMIES } from '../game/data/enemies.js'
import { HEROES } from '../game/data/heroes.js'

const ASSET_VERSION = import.meta.env.VITE_APP_COMMIT || 'dev'

export function FramesPage() {
  const navigate = useNavigate()
  const actors = getAnimatedActors()
  const [actorId, setActorId] = useState(actors[0]?.id)
  const actor = actors.find((candidate) => candidate.id === actorId) ?? actors[0]
  const labEntries = useMemo(() => Object.entries(actor?.animations ?? {}), [actor])
  const [animationName, setAnimationName] = useState(labEntries[0]?.[0])
  const [previewRun, setPreviewRun] = useState(0)
  const animation = labEntries.find(([name]) => name === animationName)?.[1] ?? labEntries[0]?.[1]
  const activeName = labEntries.find(([name]) => name === animationName)?.[0] ?? labEntries[0]?.[0]
  const sheetState = usePreloadedSheet(animation?.sheet, `${actor?.id}-${activeName}-${previewRun}`)

  function selectActor(id) {
    const nextActor = actors.find((candidate) => candidate.id === id)
    const nextEntries = Object.entries(nextActor?.animations ?? {})
    setActorId(id)
    setAnimationName(nextEntries[0]?.[0])
    setPreviewRun((run) => run + 1)
  }

  function selectAnimation(name) {
    setAnimationName(name)
    setPreviewRun((run) => run + 1)
  }

  if (!actor || !animation) {
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
          <p>{actor.name} · {getAnimationLabel(activeName, animation)}</p>
        </div>
        <div className="frames-metadata">
          {getMetadataBadges(animation).map((badge) => (
            <span key={badge}>{badge}</span>
          ))}
        </div>
      </header>

      <section
        className={`frames-character-stage frames-character-stage--${actor.kind}`}
        aria-label={`Vista previa de ${actor.name}`}
      >
        <FrameLabPreview
          key={`${actor.id}-${activeName}-${previewRun}`}
          animation={animation}
          label={`${actor.name}: ${getAnimationLabel(activeName, animation)}`}
          sheetState={sheetState}
        />
        <span className="frames-ground-shadow" aria-hidden="true" />
        <button
          className="btn frames-replay"
          type="button"
          onClick={() => setPreviewRun((run) => run + 1)}
        >
          ↻ Repetir {getAnimationLabel(activeName, animation)}
        </button>
      </section>

      <aside className="frames-controls">
        <section>
          <h2>Personajes</h2>
          <div className="frames-choice-list">
            {actors.map((candidate) => (
              <button
                key={candidate.id}
                className={candidate.id === actor.id ? 'is-active' : ''}
                type="button"
                onClick={() => selectActor(candidate.id)}
              >
                <strong>{candidate.name}</strong>
                <small>{candidate.kindLabel}</small>
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
                <strong>{getAnimationLabel(name, definition)}</strong>
                <small>{formatAnimationSummary(definition)}</small>
              </button>
            ))}
          </div>
        </section>

        <AnimationSpecs animation={animation} name={activeName} />
      </aside>

      <section className="frames-strip-panel" aria-label="Frames individuales">
        <h2>{getAnimationLabel(activeName, animation)} — frames individuales</h2>
        <FrameStrip animation={animation} sheetUrl={sheetState.url} />
      </section>
    </main>
  )
}

function getAnimatedActors() {
  const heroes = HEROES
    .filter((hero) => hero.animations)
    .map((hero) => ({
      id: `hero:${hero.race}`,
      name: hero.name,
      kind: 'hero',
      kindLabel: `Héroe · ${hero.raceLabel}`,
      animations: hero.animations
    }))

  const enemies = Object.values(ENEMIES)
    .filter((enemy) => enemy.animations)
    .map((enemy) => ({
      id: `enemy:${enemy.id}`,
      name: enemy.name,
      kind: 'enemy',
      kindLabel: 'Enemigo',
      animations: enemy.animations
    }))

  return [...heroes, ...enemies]
}

function usePreloadedSheet(path, cacheScope) {
  const [sheetState, setSheetState] = useState(() => ({
    status: path ? 'loading' : 'missing',
    url: path ? versionedAssetUrl(path, `${ASSET_VERSION}-initial`) : '',
    path
  }))

  useEffect(() => {
    if (!path) {
      setSheetState({ status: 'missing', url: '', path })
      return undefined
    }

    const url = versionedAssetUrl(path, `${ASSET_VERSION}-${cacheScope}-${Date.now()}`)
    let cancelled = false
    const image = new Image()

    setSheetState({ status: 'loading', url, path })

    image.onload = () => {
      if (!cancelled) setSheetState({ status: 'loaded', url, path })
    }
    image.onerror = () => {
      if (!cancelled) setSheetState({ status: 'error', url, path })
    }
    image.src = url

    return () => {
      cancelled = true
      image.onload = null
      image.onerror = null
    }
  }, [path, cacheScope])

  if (sheetState.path !== path) {
    return {
      status: path ? 'loading' : 'missing',
      url: path ? versionedAssetUrl(path, `${ASSET_VERSION}-${cacheScope}`) : '',
      path
    }
  }

  return sheetState
}

function FrameLabPreview({ animation, label, sheetState }) {
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
  if (sheetState.status === 'error' || sheetState.status === 'missing') {
    return (
      <div className="frames-animation-preview frames-animation-preview--message" role="status">
        <span>No carga {getFileName(sheetState.path ?? animation.sheet)}</span>
      </div>
    )
  }

  const frames = step.animation.frames ?? 1
  const style = {
    '--preview-aspect': step.animation.frameWidth / step.animation.frameHeight
  }
  const spriteStyle = getSpriteSheetStyle(step.animation, step.frame)

  return (
    <div
      className={`frames-animation-preview ${sheetState.status === 'loading' ? 'is-loading' : ''}`}
      style={style}
      role="img"
      aria-label={`${label}, ${step.label}, frame ${step.frame + 1} de ${frames}`}
    >
      <span className="frames-sprite-viewport" aria-hidden="true">
        <img
          className="frames-sprite-sheet"
          src={sheetState.url}
          alt=""
          draggable="false"
          style={spriteStyle}
        />
      </span>
      <strong className="frames-live-counter">
        {step.label} {step.frame + 1}/{frames}
      </strong>
    </div>
  )
}

function getPreviewTimeline(animation, label = 'Animacion') {
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

function FrameStrip({ animation, sheetUrl }) {
  return (
    <div className="frames-strip">
      {Array.from({ length: animation.frames }, (_, index) => (
        <figure key={index}>
          <FrameCell animation={animation} index={index} sheetUrl={sheetUrl} />
          <figcaption>{index + 1}</figcaption>
        </figure>
      ))}
    </div>
  )
}

function FrameCell({ animation, index, sheetUrl }) {
  const spriteStyle = getSpriteSheetStyle(animation, index)

  return (
    <span className="frame-cell" style={{ '--frame-aspect': animation.frameWidth / animation.frameHeight }}>
      <img
        className="frames-sprite-sheet"
        src={sheetUrl || versionedAssetUrl(animation.sheet)}
        alt=""
        draggable="false"
        style={spriteStyle}
      />
    </span>
  )
}

function getSpriteSheetStyle(animation, frame) {
  const frames = animation.frames ?? 1
  const safeFrame = Math.min(Math.max(frame, 0), frames - 1)

  return {
    width: `${frames * 100}%`,
    left: `${safeFrame * -100}%`
  }
}

function AnimationSpecs({ animation, name }) {
  const rows = getSingleSpecRows(animation)

  return (
    <section className="frames-spec-panel">
      <h2>Specs</h2>
      <dl>
        <div>
          <dt>Vista</dt>
          <dd>{getAnimationLabel(name, animation)}</dd>
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

function getMetadataBadges(animation) {
  return [
    `${animation.frames} frames`,
    `${animation.frameWidth}×${animation.frameHeight}`,
    `${animation.frameRate} fps`
  ]
}

function formatAnimationSummary(animation) {
  return `${animation.frames}f · ${animation.frameRate}fps`
}

function getFileName(path) {
  return String(path ?? '').split('/').pop()
}

function versionedAssetUrl(path, version = ASSET_VERSION) {
  const separator = String(path).includes('?') ? '&' : '?'
  return `${path}${separator}v=${encodeURIComponent(version)}`
}

function labelAnimation(name) {
  return String(name)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (letter) => letter.toUpperCase())
}

function getAnimationLabel(name, animation) {
  return animation?.label ?? labelAnimation(name)
}

import { HealthBar } from './HealthBar.jsx'
import { TimerBar } from './TimerBar.jsx'
import { ENEMIES } from '../game/data/enemies.js'
import { HERO_BY_RACE } from '../game/data/heroes.js'

const EMPTY_STATUS_SLOTS = 3

export function TopHud({ battle, scenario }) {
  const hero = HERO_BY_RACE.LOBO
  const enemyDef = ENEMIES[battle.enemy.id]
  const playerLevel = battle.player.level ?? scenario.wordDifficulty
  const enemyLevel = battle.enemy.level ?? ((battle.encounterIndex ?? 0) + 1)

  return (
    <header className="top-hud battle-header" aria-label="Estado de combate">
      <PlayerHud
        player={battle.player}
        hero={hero}
        level={playerLevel}
      />
      <CenterHud
        scenario={scenario}
        encounterLabel={battle.encounterLabel}
        turn={battle.turn}
        timeLeft={battle.timeLeft}
      />
      <EnemyHud
        enemy={battle.enemy}
        enemyDef={enemyDef}
        level={enemyLevel}
      />
    </header>
  )
}

function PlayerHud({ player, hero, level }) {
  return (
    <section className="combatant-hud player-hud" aria-label={`Jugador ${player.name}`}>
      <PortraitFrame
        src={hero?.portrait}
        alt={player.name}
        variant="player"
      />
      <div className="combatant-hud__body">
        <div className="combatant-hud__meta">
          <span className="combatant-name">{player.name}</span>
          <LevelBadge level={level} />
        </div>
        <HealthBar
          name={player.name}
          hp={player.hp}
          maxHp={player.maxHp}
          shield={player.shield}
          side="left"
          variant="player"
          showName={false}
        />
        <StatusEffects effects={playerEffects(player)} align="left" />
      </div>
    </section>
  )
}

function EnemyHud({ enemy, enemyDef, level }) {
  return (
    <section className="combatant-hud enemy-hud" aria-label={`Enemigo ${enemy.name}`}>
      <div className="combatant-hud__body">
        <div className="combatant-hud__meta">
          <LevelBadge level={level} />
          <span className="combatant-name">{enemy.name}</span>
        </div>
        <HealthBar
          name={enemy.name}
          hp={enemy.hp}
          maxHp={enemy.maxHp}
          shield={enemy.shield}
          side="right"
          variant="enemy"
          showName={false}
        />
        <StatusEffects effects={enemyEffects(enemy)} align="right" />
      </div>
      <PortraitFrame
        src={enemyDef?.spriteImage}
        alt={enemy.name}
        variant="enemy"
      />
    </section>
  )
}

function CenterHud({ scenario, encounterLabel, turn, timeLeft }) {
  return (
    <section className="center-hud" aria-label="Tiempo y escenario">
      <div className="timer-frame">
        <TimerBar timeLeft={timeLeft} totalTime={scenario.time} />
      </div>
      <ChapterBanner
        title={scenario.mapPoint ?? scenario.name}
        subtitle={encounterLabel}
      />
      <span className="round-slot">Turno {turn}</span>
    </section>
  )
}

function PortraitFrame({ src, alt, variant }) {
  return (
    <div className={`portrait-frame portrait-frame--${variant}`}>
      {src ? (
        <img src={src} alt={alt} />
      ) : (
        <span aria-hidden="true">{initials(alt)}</span>
      )}
    </div>
  )
}

function LevelBadge({ level }) {
  return (
    <span className="level-badge">
      Nv {level ?? '-'}
    </span>
  )
}

function StatusEffects({ effects, align }) {
  const slots = [...effects]
  while (slots.length < EMPTY_STATUS_SLOTS) slots.push(null)

  return (
    <div className={`status-effects status-effects--${align}`} aria-label="Efectos activos">
      {slots.slice(0, EMPTY_STATUS_SLOTS).map((effect, index) => (
        <span
          key={`${effect?.key ?? 'empty'}-${index}`}
          className={`status-slot ${effect ? 'is-active' : 'is-empty'}`}
          title={effect?.label ?? 'Espacio para efecto'}
        >
          {effect?.short ?? ''}
        </span>
      ))}
    </div>
  )
}

function ChapterBanner({ title, subtitle }) {
  return (
    <div className="chapter-banner">
      <span>{title}</span>
      {subtitle ? <small>{subtitle}</small> : null}
    </div>
  )
}

function playerEffects(player) {
  const effects = []
  if (player.shield > 0) effects.push({ key: 'shield', label: `Escudo ${player.shield}`, short: 'ES' })
  if (player.energy > 0) effects.push({ key: 'energy', label: `Energía ${player.energy}`, short: 'EN' })
  return effects
}

function enemyEffects(enemy) {
  const effects = []
  if (enemy.shield > 0) effects.push({ key: 'shield', label: `Escudo ${enemy.shield}`, short: 'ES' })
  for (const status of enemy.statuses ?? []) {
    effects.push({
      key: status.type,
      label: `${status.type} (${status.turns})`,
      short: status.type.slice(0, 2).toUpperCase()
    })
  }
  return effects
}

function initials(text) {
  return String(text)
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

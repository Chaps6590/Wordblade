import Phaser from 'phaser'
import { eventBus } from '../eventBus.js'
import { showFloatingText } from '../effects/damageText.js'
import { showSlash } from '../effects/slashEffect.js'
import { screenShake } from '../effects/screenShake.js'
import { getScenario, getScenarioEncounter } from '../../data/scenarios.js'
import { ENEMIES } from '../../data/enemies.js'
import { HERO_BY_RACE } from '../../data/heroes.js'
import { getAnimationFrameSequence } from '../../animationTiming.js'

// Escena de batalla: SOLO renderiza y anima. La lógica vive en game/core.
// Recibe eventos del motor por el eventBus ('battle-event').

// Todo es relativo al tamaño REAL del lienzo (Scale.RESIZE): la escena ocupa
// el contenedor completo y se recalcula al cambiar de tamaño u orientación.
// El fondo lo pone el CSS de la página (una sola imagen); Phaser es
// transparente y solo dibuja personajes + efectos parados sobre ese fondo.
const PLAYER_X_RATIO = 0.19 // Kael a la izquierda
const ENEMY_X_RATIO = 0.81 // enemigo a la derecha
const EDGE_MARGIN = 78 // que no se peguen al borde en pantallas angostas
const ENEMY_IMAGE_GROUND_OFFSET = 20 // compensa margen transparente inferior de los PNG enemigos

// La interfaz inferior ocupa proporcionalmente mucho más espacio en teléfonos
// apaisados. Estas curvas reducen los personajes por altura (no solo por ancho)
// para conservar una franja de escenario legible entre el HUD y la consola.
function sceneMetrics(width, height) {
  if (height <= 420) {
    return {
      groundRatio: 0.74,
      charHeightRatio: 0.45,
      charWidthRatio: width <= 680 ? 0.2 : 0.19
    }
  }

  if (height <= 620) {
    return {
      groundRatio: 0.8,
      charHeightRatio: 0.49,
      charWidthRatio: 0.21
    }
  }

  return {
    groundRatio: 0.9,
    charHeightRatio: 0.58,
    charWidthRatio: 0.25
  }
}

function hexToPhaserColor(hex, fallback = 0xffd150) {
  if (!hex) return fallback
  const value = Number.parseInt(String(hex).replace('#', ''), 16)
  return Number.isFinite(value) ? value : fallback
}

function colorComponents(color) {
  return Phaser.Display.Color.IntegerToRGB(color)
}

function heroAsOpponentDef(hero) {
  if (!hero) return null
  return {
    id: `rival-${hero.race.toLowerCase()}`,
    name: hero.name,
    race: hero.race,
    spriteImage: hero.portrait,
    animations: hero.animations ?? {},
    spriteScale: { offsetY: 0 },
    isHeroOpponent: true
  }
}

export class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene')
  }

  preload() {
    this.battleMode = this.game.wordbladeBattleMode ?? this.registry.get('battleMode') ?? 'adventure'
    this.isDuelMode = this.battleMode === 'duel'
    const scenarioId = this.game.wordbladeScenarioId ?? this.registry.get('scenarioId')
    const scenario = getScenario(scenarioId)
    this.playerHero = HERO_BY_RACE[this.game.wordbladeHeroRace ?? this.registry.get('heroRace')] ?? HERO_BY_RACE.LOBO
    this.playerAnimations = this.playerHero.animations ?? {}
    this.playerTextureKey = `player-${this.playerHero.race.toLowerCase()}-portrait`
    this.playerAnimationPrefix = `player-${this.playerHero.race.toLowerCase()}`

    this.load.image(this.playerTextureKey, this.playerHero.portrait)
    for (const [name, animation] of Object.entries(this.playerAnimations)) {
      if (!animation?.sheet) continue
      this.load.spritesheet(this.playerAnimationTextureKey(name), animation.sheet, {
        frameWidth: animation.frameWidth,
        frameHeight: animation.frameHeight
      })
    }

    if (this.isDuelMode) {
      const opponentRace = this.game.wordbladeOpponentHeroRace ?? this.registry.get('opponentHeroRace')
      this.opponentHero = HERO_BY_RACE[opponentRace] ?? HERO_BY_RACE.LOBO
      this.opponentHeroDef = heroAsOpponentDef(this.opponentHero)
      this.load.image(this.enemyTextureKey(this.opponentHeroDef.id), this.opponentHero.portrait)
      for (const [name, animation] of Object.entries(this.opponentHeroDef.animations ?? {})) {
        if (!animation?.sheet) continue
        this.load.spritesheet(this.enemyAnimationTextureKey(this.opponentHeroDef.id, name), animation.sheet, {
          frameWidth: animation.frameWidth,
          frameHeight: animation.frameHeight
        })
      }
      return
    }

    if (scenario?.backgroundImage) {
      this.load.image(`scenario-bg-${scenario.id}`, scenario.backgroundImage)
    }

    for (const encounter of scenario?.encounters ?? []) {
      const enemyDef = ENEMIES[encounter.enemyId]
      if (enemyDef?.spriteImage) {
        this.load.image(this.enemyTextureKey(enemyDef.id), enemyDef.spriteImage)
      }
      for (const [name, animation] of Object.entries(enemyDef?.animations ?? {})) {
        if (!animation?.sheet) continue
        this.load.spritesheet(this.enemyAnimationTextureKey(enemyDef.id, name), animation.sheet, {
          frameWidth: animation.frameWidth,
          frameHeight: animation.frameHeight
        })
      }
    }
  }

  create() {
    const scenarioId = this.game.wordbladeScenarioId ?? this.registry.get('scenarioId')
    const scenario = getScenario(scenarioId)
    const enemyDef = this.isDuelMode
      ? this.opponentHeroDef
      : scenario
        ? ENEMIES[getScenarioEncounter(scenario, 0).enemyId]
        : null

    this.computeLayout()

    this.createPlayer()
    this.createEnemy(enemyDef)
    this.visualQueue = []
    this.visualQueueActive = false
    this.playerDefeated = false
    this.currentPlayerPower = null
    this.playerAura = null

    this.startPlayerIdle()
    this.startEnemyIdle()

    // Recolocar personajes cuando cambia el tamaño del lienzo (RESIZE):
    // rotar el teléfono, redimensionar la ventana, etc.
    this.onResize = () => this.relayout()
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize)

    // Con Scale.RESIZE el contenedor suele terminar de estirarse DESPUÉS de
    // create(): reacomodamos en el próximo tick (y una vez más por las dudas)
    // para que los personajes tomen el tamaño real y no queden invisibles.
    this.time.delayedCall(0, () => this.relayout())
    this.time.delayedCall(150, () => {
      this.relayout()
      this.game.wordbladeOnReady?.()
    })

    // Escuchar eventos del motor
    this.onBattleEvent = (event) => this.handleEvent(event)
    eventBus.on('battle-event', this.onBattleEvent)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.visualQueue = []
      this.visualQueueActive = false
      this.destroyPlayerAura()
      eventBus.off('battle-event', this.onBattleEvent)
      this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize)
    })
  }

  // Calcula posiciones y tamaños en función del tamaño actual del lienzo.
  // Se protege contra tamaños en 0 (el contenedor aún no se estiró) usando
  // mínimos razonables, así los personajes nunca quedan en escala 0.
  computeLayout() {
    const w = Math.max(this.scale.width, 320)
    const h = Math.max(this.scale.height, 200)
    const metrics = sceneMetrics(w, h)
    this.groundY = Math.round(h * metrics.groundRatio)
    this.playerBaseX = Math.round(Math.max(w * PLAYER_X_RATIO, EDGE_MARGIN))
    this.enemyBaseX = Math.round(Math.min(w * ENEMY_X_RATIO, w - EDGE_MARGIN))
    this.charMaxWidth = Math.round(w * metrics.charWidthRatio)
    this.charMaxHeight = Math.round(h * metrics.charHeightRatio)
  }

  // Ajusta un sprite/imagen para que entre en un alto/ancho máximos,
  // conservando su proporción. Devuelve la escala aplicada.
  fitSprite(sprite, maxWidth, maxHeight) {
    const scale = Math.min(maxWidth / sprite.width, maxHeight / sprite.height)
    sprite.setScale(scale)
    return scale
  }

  // Reposiciona y reescala a ambos combatientes tras un cambio de tamaño.
  relayout() {
    this.computeLayout()

    if (this.kael) {
      this.kael.setPosition(this.playerBaseX, this.groundY).setScale(1).setAngle(0)
      this.kael.setData('baseX', this.playerBaseX)
      this.kael.setData('baseY', this.groundY)
      if (this.kaelSprite) {
        this.kaelSpriteScale = this.fitSprite(this.kaelSprite, this.charMaxWidth, this.charMaxHeight)
      }
      if (this.currentPlayerPower) {
        this.setPlayerAura(this.currentPlayerPower, true)
      }
    }
    if (this.playerShadow) {
      this.playerShadow.setPosition(this.playerBaseX, this.groundY + 2)
      this.playerShadow.setSize(this.charMaxWidth * 0.62, this.charMaxHeight * 0.12)
    }

    if (this.enemy) {
      this.enemy.setPosition(this.enemyBaseX, this.groundY).setScale(1).setAngle(0)
      this.enemy.setData('baseX', this.enemyBaseX)
      this.enemy.setData('baseY', this.groundY)
      if (this.enemySprite) {
        const bossFactor = this.enemyIsBoss ? 1.18 : 1
        this.enemySpriteScale = this.fitSprite(this.enemySprite, this.charMaxWidth * bossFactor, this.charMaxHeight * bossFactor)
      }
    }
    if (this.enemyShadow) {
      this.enemyShadow.setPosition(this.enemyBaseX, this.groundY + 2)
      this.enemyShadow.setSize(this.charMaxWidth * 0.62, this.charMaxHeight * 0.12)
    }
  }

  createPlayer() {
    this.kael = this.add.container(this.playerBaseX, this.groundY).setDepth(5)
    this.kael.setData('baseX', this.playerBaseX)
    this.kael.setData('baseY', this.groundY)

    this.createPlayerAnimations()

    const sprite = this.playerAnimations.idle?.sheet
      ? this.add.sprite(0, 0, this.playerAnimationTextureKey('idle'), 0)
      : this.add.image(0, 0, this.playerTextureKey)
    this.kaelSpriteScale = this.fitSprite(sprite, this.charMaxWidth, this.charMaxHeight)

    sprite
      .setOrigin(0.5, 1)
      .setDepth(1)

    if (this.playerAnimations.idle?.sheet) {
      sprite.play(this.playerAnimationKey('idle'))
    }

    this.kaelSprite = sprite
    this.kael.add(sprite)

    this.playerShadow?.destroy()
    this.playerShadow = this.addGroundShadow(this.playerBaseX)
  }

  createPlayerAnimations() {
    for (const [name, animation] of Object.entries(this.playerAnimations ?? {})) {
      const key = this.playerAnimationKey(name)
      if (this.anims.exists(key) || !animation?.sheet) continue
      const textureKey = this.playerAnimationTextureKey(name)
      const frameSequence = getAnimationFrameSequence(animation)
      this.anims.create({
        key,
        frames: frameSequence
          ? frameSequence.map((frame) => ({ key: textureKey, frame }))
          : this.anims.generateFrameNumbers(textureKey, {
            start: 0,
            end: animation.frames - 1
          }),
        frameRate: animation.frameRate,
        repeat: animation.repeat ?? 0,
        yoyo: frameSequence ? false : animation.yoyo ?? false
      })
    }
  }

  playerAnimationTextureKey(name) {
    return `${this.playerAnimationPrefix}-${name}-sheet`
  }

  playerAnimationKey(name) {
    return `${this.playerAnimationPrefix}-${name}`
  }

  setPlayerAnimation(name) {
    const animation = this.playerAnimations?.[name]
    // Solo un Sprite (no un Image de retrato) tiene stop()/play(): si el héroe
    // no trae hoja de sprites para 'idle', kaelSprite es un Image y no se anima.
    if (!this.kaelSprite || typeof this.kaelSprite.play !== 'function' || !animation?.sheet) return false

    this.kaelSprite
      .stop()
      .setTexture(this.playerAnimationTextureKey(name), 0)
      .setAngle(0)
      .setScale(this.kaelSpriteScale)
      .play(this.playerAnimationKey(name), true)

    return true
  }

  restorePlayerIdle() {
    if (this.playerDefeated) return
    this.setPlayerAnimation('idle')
    this.playerIdleTween?.resume()
    this.playerSpriteIdleTween?.resume()
  }

  playPlayerHit() {
    if (!this.setPlayerAnimation('hit')) return
    this.playerIdleTween?.pause()
    this.playerSpriteIdleTween?.pause()
    this.kaelSprite.once(`animationcomplete-${this.playerAnimationKey('hit')}`, () => this.restorePlayerIdle())
  }

  playPlayerDefeat() {
    this.playerDefeated = true
    if (!this.setPlayerAnimation('defeat')) return
    this.playerIdleTween?.pause()
    this.playerSpriteIdleTween?.pause()
    this.kael.setAngle(0).setScale(1)
  }

  enemyTextureKey(enemyId) {
    return `enemy-${enemyId}`
  }

  enemyAnimationTextureKey(enemyId, name) {
    return `enemy-${enemyId}-${name}-sheet`
  }

  enemyAnimationKey(name) {
    return `${this.enemyAnimationPrefix}-${name}`
  }

  createEnemyAnimations(enemyDef) {
    for (const [name, animation] of Object.entries(enemyDef?.animations ?? {})) {
      const key = `enemy-${enemyDef.id}-${name}`
      if (this.anims.exists(key) || !animation?.sheet) continue
      const textureKey = this.enemyAnimationTextureKey(enemyDef.id, name)
      const frameSequence = getAnimationFrameSequence(animation)
      this.anims.create({
        key,
        frames: frameSequence
          ? frameSequence.map((frame) => ({ key: textureKey, frame }))
          : this.anims.generateFrameNumbers(textureKey, {
            start: 0,
            end: animation.frames - 1
          }),
        frameRate: animation.frameRate,
        repeat: animation.repeat ?? 0,
        yoyo: frameSequence ? false : animation.yoyo ?? false
      })
    }
  }

  setEnemyAnimation(name) {
    const animation = this.enemyAnimations?.[name]
    if (!this.enemySprite || typeof this.enemySprite.play !== 'function' || !animation?.sheet) return false

    this.enemySprite
      .stop()
      .setTexture(this.enemyAnimationTextureKey(this.enemyDef.id, name), 0)
      .setAngle(0)
      .setScale(this.enemySpriteScale)
      .play(this.enemyAnimationKey(name), true)

    if (this.enemyDef?.isHeroOpponent) this.enemySprite.setFlipX(true)

    return true
  }

  playEnemyHit() {
    if (!this.setEnemyAnimation('hit')) return
    const hitSprite = this.enemySprite
    hitSprite.once(`animationcomplete-${this.enemyAnimationKey('hit')}`, () => {
      if (this.enemySprite === hitSprite) this.setEnemyAnimation('idle')
    })
  }

  playEnemyDefeat() {
    this.enemyIdleTween?.pause()
    if (this.setEnemyAnimation('defeat')) {
      this.enemy?.setAngle(0).setScale(1)
      return
    }

    if (!this.enemy) return
    const baseY = this.enemy.getData('baseY') ?? this.groundY
    this.tweens.add({
      targets: this.enemy,
      y: baseY + 16,
      angle: 8,
      scaleX: 0.92,
      scaleY: 0.82,
      duration: 280,
      ease: 'Sine.easeOut'
    })
  }

  // Sombra de contacto ovalada bajo un personaje, para "anclarlo" al piso
  // del fondo (que ahora lo dibuja el CSS de la página).
  addGroundShadow(x) {
    const shadow = this.add
      .ellipse(x, this.groundY + 2, this.charMaxWidth * 0.62, this.charMaxHeight * 0.12, 0x000000, 0.32)
      .setDepth(4)
    return shadow
  }

  handleEvent(event) {
    // Los eventos llegan por un eventBus global compartido. Si esta escena ya
    // no está viva (juego de Phaser destruido al desmontar la página o en el
    // doble montaje de React en dev), la ignoramos en vez de tocar objetos ya
    // liberados: sin sistemas activos `this.add` es null y los sprites no existen.
    if (!this.sys?.isActive() || !this.add) return

    switch (event.kind) {
      case 'playerAttack':
        this.enqueueVisual((done) => this.animatePlayerAttackSequence(event, done))
        break
      case 'playerAura':
        this.setPlayerAura(event.power)
        break
      case 'enemyAttack':
        this.enqueueVisual((done) => this.animateEnemyAttack(event, done))
        break
      case 'enemyLaugh':
        this.enqueueVisual((done) => this.animateEnemyLaugh(event, done))
        break
      case 'enemySpawn':
        this.enqueueVisual((done) => this.time.delayedCall(260, () => this.animateEnemySpawn(event, done)))
        break
      case 'effect':
        this.animateEffect(event)
        break
      case 'statusTick':
        showFloatingText(this, this.enemy.x, this.enemy.y - 60, `-${event.amount}`, {
          color: event.status === 'poison' ? '#7ddf7d' : '#ff7777',
          fontSize: 18
        })
        break
      case 'enemyHeal':
        showFloatingText(this, this.enemy.x, this.enemy.y - 60, `+${event.amount}`, { color: '#7ddf7d' })
        break
      case 'invalid':
        showFloatingText(this, this.kael.x, this.kael.y - 90, '✗ palabra inválida', { color: '#aaaaaa', fontSize: 16 })
        break
      case 'phase':
        this.flash(0xff0000)
        screenShake(this, { intensity: 0.015, duration: 400 })
        break
      case 'end':
        this.enqueueVisual((done) => this.animateBattleEnd(event, done))
        break
      case 'duelEnd':
        this.enqueueVisual((done) => this.animateDuelEnd(event, done))
        break
    }
  }

  enqueueVisual(task) {
    this.visualQueue.push(task)
    this.playNextVisual()
  }

  playNextVisual() {
    if (this.visualQueueActive || !this.sys?.isActive()) return

    const task = this.visualQueue.shift()
    if (!task) return

    this.visualQueueActive = true
    task(() => {
      this.visualQueueActive = false
      this.playNextVisual()
    })
  }

  animateBattleEnd(event, done = () => {}) {
    if (event.result === 'defeat' || event.result === 'time_over') {
      this.playPlayerDefeat()
      this.time.delayedCall(760, () => {
        this.showEndOverlay(event.text)
        done()
      })
      return
    }

    this.showEndOverlay(event.text)
    done()
  }

  animateDuelEnd(event, done = () => {}) {
    if (event.result === 'defeat') {
      this.playPlayerDefeat()
    } else if (event.result === 'victory') {
      this.playEnemyDefeat()
    } else if (event.result === 'draw') {
      this.playPlayerDefeat()
      this.playEnemyDefeat()
    }
    this.time.delayedCall(520, done)
  }

  createEnemy(enemyDef) {
    if (this.enemyIdleTween) this.enemyIdleTween.stop()
    if (this.enemy) this.enemy.destroy()

    const enemyColor = enemyDef?.color ?? 0x8a5a2b
    const isBoss = enemyDef?.boss ?? false
    const scale = isBoss ? 1.35 : 1
    this.enemyDef = enemyDef
    this.enemyAnimations = enemyDef?.animations ?? {}
    this.enemyAnimationPrefix = enemyDef?.id ? `enemy-${enemyDef.id}` : 'enemy-unknown'
    this.enemyIsBoss = isBoss
    this.enemy = this.add.container(this.enemyBaseX, this.groundY).setAlpha(1).setDepth(5)
    this.enemy.setData('baseX', this.enemyBaseX)
    this.enemy.setData('baseY', this.groundY)
    this.enemySprite = null
    this.createEnemyAnimations(enemyDef)

    if (this.enemyAnimations.idle?.sheet && this.textures.exists(this.enemyAnimationTextureKey(enemyDef.id, 'idle'))) {
      this.drawEnemyAnimatedSprite(enemyDef, 'idle')
    } else if (enemyDef?.spriteImage && this.textures.exists(this.enemyTextureKey(enemyDef.id))) {
      this.drawEnemyImage(enemyDef)
    } else {
      switch (enemyDef?.spriteKind) {
        case 'spider':
          this.drawSpiderEnemy(enemyColor, scale)
          break
        case 'serpent':
          this.drawSerpentEnemy(enemyColor, scale)
          break
        case 'tick':
        default:
          this.drawTickEnemy(enemyColor, scale, isBoss)
          break
      }
    }

    this.enemyShadow?.destroy()
    this.enemyShadow = this.addGroundShadow(this.enemyBaseX)
  }

  drawEnemyAnimatedSprite(enemyDef, animationName) {
    const textureKey = this.enemyAnimationTextureKey(enemyDef.id, animationName)
    const sprite = this.add.sprite(0, 0, textureKey, 0)
    const bossFactor = enemyDef.boss ? 1.18 : 1
    this.enemySpriteScale = this.fitSprite(sprite, this.charMaxWidth * bossFactor, this.charMaxHeight * bossFactor)

    sprite
      .setOrigin(0.5, 1)
      .setY(enemyDef.spriteScale?.offsetY ?? ENEMY_IMAGE_GROUND_OFFSET)
      .setDepth(1)
      .play(this.enemyAnimationKey(animationName))

    if (enemyDef.isHeroOpponent) sprite.setFlipX(true)

    this.enemySprite = sprite
    this.enemy.add(sprite)
  }

  drawEnemyImage(enemyDef) {
    const textureKey = this.enemyTextureKey(enemyDef.id)
    const image = this.add.image(0, 0, textureKey)
    const bossFactor = enemyDef.boss ? 1.18 : 1
    this.enemySpriteScale = this.fitSprite(image, this.charMaxWidth * bossFactor, this.charMaxHeight * bossFactor)

    image
      .setOrigin(0.5, 1)
      .setY(ENEMY_IMAGE_GROUND_OFFSET)
      .setDepth(1)

    if (enemyDef.isHeroOpponent) image.setFlipX(true).setY(enemyDef.spriteScale?.offsetY ?? 0)

    this.enemySprite = image
    this.enemy.add(image)
  }

  drawTickEnemy(enemyColor, scale, isBoss) {
    const tickBody = this.add.ellipse(0, 0, 90 * scale, 65 * scale, enemyColor).setStrokeStyle(3, 0x000000, 0.4)
    const tickHead = this.add.circle(-52 * scale, 8 * scale, 16 * scale, enemyColor).setStrokeStyle(2, 0x000000, 0.4)
    const eye = this.add.circle(-56 * scale, 4 * scale, 4 * scale, 0xff3333)
    this.enemy.add([tickBody, tickHead, eye])
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        this.enemy.add(
          this.add
            .rectangle((-25 + i * 25) * scale, side * 34 * scale, 5, 24 * scale, enemyColor)
            .setRotation(side * 0.35)
        )
      }
    }
    if (isBoss) this.enemy.add(this.add.triangle(0, -55 * scale, 0, 20, 15, 0, 30, 20, 0xd4af37))
  }

  drawSpiderEnemy(enemyColor, scale) {
    const abdomen = this.add.ellipse(16, 8, 105 * scale, 78 * scale, enemyColor).setStrokeStyle(3, 0x111111, 0.55)
    const thorax = this.add.circle(-48 * scale, 2, 32 * scale, enemyColor).setStrokeStyle(3, 0x111111, 0.55)
    const eyeLeft = this.add.circle(-60 * scale, -7 * scale, 5 * scale, 0x88ff66)
    const eyeRight = this.add.circle(-48 * scale, -9 * scale, 5 * scale, 0x88ff66)
    this.enemy.add([abdomen, thorax, eyeLeft, eyeRight])
    for (const side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const x = (-42 + i * 28) * scale
        const leg = this.add.rectangle(x, side * 44 * scale, 7 * scale, 38 * scale, enemyColor).setRotation(side * (0.65 - i * 0.12))
        this.enemy.add(leg)
      }
    }
  }

  drawSerpentEnemy(enemyColor, scale) {
    for (let i = 0; i < 6; i++) {
      const segment = this.add
        .ellipse((-70 + i * 28) * scale, Math.sin(i * 0.9) * 18 * scale, 58 * scale, 38 * scale, enemyColor)
        .setStrokeStyle(2, 0x0b1d0f, 0.5)
      this.enemy.add(segment)
    }
    const head = this.add.triangle(96 * scale, -8 * scale, 0, 38, 70, 0, 0, -38, enemyColor).setStrokeStyle(3, 0x0b1d0f, 0.6)
    const eye = this.add.circle(112 * scale, -18 * scale, 5 * scale, 0xffee55)
    const fang = this.add.triangle(118 * scale, 12 * scale, 0, 0, 10, 0, 5, 22, 0xf4f8ff)
    this.enemy.add([head, eye, fang])
  }

  startEnemyIdle() {
    if (!this.enemy) return
    this.setEnemyAnimation('idle')
    const baseY = this.enemy.getData('baseY') ?? this.groundY
    this.enemyIdleTween = this.tweens.add({
      targets: this.enemy,
      y: baseY - 4,
      scaleX: 1.015,
      scaleY: 0.992,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
  }

  startPlayerIdle() {
    if (!this.kael) return
    const baseY = this.kael.getData('baseY') ?? this.groundY
    this.playerIdleTween = this.tweens.add({
      targets: this.kael,
      y: baseY - 5,
      scaleX: 1.014,
      scaleY: 0.992,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
    this.playerSpriteIdleTween = this.tweens.add({
      targets: this.kaelSprite,
      angle: { from: -0.7, to: 0.7 },
      duration: 3100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
  }

  animateEnemySpawn(event, done = () => {}) {
    this.animateDefeatedEnemyExit(() => this.dropNextEnemy(event, done))
  }

  animateDefeatedEnemyExit(done) {
    if (!this.enemy) {
      done()
      return
    }

    this.enemyIdleTween?.stop()
    const defeatedEnemy = this.enemy
    const defeatedShadow = this.enemyShadow
    const baseY = defeatedEnemy.getData('baseY') ?? this.groundY

    this.tweens.add({
      targets: defeatedEnemy,
      y: baseY + 24,
      angle: -7,
      scaleX: 0.9,
      scaleY: 0.78,
      alpha: 0,
      duration: 360,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        defeatedEnemy.destroy()
        if (defeatedShadow) defeatedShadow.destroy()
        if (this.enemy === defeatedEnemy) this.enemy = null
        if (this.enemyShadow === defeatedShadow) this.enemyShadow = null
        done()
      }
    })

    if (defeatedShadow) {
      this.tweens.add({
        targets: defeatedShadow,
        alpha: 0,
        scaleX: 0.35,
        scaleY: 0.35,
        duration: 240,
        ease: 'Sine.easeIn'
      })
    }
  }

  dropNextEnemy(event, done) {
    const enemyDef = ENEMIES[event.enemyId]
    this.createEnemy(enemyDef)
    const baseX = this.enemy.getData('baseX') ?? this.enemyBaseX
    const baseY = this.enemy.getData('baseY') ?? this.groundY
    const fallStartY = Math.min(-72, baseY - this.charMaxHeight - 120)

    showFloatingText(this, this.scale.width * 0.5, this.scale.height * 0.24, event.enemyName ?? '¡Nuevo enemigo!', {
      color: '#ffd166',
      fontSize: 20
    })
    this.flash(0x5cb2ff)

    this.enemy.setAlpha(0).setScale(0.82).setPosition(baseX, fallStartY).setAngle(0)
    this.enemyShadow?.setAlpha(0).setScale(0.28)

    this.tweens.add({
      targets: this.enemy,
      alpha: 1,
      scale: 1,
      x: baseX,
      y: baseY,
      duration: 620,
      ease: 'Bounce.easeOut',
      onComplete: () => {
        this.enemy.setPosition(baseX, baseY).setScale(1).setAngle(0)
        this.enemyShadow?.setAlpha(0.32).setScale(1)
        this.showLandingDust(baseX, baseY)
        screenShake(this, { intensity: 0.006, duration: 120 })
        this.startEnemyIdle()
        done()
      }
    })

    if (this.enemyShadow) {
      this.tweens.add({
        targets: this.enemyShadow,
        alpha: 0.32,
        scaleX: 1,
        scaleY: 1,
        duration: 430,
        ease: 'Sine.easeOut'
      })
    }
  }

  showLandingDust(x, y) {
    const dust = this.add.ellipse(x, y + 4, this.charMaxWidth * 0.34, this.charMaxHeight * 0.06, 0xd6e6ff, 0.2).setDepth(6)
    this.tweens.add({
      targets: dust,
      scaleX: 1.8,
      scaleY: 0.55,
      alpha: 0,
      duration: 260,
      ease: 'Sine.easeOut',
      onComplete: () => dust.destroy()
    })
  }

  attackReach() {
    return Phaser.Math.Clamp(this.charMaxWidth * 0.46, 58, 138)
  }

  playerStrikeX() {
    const startX = this.kael.getData('baseX') ?? this.kael.x
    const targetX = this.enemy.x - this.attackReach()
    return Math.max(startX + 54, targetX)
  }

  enemyStrikeX() {
    const startX = this.enemy.getData('baseX') ?? this.enemy.x
    const targetX = this.kael.x + this.attackReach()
    return Math.min(startX - 54, targetX)
  }

  dashDuration(distance) {
    return Phaser.Math.Clamp(Math.round(Math.abs(distance) * 0.34), 190, 430)
  }

  animatePlayerAttackSequence(event, done = () => {}) {
    if (this.playerAttackActive) {
      done()
      return
    }
    this.playerAttackActive = true

    const temporaryAura = event.power && !this.currentPlayerPower
    if (temporaryAura) this.setPlayerAura(event.power)

    const startX = this.kael.getData('baseX') ?? this.kael.x
    const startY = this.kael.getData('baseY') ?? this.kael.y
    const strikeX = this.playerStrikeX()
    const recoilX = Phaser.Math.Linear(strikeX, startX, 0.28)
    const dashMs = this.dashDuration(strikeX - startX)
    this.playerIdleTween?.pause()
    this.playerSpriteIdleTween?.pause()

    if (this.kaelSprite) {
      this.setPlayerAnimation('attack')
    }

    const finishAttack = () => {
      this.kael.setPosition(startX, startY)
      this.kael.setScale(1)
      this.kael.setAngle(0)
      if (this.kaelSprite) {
        this.setPlayerAnimation('idle')
      }
      this.playerIdleTween?.resume()
      this.playerSpriteIdleTween?.resume()
      if (temporaryAura) this.setPlayerAura(null)
      this.playerAttackActive = false
      done()
    }

    const applyHit = () => {
      const attackColor = hexToPhaserColor(event.power?.hex, event.magic ? 0xffee55 : 0xd6e6ff)
      this.pulsePlayerAura(event.power)
      showSlash(this, this.enemy.x - 20, this.enemy.y, {
        color: attackColor,
        intensity: event.power?.tier ?? 1
      })
      if (event.secret) {
        showFloatingText(this, this.enemy.x, this.enemy.y - 110, 'PALABRA SECRETA', {
          color: '#ffd700',
          fontSize: 20
        })
        this.flash(0xffd700)
      }
      showFloatingText(this, this.enemy.x, this.enemy.y - 70, `-${event.amount}`, {
        color: event.critical ? '#ffd700' : (event.power?.hex ?? '#ff5555'),
        fontSize: event.critical ? 32 : 24
      })
      this.playEnemyHit()
      this.hitCharacter(this.enemy, 1)
      screenShake(this, {
        intensity: event.critical || event.magic || event.amount >= 20 ? 0.014 : 0.007,
        duration: event.critical || event.magic || event.amount >= 20 ? 260 : 130
      })
    }

    this.kael.setPosition(startX, startY).setScale(1).setAngle(0)

    this.tweens.add({
      targets: this.kael,
      x: startX - 22,
      y: startY - 10,
      angle: -9,
      scaleX: 0.98,
      scaleY: 1.03,
      duration: 130,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.kael,
          x: strikeX,
          y: startY - 8,
          angle: 13,
          scaleX: 1.13,
          scaleY: 0.94,
          duration: dashMs,
          ease: 'Cubic.easeIn',
          onComplete: () => {
            applyHit()
            this.tweens.add({
              targets: this.kael,
              x: recoilX,
              y: startY,
              angle: 2,
              scaleX: 1.03,
              scaleY: 1,
              duration: 110,
              ease: 'Sine.easeOut',
              onComplete: () => {
                this.tweens.add({
                  targets: this.kael,
                  x: startX,
                  y: startY,
                  angle: 0,
                  scaleX: 1,
                  scaleY: 1,
                  duration: this.dashDuration(recoilX - startX),
                  ease: 'Back.easeOut',
                  onComplete: finishAttack
                })
              }
            })
          }
        })
      }
    })
  }

  animatePlayerAttack(event) {
    const startX = this.kael.getData('baseX') ?? this.kael.x
    if (this.kaelSprite) {
      this.setPlayerAnimation('attack')
    }
    this.tweens.add({
      targets: this.kael,
      x: startX + 74,
      scaleX: 1.08,
      duration: 190,
      yoyo: true,
      ease: 'Power2',
      onYoyo: () => {
        const attackColor = hexToPhaserColor(event.power?.hex, event.magic ? 0xffee55 : 0xd6e6ff)
        this.pulsePlayerAura(event.power)
        showSlash(this, this.enemy.x - 20, this.enemy.y, {
          color: attackColor,
          intensity: event.power?.tier ?? 1
        })
        if (event.secret) {
          showFloatingText(this, this.enemy.x, this.enemy.y - 110, '¡PALABRA SECRETA!', {
            color: '#ffd700',
            fontSize: 20
          })
          this.flash(0xffd700)
        }
        showFloatingText(this, this.enemy.x, this.enemy.y - 70, `-${event.amount}`, {
          color: event.critical ? '#ffd700' : (event.power?.hex ?? '#ff5555'),
          fontSize: event.critical ? 32 : 24
        })
        this.playEnemyHit()
        this.hitCharacter(this.enemy, 1)
        if (event.critical || event.magic || event.amount >= 20) {
          screenShake(this, { intensity: 0.012, duration: 250 })
        }
      },
      onComplete: () => {
        this.kael.x = startX
        this.kael.scaleX = 1
        if (this.kaelSprite) {
          this.setPlayerAnimation('idle')
        }
      }
    })
  }

  animateEnemyAttack(event, done = () => {}) {
    const startX = this.enemy.getData('baseX') ?? this.enemy.x
    const startY = this.enemy.getData('baseY') ?? this.enemy.y
    const strikeX = this.enemyStrikeX()
    const recoilX = Phaser.Math.Linear(strikeX, startX, 0.24)
    const dashMs = this.dashDuration(startX - strikeX)
    this.enemyIdleTween?.pause()
    this.setEnemyAnimation('attack')

    this.tweens.add({
      targets: this.enemy,
      x: startX + 18,
      y: startY - 6,
      angle: 4,
      scaleX: 0.98,
      scaleY: 1.03,
      duration: 120,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: this.enemy,
          x: strikeX,
          y: startY - 4,
          angle: -8,
          scaleX: 1.12,
          scaleY: 0.94,
          duration: dashMs,
          ease: 'Cubic.easeIn',
          onComplete: () => {
            this.applyEnemyHit(event)
            this.tweens.add({
              targets: this.enemy,
              x: recoilX,
              y: startY,
              angle: -2,
              scaleX: 1.04,
              scaleY: 1,
              duration: 100,
              ease: 'Sine.easeOut',
              onComplete: () => {
                this.tweens.add({
                  targets: this.enemy,
                  x: startX,
                  y: startY,
                  angle: 0,
                  scaleX: 1,
                  scaleY: 1,
                  duration: this.dashDuration(startX - recoilX),
                  ease: 'Back.easeOut',
                  onComplete: () => {
                    this.enemy.setPosition(startX, startY).setAngle(0).setScale(1)
                    this.setEnemyAnimation('idle')
                    this.enemyIdleTween?.resume()
                    done()
                  }
                })
              }
            })
          }
        })
      }
    })
  }

  applyEnemyHit(event) {
        const blocked = event.amount === 0
        showFloatingText(this, this.kael.x, this.kael.y - 90, blocked ? 'BLOQUEADO' : `-${event.amount}`, {
          color: blocked ? '#66aaff' : '#ff5555'
        })
        if (!blocked) {
          this.playPlayerHit()
          this.hitCharacter(this.kael, -1)
          screenShake(this, { intensity: 0.006, duration: 150 })
        }
  }

  animateEnemyLaugh(event = {}, done = () => {}) {
    showFloatingText(this, this.enemy.x, this.enemy.y - 75, event.text ?? '¡JA, JA, JA!', {
      color: '#ffd166',
      fontSize: 22
    })
    this.tweens.add({
      targets: this.enemy,
      angle: { from: -5, to: 5 },
      scaleX: 1.12,
      scaleY: 0.9,
      duration: 90,
      yoyo: true,
      repeat: 3,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.enemy.setAngle(0)
        this.enemy.setScale(1)
        done()
      }
    })
  }

  animateEffect(event) {
    switch (event.effect) {
      case 'heal':
        showFloatingText(this, this.kael.x, this.kael.y - 110, `+${event.amount} HP`, { color: '#7ddf7d', fontSize: 18 })
        break
      case 'shield':
        showFloatingText(this, this.kael.x + 50, this.kael.y - 60, `+${event.amount} 🛡`, { color: '#66aaff', fontSize: 18 })
        this.shieldRing(this.kael.x, this.kael.y - 20)
        break
      case 'energy':
        showFloatingText(this, this.kael.x - 50, this.kael.y - 60, '+⚡', { color: '#ffee55', fontSize: 18 })
        break
      case 'energyBurst':
        this.flash(0xffee55)
        break
      case 'bleed':
        showFloatingText(this, this.enemy.x + 40, this.enemy.y - 30, '🩸', { fontSize: 20 })
        break
      case 'poison':
        showFloatingText(this, this.enemy.x + 40, this.enemy.y - 30, '☠', { color: '#7ddf7d', fontSize: 20 })
        break
      case 'lightning':
        this.lightningBolt()
        break
      case 'break':
        showFloatingText(this, this.enemy.x, this.enemy.y - 40, '¡DEFENSA ROTA!', { color: '#ffaa55', fontSize: 16 })
        break
      case 'selfPoison':
        showFloatingText(this, this.kael.x, this.kael.y - 70, `-${event.amount} ☠`, { color: '#7ddf7d', fontSize: 18 })
        break
    }
  }

  // Rayo: línea amarilla en zigzag desde arriba hasta el enemigo
  lightningBolt() {
    const g = this.add.graphics().setDepth(95)
    g.lineStyle(4, 0xffee55, 1)
    g.beginPath()
    let x = this.enemy.x
    let y = 0
    g.moveTo(x, y)
    while (y < this.enemy.y - 20) {
      x += Phaser.Math.Between(-25, 25)
      y += Phaser.Math.Between(30, 55)
      g.lineTo(x, y)
    }
    g.strokePath()
    this.flash(0xffffcc)
    screenShake(this, { intensity: 0.015, duration: 300 })
    this.tweens.add({ targets: g, alpha: 0, duration: 350, onComplete: () => g.destroy() })
  }

  shieldRing(x, y) {
    const ring = this.add.circle(x, y, 55).setStrokeStyle(3, 0x66aaff, 0.9).setDepth(80)
    this.tweens.add({ targets: ring, scale: 1.3, alpha: 0, duration: 500, onComplete: () => ring.destroy() })
  }

  setPlayerAura(power, force = false) {
    this.currentPlayerPower = power
    const signature = power ? `${power.hex}:${power.tier}:${power.charge}:${power.auraScale}` : ''
    if (!force && this.playerAuraSignature === signature) return

    this.destroyPlayerAura()
    this.playerAuraSignature = signature
    if (!power || !this.kael) return

    const color = hexToPhaserColor(power.hex)
    const rgb = colorComponents(color)
    const tier = power.tier ?? 1
    const auraScale = power.auraScale ?? 1
    const auraWidth = this.charMaxWidth * (0.58 + tier * 0.12) * auraScale
    const auraHeight = this.charMaxHeight * (0.7 + tier * 0.18) * auraScale
    const aura = this.add.container(0, 0).setDepth(0)

    const glow = this.add.graphics()
    glow.fillStyle(color, 0.13 + tier * 0.025)
    glow.fillEllipse(0, -auraHeight * 0.42, auraWidth, auraHeight)
    glow.lineStyle(2 + tier, color, 0.34 + tier * 0.08)
    glow.strokeEllipse(0, -auraHeight * 0.42, auraWidth * 0.82, auraHeight * 0.9)

    const core = this.add.graphics()
    core.fillStyle(color, 0.17 + tier * 0.04)
    core.fillTriangle(0, -auraHeight * 0.98, -auraWidth * 0.22, -auraHeight * 0.12, auraWidth * 0.2, -auraHeight * 0.14)
    core.fillEllipse(0, -auraHeight * 0.32, auraWidth * 0.48, auraHeight * 0.64)

    const flameCount = 2 + tier
    const flames = []
    for (let index = 0; index < flameCount; index++) {
      const flame = this.add.graphics()
      const offset = (index - (flameCount - 1) / 2) * auraWidth * 0.16
      const height = auraHeight * Phaser.Math.FloatBetween(0.42, 0.72)
      flame.fillStyle(color, 0.22)
      flame.fillTriangle(offset, -height, offset - auraWidth * 0.075, -auraHeight * 0.12, offset + auraWidth * 0.075, -auraHeight * 0.12)
      flame.fillStyle(Phaser.Display.Color.GetColor(
        Math.min(255, rgb.r + 42),
        Math.min(255, rgb.g + 42),
        Math.min(255, rgb.b + 42)
      ), 0.16)
      flame.fillEllipse(offset, -height * 0.48, auraWidth * 0.15, height * 0.7)
      flames.push(flame)
    }

    aura.add([glow, ...flames, core])
    aura.setAlpha(0.78)
    this.kael.addAt(aura, 0)
    this.playerAura = aura

    this.playerAuraTween = this.tweens.add({
      targets: aura,
      scaleX: 1.04 + tier * 0.04,
      scaleY: 1.1 + tier * 0.05,
      alpha: 0.44 + tier * 0.08,
      duration: 720,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })

    this.playerAuraFlameTween = this.tweens.add({
      targets: flames,
      y: -8 - tier * 4,
      alpha: 0.42,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: this.tweens.stagger(80)
    })
  }

  pulsePlayerAura(power) {
    if (!power) return
    if (!this.playerAura) this.setPlayerAura(power)
    if (!this.playerAura) return

    this.tweens.add({
      targets: this.playerAura,
      scaleX: 1.28 + (power.tier ?? 1) * 0.12,
      scaleY: 1.34 + (power.tier ?? 1) * 0.15,
      alpha: 0.95,
      duration: 120,
      yoyo: true,
      ease: 'Sine.easeOut'
    })
  }

  destroyPlayerAura() {
    this.playerAuraTween?.stop()
    this.playerAuraFlameTween?.stop()
    this.playerAuraTween = null
    this.playerAuraFlameTween = null
    if (this.playerAura) {
      this.playerAura.destroy()
      this.playerAura = null
    }
  }

  hitCharacter(container, direction) {
    if (!container) return

    const baseX = container.getData('baseX') ?? container.x
    const tintTargets = container.list.filter((child) => typeof child.setTint === 'function')

    for (const target of tintTargets) {
      target.setTint(0xff7777)
    }

    this.tweens.add({
      targets: container,
      x: baseX + (direction * 12),
      alpha: 0.72,
      duration: 70,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        container.x = baseX
        container.alpha = 1
        for (const target of tintTargets) {
          target.clearTint()
        }
      }
    })
  }

  flash(color) {
    const rgb = Phaser.Display.Color.IntegerToRGB(color)
    this.cameras.main.flash(200, rgb.r, rgb.g, rgb.b)
  }

  showEndOverlay(text) {
    const w = this.scale.width
    const h = this.scale.height
    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.6).setDepth(200)
    this.add
      .text(w / 2, h / 2, text, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: w - 100 }
      })
      .setOrigin(0.5)
      .setDepth(201)
  }
}

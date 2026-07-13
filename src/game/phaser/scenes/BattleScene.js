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
      charHeightRatio: 0.52,
      charWidthRatio: width <= 680 ? 0.23 : 0.22
    }
  }

  if (height <= 620) {
    return {
      groundRatio: 0.8,
      charHeightRatio: 0.55,
      charWidthRatio: 0.24
    }
  }

  return {
    groundRatio: 0.9,
    charHeightRatio: 0.58,
    charWidthRatio: 0.25
  }
}

export class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene')
  }

  preload() {
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

    if (scenario?.backgroundImage) {
      this.load.image(`scenario-bg-${scenario.id}`, scenario.backgroundImage)
    }

    for (const encounter of scenario?.encounters ?? []) {
      const enemyDef = ENEMIES[encounter.enemyId]
      if (enemyDef?.spriteImage) {
        this.load.image(this.enemyTextureKey(enemyDef.id), enemyDef.spriteImage)
      }
    }
  }

  create() {
    const scenarioId = this.game.wordbladeScenarioId ?? this.registry.get('scenarioId')
    const scenario = getScenario(scenarioId)
    const enemyDef = scenario ? ENEMIES[getScenarioEncounter(scenario, 0).enemyId] : null

    this.computeLayout()

    this.createPlayer()
    this.createEnemy(enemyDef)

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
    this.time.delayedCall(150, () => this.relayout())

    // Escuchar eventos del motor
    this.onBattleEvent = (event) => this.handleEvent(event)
    eventBus.on('battle-event', this.onBattleEvent)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
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
        this.fitSprite(this.enemySprite, this.charMaxWidth * bossFactor, this.charMaxHeight * bossFactor)
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
    if (!this.setPlayerAnimation('defeat')) return
    this.playerIdleTween?.pause()
    this.playerSpriteIdleTween?.pause()
    this.kael.setAngle(0).setScale(1)
  }

  enemyTextureKey(enemyId) {
    return `enemy-${enemyId}`
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
        this.animatePlayerAttackSequence(event)
        break
      case 'enemyAttack':
        this.animateEnemyAttack(event)
        break
      case 'enemyLaugh':
        this.animateEnemyLaugh()
        break
      case 'enemySpawn':
        this.time.delayedCall(520, () => this.animateEnemySpawn(event))
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
        if (event.result === 'defeat' || event.result === 'time_over') {
          this.playPlayerDefeat()
          this.time.delayedCall(700, () => this.showEndOverlay(event.text))
        } else {
          this.showEndOverlay(event.text)
        }
        break
    }
  }

  createEnemy(enemyDef) {
    if (this.enemyIdleTween) this.enemyIdleTween.stop()
    if (this.enemy) this.enemy.destroy()

    const enemyColor = enemyDef?.color ?? 0x8a5a2b
    const isBoss = enemyDef?.boss ?? false
    const scale = isBoss ? 1.35 : 1
    this.enemyIsBoss = isBoss
    this.enemy = this.add.container(this.enemyBaseX, this.groundY).setAlpha(1).setDepth(5)
    this.enemy.setData('baseX', this.enemyBaseX)
    this.enemy.setData('baseY', this.groundY)
    this.enemySprite = null

    if (enemyDef?.spriteImage && this.textures.exists(this.enemyTextureKey(enemyDef.id))) {
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

  drawEnemyImage(enemyDef) {
    const textureKey = this.enemyTextureKey(enemyDef.id)
    const image = this.add.image(0, 0, textureKey)
    const bossFactor = enemyDef.boss ? 1.18 : 1
    this.fitSprite(image, this.charMaxWidth * bossFactor, this.charMaxHeight * bossFactor)

    image
      .setOrigin(0.5, 1)
      .setY(ENEMY_IMAGE_GROUND_OFFSET)
      .setDepth(1)

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

  animateEnemySpawn(event) {
    showFloatingText(this, this.scale.width * 0.5, this.scale.height * 0.24, event.enemyName ?? '¡Nuevo enemigo!', {
      color: '#ffd166',
      fontSize: 20
    })
    this.flash(0x5cb2ff)
    const enemyDef = ENEMIES[event.enemyId]
    this.createEnemy(enemyDef)
    const baseX = this.enemy.getData('baseX') ?? this.enemyBaseX
    this.enemy.setAlpha(0).setScale(0.92).setX(baseX + 28)
    this.tweens.add({
      targets: this.enemy,
      alpha: 1,
      scale: 1,
      x: baseX,
      duration: 450,
      ease: 'Sine.easeOut',
      onComplete: () => this.startEnemyIdle()
    })
  }

  animatePlayerAttackSequence(event) {
    if (this.playerAttackActive) return
    this.playerAttackActive = true

    const startX = this.kael.getData('baseX') ?? this.kael.x
    const startY = this.kael.getData('baseY') ?? this.kael.y
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
      this.playerAttackActive = false
    }

    const applyHit = () => {
      showSlash(this, this.enemy.x - 20, this.enemy.y, { color: event.magic ? 0xffee55 : 0xd6e6ff })
      if (event.secret) {
        showFloatingText(this, this.enemy.x, this.enemy.y - 110, 'PALABRA SECRETA', {
          color: '#ffd700',
          fontSize: 20
        })
        this.flash(0xffd700)
      }
      showFloatingText(this, this.enemy.x, this.enemy.y - 70, `-${event.amount}`, {
        color: event.critical ? '#ffd700' : '#ff5555',
        fontSize: event.critical ? 32 : 24
      })
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
          x: startX + 108,
          y: startY - 2,
          angle: 13,
          scaleX: 1.13,
          scaleY: 0.94,
          duration: 145,
          ease: 'Cubic.easeIn',
          onComplete: () => {
            applyHit()
            this.tweens.add({
              targets: this.kael,
              x: startX + 34,
              y: startY,
              angle: 2,
              scaleX: 1.03,
              scaleY: 1,
              duration: 90,
              ease: 'Sine.easeOut',
              onComplete: () => {
                this.tweens.add({
                  targets: this.kael,
                  x: startX,
                  y: startY,
                  angle: 0,
                  scaleX: 1,
                  scaleY: 1,
                  duration: 170,
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
        showSlash(this, this.enemy.x - 20, this.enemy.y, { color: event.magic ? 0xffee55 : 0xd6e6ff })
        if (event.secret) {
          showFloatingText(this, this.enemy.x, this.enemy.y - 110, '¡PALABRA SECRETA!', {
            color: '#ffd700',
            fontSize: 20
          })
          this.flash(0xffd700)
        }
        showFloatingText(this, this.enemy.x, this.enemy.y - 70, `-${event.amount}`, {
          color: event.critical ? '#ffd700' : '#ff5555',
          fontSize: event.critical ? 32 : 24
        })
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

  animateEnemyAttack(event) {
    const startX = this.enemy.getData('baseX') ?? this.enemy.x
    this.tweens.add({
      targets: this.enemy,
      x: startX - 54,
      angle: 3,
      duration: 170,
      yoyo: true,
      ease: 'Power2',
      onYoyo: () => {
        const blocked = event.amount === 0
        showFloatingText(this, this.kael.x, this.kael.y - 90, blocked ? 'BLOQUEADO' : `-${event.amount}`, {
          color: blocked ? '#66aaff' : '#ff5555'
        })
        if (!blocked) {
          this.playPlayerHit()
          this.hitCharacter(this.kael, -1)
          screenShake(this, { intensity: 0.006, duration: 150 })
        }
      },
      onComplete: () => {
        this.enemy.x = startX
        this.enemy.angle = 0
      }
    })
  }

  animateEnemyLaugh() {
    showFloatingText(this, this.enemy.x, this.enemy.y - 75, '¡JA, JA, JA!', {
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

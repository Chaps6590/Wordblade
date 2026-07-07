import Phaser from 'phaser'
import { eventBus } from '../eventBus.js'
import { showFloatingText } from '../effects/damageText.js'
import { showSlash } from '../effects/slashEffect.js'
import { screenShake } from '../effects/screenShake.js'
import { getScenario, getScenarioEncounter } from '../../data/scenarios.js'
import { ENEMIES } from '../../data/enemies.js'

// Escena de batalla: SOLO renderiza y anima. La lógica vive en game/core.
// Recibe eventos del motor por el eventBus ('battle-event').

const W = 800
const H = 400

export class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene')
  }

  preload() {
    const scenarioId = this.registry.get('scenarioId')
    const scenario = getScenario(scenarioId)

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
    const scenarioId = this.registry.get('scenarioId')
    const scenario = getScenario(scenarioId)
    const enemyDef = scenario ? ENEMIES[getScenarioEncounter(scenario, 0).enemyId] : null

    this.drawBackground(scenario)
    this.addStageAmbience()

    // --- Kael (placeholder: caballero azul con espada) ---
    this.kael = this.add.container(180, 260)
    const body = this.add.rectangle(0, 0, 50, 80, 0x2a4a7a).setStrokeStyle(2, 0x8fb8e8)
    const head = this.add.circle(0, -55, 16, 0xd9b38c).setStrokeStyle(2, 0x8a6a4a)
    // Espada de acero con filo rúnico azul, como el emblema del juego
    const sword = this.add.rectangle(38, -10, 8, 60, 0xc9d4e6).setStrokeStyle(2, 0x2d7eff).setRotation(0.5)
    this.tweens.add({ targets: sword, alpha: 0.75, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    this.kael.add([sword, body, head])
    this.add.text(180, 320, 'KAEL', { fontFamily: 'monospace', fontSize: '14px', color: '#5cb2ff' }).setOrigin(0.5)

    this.createEnemy(enemyDef)

    // Animaciones idle (flotar suave)
    this.tweens.add({ targets: this.kael, y: 255, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    this.startEnemyIdle()

    // Escuchar eventos del motor
    this.onBattleEvent = (event) => this.handleEvent(event)
    eventBus.on('battle-event', this.onBattleEvent)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      eventBus.off('battle-event', this.onBattleEvent)
    })
  }

  enemyTextureKey(enemyId) {
    return `enemy-${enemyId}`
  }

  drawBackground(scenario) {
    const backgroundKey = scenario?.backgroundImage ? `scenario-bg-${scenario.id}` : null
    if (backgroundKey && this.textures.exists(backgroundKey)) {
      const background = this.add.image(W / 2, H / 2, backgroundKey)
      const scale = Math.max(W / background.width, H / background.height)
      background
        .setScale(scale)
        .setDepth(-20)

      // Viñeta suave para que personajes, textos flotantes y efectos lean mejor.
      this.add.rectangle(W / 2, H / 2, W, H, 0x020714, 0.2).setDepth(-19)
      this.add.rectangle(W / 2, H - 45, W, 90, 0x000000, 0.22).setDepth(-18)
      return
    }

    const top = scenario?.background?.top ?? 0x101b38
    const bottom = scenario?.background?.bottom ?? 0x050817

    // Degradado vertical por bandas entre el color de cielo y el de suelo
    const topColor = Phaser.Display.Color.IntegerToColor(top)
    const bottomColor = Phaser.Display.Color.IntegerToColor(bottom)
    const bands = 8
    for (let i = 0; i < bands; i++) {
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(topColor, bottomColor, bands - 1, i)
      this.add.rectangle(W / 2, (i + 0.5) * (H / bands), W, H / bands + 1, Phaser.Display.Color.GetColor(c.r, c.g, c.b))
    }

    // Luna tenue y colinas lejanas en el horizonte
    this.add.circle(660, 62, 42, 0xdfe8f7, 0.05)
    this.add.circle(660, 62, 26, 0xdfe8f7, 0.07)
    this.add.ellipse(150, H / 2 + 8, 360, 70, 0x000000, 0.18)
    this.add.ellipse(620, H / 2 + 14, 460, 84, 0x000000, 0.22)

    // "Suelo"
    this.add.rectangle(W / 2, H - 30, W, 60, 0x000000, 0.25)
  }

  // Sombras, anillos rúnicos bajo los combatientes y motas de energía
  addStageAmbience() {
    this.add.ellipse(180, 308, 100, 18, 0x000000, 0.35)
    this.add.ellipse(600, 302, 130, 20, 0x000000, 0.35)

    const playerRing = this.add.ellipse(180, 308, 122, 28).setStrokeStyle(2, 0x2d7eff, 0.55)
    const enemyRing = this.add.ellipse(600, 302, 152, 32).setStrokeStyle(2, 0xa565e0, 0.5)
    for (const ring of [playerRing, enemyRing]) {
      this.tweens.add({
        targets: ring,
        scaleX: 1.06,
        scaleY: 1.14,
        alpha: 0.4,
        duration: 1400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      })
    }

    // Motas de energía flotando en el aire
    for (let i = 0; i < 12; i++) {
      const mote = this.add.circle(
        Phaser.Math.Between(20, W - 20),
        Phaser.Math.Between(40, H - 60),
        Phaser.Math.Between(1, 2),
        0x8fc7ff,
        Phaser.Math.FloatBetween(0.15, 0.4)
      )
      this.tweens.add({
        targets: mote,
        y: mote.y - Phaser.Math.Between(25, 55),
        alpha: 0,
        duration: Phaser.Math.Between(2500, 5000),
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000)
      })
    }
  }

  handleEvent(event) {
    switch (event.kind) {
      case 'playerAttack':
        this.animatePlayerAttack(event)
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
        this.showEndOverlay(event.text)
        break
    }
  }

  createEnemy(enemyDef) {
    if (this.enemyIdleTween) this.enemyIdleTween.stop()
    if (this.enemy) this.enemy.destroy()
    if (this.enemyNameLabel) this.enemyNameLabel.destroy()

    const enemyColor = enemyDef?.color ?? 0x8a5a2b
    const isBoss = enemyDef?.boss ?? false
    const scale = isBoss ? 1.35 : 1
    this.enemy = this.add.container(600, 220).setAlpha(1)

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

    this.enemyNameLabel = this.add.text(600, 320, (enemyDef?.name ?? 'ENEMIGO').toUpperCase(), {
      fontFamily: 'monospace', fontSize: '14px', color: isBoss ? '#ffd166' : '#e8a8a8'
    }).setOrigin(0.5)
  }

  drawEnemyImage(enemyDef) {
    const textureKey = this.enemyTextureKey(enemyDef.id)
    const image = this.add.image(0, enemyDef.spriteScale?.offsetY ?? 0, textureKey)
    const maxWidth = enemyDef.spriteScale?.maxWidth ?? (enemyDef.boss ? 260 : 220)
    const maxHeight = enemyDef.spriteScale?.maxHeight ?? (enemyDef.boss ? 250 : 200)
    const fitScale = Math.min(maxWidth / image.width, maxHeight / image.height)

    image
      .setScale(fitScale)
      .setOrigin(0.5)
      .setDepth(1)

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
    this.enemyIdleTween = this.tweens.add({
      targets: this.enemy,
      y: 215,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
  }

  animateEnemySpawn(event) {
    showFloatingText(this, 600, 120, event.enemyName ?? '¡Nuevo enemigo!', {
      color: '#ffd166',
      fontSize: 20
    })
    this.flash(0x5cb2ff)
    const enemyDef = ENEMIES[event.enemyId]
    this.createEnemy(enemyDef)
    this.enemy.setAlpha(0).setScale(0.65)
    this.startEnemyIdle()
    this.tweens.add({
      targets: this.enemy,
      alpha: 1,
      scale: 1,
      duration: 450,
      ease: 'Back.easeOut'
    })
    screenShake(this, { intensity: enemyDef?.boss ? 0.014 : 0.007, duration: 250 })
  }

  animatePlayerAttack(event) {
    const startX = this.kael.x
    this.tweens.add({
      targets: this.kael,
      x: this.enemy.x - 120,
      duration: 180,
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
        this.hitFlash(this.enemy)
        if (event.critical || event.magic || event.amount >= 20) {
          screenShake(this, { intensity: 0.012, duration: 250 })
        }
      },
      onComplete: () => { this.kael.x = startX }
    })
  }

  animateEnemyAttack(event) {
    const startX = this.enemy.x
    this.tweens.add({
      targets: this.enemy,
      x: this.kael.x + 120,
      duration: 200,
      yoyo: true,
      ease: 'Power2',
      onYoyo: () => {
        const blocked = event.amount === 0
        showFloatingText(this, this.kael.x, this.kael.y - 90, blocked ? 'BLOQUEADO' : `-${event.amount}`, {
          color: blocked ? '#66aaff' : '#ff5555'
        })
        if (!blocked) {
          this.hitFlash(this.kael)
          screenShake(this, { intensity: 0.006, duration: 150 })
        }
      },
      onComplete: () => { this.enemy.x = startX }
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

  hitFlash(container) {
    this.tweens.add({ targets: container, alpha: 0.3, duration: 60, yoyo: true, repeat: 2 })
  }

  flash(color) {
    const rgb = Phaser.Display.Color.IntegerToRGB(color)
    this.cameras.main.flash(200, rgb.r, rgb.g, rgb.b)
  }

  showEndOverlay(text) {
    this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6).setDepth(200)
    this.add
      .text(W / 2, H / 2, text, {
        fontFamily: 'monospace',
        fontSize: '22px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: W - 100 }
      })
      .setOrigin(0.5)
      .setDepth(201)
  }
}

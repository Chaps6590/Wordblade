import Phaser from 'phaser'
import { eventBus } from '../eventBus.js'
import { showFloatingText } from '../effects/damageText.js'
import { showSlash } from '../effects/slashEffect.js'
import { screenShake } from '../effects/screenShake.js'
import { getScenario } from '../../data/scenarios.js'
import { ENEMIES } from '../../data/enemies.js'

// Escena de batalla: SOLO renderiza y anima. La lógica vive en game/core.
// Recibe eventos del motor por el eventBus ('battle-event').

const W = 800
const H = 400

export class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene')
  }

  create() {
    const scenarioId = this.registry.get('scenarioId')
    const scenario = getScenario(scenarioId)
    const enemyDef = scenario ? ENEMIES[scenario.enemyId] : null

    this.drawBackground(scenario)

    // --- Kael (placeholder: caballero azul con espada) ---
    this.kael = this.add.container(180, 260)
    const body = this.add.rectangle(0, 0, 50, 80, 0x2a4a7a).setStrokeStyle(2, 0x8fb8e8)
    const head = this.add.circle(0, -55, 16, 0xd9b38c).setStrokeStyle(2, 0x8a6a4a)
    // Espada de acero con filo rúnico azul, como el emblema del juego
    const sword = this.add.rectangle(38, -10, 8, 60, 0xc9d4e6).setStrokeStyle(2, 0x2d7eff).setRotation(0.5)
    this.tweens.add({ targets: sword, alpha: 0.75, duration: 1000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    this.kael.add([sword, body, head])
    this.add.text(180, 320, 'KAEL', { fontFamily: 'monospace', fontSize: '14px', color: '#5cb2ff' }).setOrigin(0.5)

    // --- Enemigo (placeholder: garrapata = elipse con patas) ---
    const enemyColor = enemyDef?.color ?? 0x8a5a2b
    const isBoss = enemyDef?.boss ?? false
    const scale = isBoss ? 1.5 : 1
    this.enemy = this.add.container(600, 220)
    const tickBody = this.add.ellipse(0, 0, 90 * scale, 65 * scale, enemyColor).setStrokeStyle(3, 0x000000, 0.4)
    const tickHead = this.add.circle(-52 * scale, 8 * scale, 16 * scale, enemyColor).setStrokeStyle(2, 0x000000, 0.4)
    const eye = this.add.circle(-56 * scale, 4 * scale, 4 * scale, 0xff3333)
    this.enemy.add([tickBody, tickHead, eye])
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const leg = this.add
          .rectangle((-25 + i * 25) * scale, side * 34 * scale, 5, 24 * scale, enemyColor)
          .setRotation(side * 0.35)
        this.enemy.add(leg)
      }
    }
    if (isBoss) {
      const crown = this.add.triangle(0, -55 * scale, 0, 20, 15, 0, 30, 20, 0xd4af37)
      this.enemy.add(crown)
    }
    this.add.text(600, 320, (enemyDef?.name ?? 'ENEMIGO').toUpperCase(), {
      fontFamily: 'monospace', fontSize: '14px', color: '#e8a8a8'
    }).setOrigin(0.5)

    // Animaciones idle (flotar suave)
    this.tweens.add({ targets: this.kael, y: 255, duration: 1200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })
    this.tweens.add({ targets: this.enemy, y: 215, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' })

    // Escuchar eventos del motor
    this.onBattleEvent = (event) => this.handleEvent(event)
    eventBus.on('battle-event', this.onBattleEvent)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      eventBus.off('battle-event', this.onBattleEvent)
    })
  }

  drawBackground(scenario) {
    const top = scenario?.background?.top ?? 0x101b38
    const bottom = scenario?.background?.bottom ?? 0x050817
    this.add.rectangle(W / 2, H / 4, W, H / 2, top)
    this.add.rectangle(W / 2, (3 * H) / 4, W, H / 2, bottom)
    // "Suelo"
    this.add.rectangle(W / 2, H - 30, W, 60, 0x000000, 0.25)
  }

  handleEvent(event) {
    switch (event.kind) {
      case 'playerAttack':
        this.animatePlayerAttack(event)
        break
      case 'enemyAttack':
        this.animateEnemyAttack(event)
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

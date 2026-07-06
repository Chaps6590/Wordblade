import Phaser from 'phaser'

// Escena de arranque. Por ahora no carga assets (todo son placeholders),
// pero acá irán sprites y sonidos más adelante.

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

  create() {
    this.scene.start('BattleScene')
  }
}

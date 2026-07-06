import Phaser from 'phaser'

// Canal de comunicación entre React (lógica/estado) y Phaser (render).
// React emite 'battle-event' y la escena de batalla los anima.

export const eventBus = new Phaser.Events.EventEmitter()

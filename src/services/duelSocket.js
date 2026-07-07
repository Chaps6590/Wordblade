import { io } from 'socket.io-client'
import { getSavedSession } from './api.js'

// Conexión Socket.IO para los duelos. Usa el mismo origen que la API
// (en dev, Vite proxya /socket.io al backend) y se autentica con el
// mismo token de sesión que la API REST.

const API_ORIGIN = import.meta.env?.VITE_API_URL ?? ''

let socket = null

export function getDuelSocket() {
  if (!socket) {
    socket = io(API_ORIGIN || undefined, {
      auth: { token: getSavedSession()?.token },
      transports: ['websocket', 'polling']
    })
  }
  return socket
}

export function closeDuelSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

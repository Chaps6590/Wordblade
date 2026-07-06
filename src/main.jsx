import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App.jsx'
import './styles/global.css'
import './styles/menu.css'
import './styles/battle.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)

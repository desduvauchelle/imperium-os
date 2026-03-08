import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App.js'
import './index.css'

// Initialise Capacitor plugins — wrapped in try/catch so the app works in
// plain-browser / test environments where the native bridge is absent.
async function initCapacitor() {
  try {
    const [{ StatusBar, Style }, { SplashScreen }] = await Promise.all([
      import('@capacitor/status-bar'),
      import('@capacitor/splash-screen'),
    ])
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#09090b' }) // zinc-950
    await SplashScreen.hide()
  } catch {
    /* running in browser / CI — no-op */
  }
}

void initCapacitor()

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

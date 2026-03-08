import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock Capacitor plugins — they rely on native bridge unavailable in jsdom
vi.mock('@capacitor/status-bar', () => ({
  StatusBar: { setStyle: vi.fn(), setBackgroundColor: vi.fn() },
  Style: { Dark: 'DARK', Light: 'LIGHT', Default: 'DEFAULT' },
}))
vi.mock('@capacitor/splash-screen', () => ({
  SplashScreen: { hide: vi.fn(), show: vi.fn() },
}))

// jsdom does not implement window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

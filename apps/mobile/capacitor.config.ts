import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.imperium.satellite',
  appName: 'Imperium',
  webDir: 'dist',
  plugins: {
    StatusBar: {
      style: 'default',
      backgroundColor: '#09090b',
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#09090b',
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
}

export default config

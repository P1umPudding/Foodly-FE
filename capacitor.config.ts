import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'io.github.p1umpudding.foodly',
  appName: 'Foodly',
  webDir: 'dist',
  // A LAN test against an http:// backend switches this to 'http' locally, never committed (docs/native.md).
  server: { androidScheme: 'https' },
  // Monochrome drawable (android/app/src/main/res/drawable/ic_stat_foodly.xml); the app icon would show as a white square.
  plugins: { LocalNotifications: { smallIcon: 'ic_stat_foodly' } },
}

export default config

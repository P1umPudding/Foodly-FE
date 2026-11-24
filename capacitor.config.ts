import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'io.github.p1umpudding.foodly',
  appName: 'Foodly',
  webDir: 'dist',
  // A LAN test against an http:// backend switches this to 'http' locally, never committed (docs/native.md).
  server: { androidScheme: 'https' },
}

export default config

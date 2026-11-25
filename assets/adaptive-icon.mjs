// Runs after `capacitor-assets generate` (npm run cap:assets). The tool writes the adaptive-icon layers at 48 dp and
// draws them with a 16.7 % inset, i.e. stretched to 72 dp, so launchers show them blurred. This re-renders both layers
// at 72 dp per density from the sources here. It also replaces drawable-night/splash.png, which the tool writes in
// landscape, with the portrait one, like drawable/splash.png.
import { copyFile } from 'node:fs/promises'
import sharp from 'sharp'

const res = new URL('../android/app/src/main/res/', import.meta.url)
const density = { ldpi: 0.75, mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }

for (const [name, scale] of Object.entries(density)) {
  const px = Math.round(72 * scale)
  for (const layer of ['foreground', 'background']) {
    const source = new URL(`icon-${layer}.png`, import.meta.url)
    await sharp(source.pathname)
      .resize(px, px)
      .png()
      .toFile(new URL(`mipmap-${name}/ic_launcher_${layer}.png`, res).pathname)
  }
}
await copyFile(new URL('drawable-port-night-mdpi/splash.png', res), new URL('drawable-night/splash.png', res))

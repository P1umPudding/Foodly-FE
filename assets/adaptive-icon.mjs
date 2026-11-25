// Runs after `capacitor-assets generate` (npm run cap:assets) and fixes two things in its Android output:
// - The tool writes the adaptive-icon layers at 48 dp and draws them with a 16.7 % inset, i.e. stretched to 72 dp, so
//   launchers show them blurred. The foreground is re-rendered at 72 dp (keeping the inset). The background loses the
//   inset and is rendered at the full 108 dp: inset, it left the outer 18 dp transparent, which launchers reveal when
//   they move or pulse the icon.
// - drawable-night/splash.png comes out in landscape; it is replaced with the portrait one, like drawable/splash.png.
import { copyFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const res = new URL('../android/app/src/main/res/', import.meta.url)
const density = { ldpi: 0.75, mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 }
const layers = { foreground: 72, background: 108 }

for (const [name, scale] of Object.entries(density)) {
  for (const [layer, dp] of Object.entries(layers)) {
    const px = Math.round(dp * scale)
    await sharp(fileURLToPath(new URL(`icon-${layer}.png`, import.meta.url)))
      .resize(px, px)
      .png()
      .toFile(fileURLToPath(new URL(`mipmap-${name}/ic_launcher_${layer}.png`, res)))
  }
}

const adaptiveIcon = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background" />
    <foreground>
        <inset android:drawable="@mipmap/ic_launcher_foreground" android:inset="16.7%" />
    </foreground>
</adaptive-icon>
`
for (const file of ['ic_launcher.xml', 'ic_launcher_round.xml'])
  await writeFile(new URL(`mipmap-anydpi-v26/${file}`, res), adaptiveIcon)

await copyFile(new URL('drawable-port-night-mdpi/splash.png', res), new URL('drawable-night/splash.png', res))

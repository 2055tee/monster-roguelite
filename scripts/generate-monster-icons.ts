/**
 * Turns the full-background monster art in public/monsters/*.jpg into
 * transparent-background square icons in public/monsters/icons/*.png,
 * using local ML background removal (no API key, no billing, runs offline
 * after the first model download).
 *
 * Usage:
 *   npx tsx scripts/generate-monster-icons.ts
 *   npx tsx scripts/generate-monster-icons.ts sprigling cinderpup
 */
import { removeBackground } from '@imgly/background-removal-node';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ART_DIR = path.resolve(__dirname, '../public/monsters');
const ICON_DIR = path.join(ART_DIR, 'icons');
const ICON_SIZE = 256;

async function main() {
  const requested = process.argv.slice(2).map((s) => s.toLowerCase());
  await mkdir(ICON_DIR, { recursive: true });

  const files = (await readdir(ART_DIR)).filter(
    (f) => /\.(jpg|jpeg|png)$/i.test(f) && f !== 'icons'
  );
  const targets = requested.length
    ? files.filter((f) => requested.includes(path.parse(f).name.toLowerCase()))
    : files;

  if (targets.length === 0) {
    console.error('No matching art files found for:', requested.join(', '));
    process.exit(1);
  }

  for (const file of targets) {
    const slug = path.parse(file).name.toLowerCase();
    console.log(`Processing ${file}...`);

    const srcPath = path.join(ART_DIR, file);
    const srcBuffer = await readFile(srcPath);
    const mediaType = file.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    const blob = new Blob([srcBuffer], { type: mediaType });

    const cutoutBlob = await removeBackground(blob);
    const cutoutBuffer = Buffer.from(await cutoutBlob.arrayBuffer());

    // Trim transparent padding, then fit into a square canvas with a small margin.
    const trimmed = sharp(cutoutBuffer).trim();
    const trimmedBuffer = await trimmed.png().toBuffer();

    const icon = await sharp(trimmedBuffer)
      .resize(ICON_SIZE - 24, ICON_SIZE - 24, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: 12,
        bottom: 12,
        left: 12,
        right: 12,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toBuffer();

    const outPath = path.join(ICON_DIR, `${slug}.png`);
    await writeFile(outPath, icon);
    console.log(`  saved -> ${path.relative(process.cwd(), outPath)}`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

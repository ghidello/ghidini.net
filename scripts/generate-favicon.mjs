// Generate a real multi-resolution favicon.ico from public/favicon.svg.
//
// The previous favicon.ico was actually a renamed PNG (the Astro default).
// This derives the .ico straight from our own SVG so the two never drift,
// wrapping PNG frames (16/32/48px) in a standard ICO container — a format
// every modern browser and OS understands.
//
// Run on demand: `node scripts/generate-favicon.mjs`
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const SVG = 'public/favicon.svg';
const OUT = 'public/favicon.ico';
const SIZES = [16, 32, 48];

const svg = await readFile(SVG);
const pngs = await Promise.all(
  SIZES.map((size) => sharp(svg, { density: 384 }).resize(size, size).png().toBuffer()),
);

// Build the ICO container: 6-byte ICONDIR header + 16-byte entry per image,
// followed by the raw PNG frames.
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type: 1 = icon
header.writeUInt16LE(pngs.length, 4); // image count

const entries = [];
let offset = 6 + pngs.length * 16;
for (let i = 0; i < pngs.length; i++) {
  const size = SIZES[i];
  const png = pngs[i];
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 means 256)
  entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // palette count
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // color planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8); // image data size
  entry.writeUInt32LE(offset, 12); // image data offset
  entries.push(entry);
  offset += png.length;
}

await writeFile(OUT, Buffer.concat([header, ...entries, ...pngs]));
console.log(`[favicon] wrote ${OUT} (${SIZES.join(', ')}px) from ${SVG}`);

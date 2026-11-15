/**
 * Generuje src/app/favicon.ico z istniejącego src/app/icon.svg (bez nowych grafik).
 * ICO z osadzonymi PNG 16/32/48 px. Uruchom: npx tsx scripts/build-favicon.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SIZES = [16, 32, 48];
const root = path.resolve(import.meta.dirname, "..");

async function main() {
  const svg = readFileSync(path.join(root, "src/app/icon.svg"));
  const images = await Promise.all(SIZES.map((size) => sharp(svg, { density: 384 }).resize(size, size).png().toBuffer()));

  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2); // typ: ikona
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map((png, i) => {
    const entry = Buffer.alloc(16);
    const size = SIZES[i]!;
    entry.writeUInt8(size, 0);
    entry.writeUInt8(size, 1);
    entry.writeUInt16LE(1, 4); // płaszczyzny
    entry.writeUInt16LE(32, 6); // bity na piksel
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += png.length;
    return entry;
  });
  writeFileSync(path.join(root, "src/app/favicon.ico"), Buffer.concat([header, ...entries, ...images]));
  console.log(`favicon.ico: ${offset} B (${SIZES.join(", ")} px)`);
}

void main();

/**
 * Przygotowuje zdjęcia strony w formatach AVIF i WebP (wynik trafia do public/img i jest w repozytorium).
 * Uruchom ponownie po podmianie plików w assets/photos:  npm run images
 */
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

interface Variant {
  name: string;
  source: string;
  /** Kadr w pikselach pliku źródłowego */
  crop: { left: number; top: number; width: number; height: number };
  widths: number[];
}

// Kadry klimatyzacja.jpg (1116×1182) wycinają baner w tle (inna stacja i obce marki)
// oraz znak wodny u dołu – zostaje stacja TEXA Konfort 715R i wózek z osprzętem.
const VARIANTS: Variant[] = [
  {
    name: "klimatyzacja-stanowisko",
    source: "assets/photos/klimatyzacja.jpg",
    crop: { left: 40, top: 430, width: 1060, height: 670 },
    widths: [530, 1060],
  },
  {
    name: "klimatyzacja-texa-715r",
    source: "assets/photos/klimatyzacja.jpg",
    crop: { left: 676, top: 425, width: 430, height: 680 },
    widths: [430],
  },
];

async function main() {
  await mkdir("public/img", { recursive: true });
  for (const v of VARIANTS) {
    for (const width of v.widths) {
      const base = sharp(v.source).rotate().extract(v.crop).resize({ width, withoutEnlargement: true });
      await base.clone().avif({ quality: 55 }).toFile(`public/img/${v.name}-${width}.avif`);
      await base.clone().webp({ quality: 76 }).toFile(`public/img/${v.name}-${width}.webp`);
      console.log(`public/img/${v.name}-${width}.{avif,webp}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

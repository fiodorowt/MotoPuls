import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type OutputInfo } from "sharp";
import { randomToken } from "./crypto";
import { env } from "./env";

export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
const MAX_EDGE = 1920;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "avif"]);
const FILENAME_RE = /^[A-Za-z0-9_-]{16,64}\.webp$/;

export class UploadError extends Error {}

function uploadDir(): string {
  return path.resolve(env().UPLOAD_DIR);
}

/**
 * Bezpieczny zapis zdjęcia: typ rozpoznajemy po zawartości (nie po nazwie ani nagłówku),
 * obraz dekodujemy i kodujemy od nowa do WebP – to usuwa EXIF (w tym GPS) i wszystko,
 * co nie jest pikselami. Nazwa pliku jest losowa, nigdy nie pochodzi od użytkownika.
 */
export async function saveImage(file: File): Promise<{ filename: string; width: number; height: number }> {
  if (file.size === 0) throw new UploadError("Wybierz plik ze zdjęciem.");
  if (file.size > UPLOAD_MAX_BYTES) throw new UploadError("Plik jest za duży (limit 5 MB).");
  const input = Buffer.from(await file.arrayBuffer());

  let output: { data: Buffer; info: OutputInfo };
  try {
    const image = sharp(input, { limitInputPixels: 50_000_000, failOn: "error" });
    const meta = await image.metadata();
    if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) throw new UploadError("Dozwolone formaty: JPG, PNG, WebP, AVIF.");
    output = await image
      .rotate() // obrót wg EXIF, zanim metadane zostaną usunięte
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
  } catch (error) {
    if (error instanceof UploadError) throw error;
    throw new UploadError("Nie udało się odczytać pliku jako zdjęcia.");
  }

  const filename = `${randomToken().slice(0, 32)}.webp`;
  await mkdir(uploadDir(), { recursive: true });
  await writeFile(path.join(uploadDir(), filename), output.data, { flag: "wx" });
  return { filename, width: output.info.width, height: output.info.height };
}

function safePath(filename: string): string | null {
  return FILENAME_RE.test(filename) ? path.join(uploadDir(), filename) : null;
}

export async function readImage(filename: string): Promise<Buffer | null> {
  const file = safePath(filename);
  if (!file) return null;
  try {
    return await readFile(file);
  } catch {
    return null;
  }
}

export async function deleteImage(filename: string): Promise<void> {
  const file = safePath(filename);
  if (!file) return;
  await unlink(file).catch(() => undefined);
}

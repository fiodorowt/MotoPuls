import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { readImage } from "@/lib/upload";

/** Zdjęcia z galerii. Nieopublikowane widzi tylko zalogowany użytkownik panelu. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{10,40}$/.test(id)) return new Response(null, { status: 404 });
  const media = await db.media.findUnique({ where: { id } });
  if (!media) return new Response(null, { status: 404 });
  if (!media.published) {
    const session = await getSession();
    if (!session?.twoFactorPassed) return new Response(null, { status: 404 });
  }
  const data = await readImage(media.filename);
  if (!data) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      "Content-Length": String(data.length),
      "Cache-Control": media.published ? "public, max-age=86400" : "private, no-store",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}

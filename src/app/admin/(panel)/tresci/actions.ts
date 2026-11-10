"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/audit";
import { f, runAction } from "@/lib/admin/run";
import { requireOwner } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type { FormState } from "@/lib/form-state";
import { rateLimit } from "@/lib/rate-limit";
import { UploadError, deleteImage, saveImage } from "@/lib/upload";

export async function saveContentBlock(_prev: FormState, formData: FormData): Promise<FormState> {
  const schema = z.object({ key: z.string().min(1).max(60), title: f.str(1, 200, "Tytuł"), body: f.str(1, 2000, "Treść") });
  return runAction(formData, { schema, owner: true }, async ({ key, ...data }, user) => {
    await db.contentBlock.update({ where: { key }, data });
    await audit({ actor: user.email, userId: user.id, action: "content.update", entity: "ContentBlock", entityId: key });
  });
}

const testimonialSchema = z.object({
  id: z.string().max(40).optional(),
  author: f.str(2, 80, "Autor"),
  text: f.str(10, 1000, "Treść opinii"),
  rating: f.int(1, 5, "Ocena"),
  published: f.checkbox,
  sortOrder: f.int(0, 999, "Kolejność"),
});

export async function saveTestimonial(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction(formData, { schema: testimonialSchema, owner: true }, async ({ id, ...data }, user) => {
    const row = id ? await db.testimonial.update({ where: { id }, data }) : await db.testimonial.create({ data });
    await audit({ actor: user.email, userId: user.id, action: id ? "testimonial.update" : "testimonial.create", entity: "Testimonial", entityId: row.id });
    return { ok: true, message: id ? "Zapisano." : "Opinia dodana." };
  });
}

export async function deleteTestimonial(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction(formData, { schema: z.object({ id: f.id }), owner: true }, async ({ id }, user) => {
    await db.testimonial.delete({ where: { id } });
    await audit({ actor: user.email, userId: user.id, action: "testimonial.delete", entity: "Testimonial", entityId: id });
    return { ok: true, message: "Opinia usunięta." };
  });
}

/** Wgrywanie zdjęcia: plik jest sprawdzany i przekodowywany w saveImage (typ, rozmiar, usunięcie EXIF). */
export async function uploadMedia(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireOwner();
  if (!(await rateLimit(`upload:${user.id}`, 30, 600))) return { ok: false, message: "Zbyt wiele plików naraz. Odczekaj kilka minut." };
  const alt = String(formData.get("alt") ?? "").trim();
  if (alt.length < 3 || alt.length > 200) return { ok: false, message: "Opisz zdjęcie (3–200 znaków) – opis czytają czytniki ekranu i wyszukiwarki." };
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, message: "Wybierz plik ze zdjęciem." };

  try {
    const image = await saveImage(file);
    const media = await db.media.create({ data: { ...image, alt } });
    await audit({ actor: user.email, userId: user.id, action: "media.upload", entity: "Media", entityId: media.id });
  } catch (error) {
    if (error instanceof UploadError) return { ok: false, message: error.message };
    throw error;
  }
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Zdjęcie dodane." };
}

export async function saveMedia(_prev: FormState, formData: FormData): Promise<FormState> {
  const schema = z.object({ id: f.id, alt: f.str(3, 200, "Opis zdjęcia"), published: f.checkbox, sortOrder: f.int(0, 999, "Kolejność") });
  return runAction(formData, { schema, owner: true }, async ({ id, ...data }) => {
    await db.media.update({ where: { id }, data });
  });
}

export async function deleteMedia(_prev: FormState, formData: FormData): Promise<FormState> {
  return runAction(formData, { schema: z.object({ id: f.id }), owner: true }, async ({ id }, user) => {
    const media = await db.media.delete({ where: { id } });
    await deleteImage(media.filename);
    await audit({ actor: user.email, userId: user.id, action: "media.delete", entity: "Media", entityId: id });
    return { ok: true, message: "Zdjęcie usunięte." };
  });
}

import "dotenv/config";
import { db } from "@/lib/db";
import { generatePassword, hashPassword } from "@/lib/auth/password";
import { DEFAULT_TEMPLATES } from "@/lib/email/templates";
import { CATEGORIES, CONTENT_BLOCKS, OPENING_HOURS, SETTINGS } from "./seed-data";

/** Idempotentny seed: tworzy tylko to, czego jeszcze nie ma – nie nadpisuje zmian z panelu. */
async function main() {
  await db.settings.upsert({ where: { id: 1 }, create: { id: 1, ...SETTINGS }, update: {} });

  for (const h of OPENING_HOURS) {
    await db.openingHours.upsert({ where: { weekday: h.weekday }, create: h, update: {} });
  }

  for (const [index, category] of CATEGORIES.entries()) {
    const { services, ...data } = category;
    const existing = await db.serviceCategory.findUnique({ where: { slug: category.slug } });
    if (existing) continue;
    await db.serviceCategory.create({
      data: {
        ...data,
        sortOrder: index,
        services: {
          create: services.map((s, i) => ({
            name: s.name,
            description: s.description,
            durationMin: s.durationMin,
            requiresRefrigerant: s.requiresRefrigerant ?? false,
            sortOrder: i,
          })),
        },
      },
    });
  }

  for (const block of CONTENT_BLOCKS) {
    await db.contentBlock.upsert({ where: { key: block.key }, create: block, update: {} });
  }

  for (const [key, template] of Object.entries(DEFAULT_TEMPLATES)) {
    await db.emailTemplate.upsert({ where: { key }, create: { key, ...template }, update: {} });
  }

  if ((await db.user.count()) === 0) {
    const email = (process.env.ADMIN_EMAIL ?? SETTINGS.email).toLowerCase();
    // Testy E2E podają własne hasło startowe; w każdym innym przypadku jest losowe.
    const password = process.env.SEED_ADMIN_PASSWORD ?? generatePassword();
    await db.user.create({
      data: {
        email,
        name: process.env.ADMIN_NAME ?? "Właściciel",
        role: "OWNER",
        passwordHash: await hashPassword(password),
        mustChangePassword: true,
      },
    });
    if (!process.env.SEED_ADMIN_PASSWORD) {
      console.log("\n==================== KONTO WŁAŚCICIELA ====================");
      console.log(` Login:  ${email}`);
      console.log(` Hasło:  ${password}`);
      console.log(" Hasło jest jednorazowe – przy pierwszym logowaniu ustawisz");
      console.log(" własne oraz skonfigurujesz weryfikację dwuetapową (2FA).");
      console.log(" To hasło nie zostanie wyświetlone ponownie.");
      console.log("===========================================================\n");
    }
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });

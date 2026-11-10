/**
 * Awaryjne odzyskanie dostępu do panelu (np. utrata telefonu z 2FA przez jedynego właściciela).
 * Wymaga dostępu do serwera i bazy – uruchom:  npm run admin:reset -- adres@email
 * Ustawia nowe hasło jednorazowe, usuwa 2FA i kończy wszystkie sesje konta.
 */
import "dotenv/config";
import { generatePassword, hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";

async function main() {
  const email = process.argv[2]?.toLowerCase();
  if (!email) throw new Error("Podaj adres e-mail konta: npm run admin:reset -- adres@email");
  const user = await db.user.findUnique({ where: { email } });
  if (!user) throw new Error("Nie ma konta z tym adresem e-mail.");

  const password = generatePassword();
  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(password),
        mustChangePassword: true,
        active: true,
        totpEnabled: false,
        totpSecretEnc: null,
        totpLastStep: null,
        failedAttempts: 0,
        lockedUntil: null,
      },
    }),
    db.session.deleteMany({ where: { userId: user.id } }),
    db.auditLog.create({ data: { actor: "system (admin-reset)", action: "user.emergency_reset", entity: "User", entityId: user.id } }),
  ]);

  console.log(`\nKonto ${email}: nowe hasło jednorazowe: ${password}`);
  console.log("Przy logowaniu ustawisz własne hasło i ponownie skonfigurujesz 2FA.\n");
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await db.$disconnect();
    process.exit(1);
  });

import { Field } from "@/components/form";
import { PASSWORD_MIN } from "@/lib/auth/password";

export function NewPasswordFields() {
  return (
    <>
      <Field
        label="Nowe hasło"
        name="password"
        type="password"
        required
        autoComplete="new-password"
        minLength={PASSWORD_MIN}
        hint={`Co najmniej ${PASSWORD_MIN} znaków. Najlepiej kilka losowych słów albo hasło z menedżera haseł.`}
      />
      <Field label="Powtórz nowe hasło" name="repeat" type="password" required autoComplete="new-password" />
    </>
  );
}

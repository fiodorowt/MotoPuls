/** Wynik akcji serwerowej formularza (useActionState). */
export interface FormState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
  /** Wartości do ponownego wypełnienia formularza po błędzie */
  values?: Record<string, string>;
}

export const EMPTY_FORM: FormState = { ok: false };

/** Pola tekstowe formularza jako zwykły obiekt (bez plików). */
export function formValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION")) out[key] = value;
  }
  return out;
}

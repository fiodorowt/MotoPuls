import { TurboLoader } from "@/components/brand/Logo";

/** Widoczny od razu stan ładowania stron publicznych (np. zimny start serwera); stała wysokość ogranicza skoki układu. */
export default function Loading() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center px-4">
      <TurboLoader label="Wczytywanie strony…" />
    </div>
  );
}

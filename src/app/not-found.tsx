import Link from "next/link";
import { TurboIcon } from "@/components/brand/Logo";

export default function NotFound() {
  return (
    <main className="container-page flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
      <TurboIcon className="text-fg h-24 w-auto" />
      <h1 className="mt-8 text-3xl sm:text-5xl">Nie ma takiej strony</h1>
      <p className="text-muted mt-4 max-w-md">Adres jest nieprawidłowy albo strona została przeniesiona.</p>
      <Link href="/" className="btn btn-primary mt-8">
        Wróć na stronę główną
      </Link>
    </main>
  );
}

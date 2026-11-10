"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="container-page flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
      <h1 className="text-3xl sm:text-5xl">Coś poszło nie tak</h1>
      <p className="text-muted mt-4 max-w-md">Spróbuj ponownie za chwilę. Jeśli problem się powtarza, zadzwoń do nas.</p>
      <button type="button" className="btn btn-primary mt-8" onClick={reset}>
        Spróbuj ponownie
      </button>
    </main>
  );
}

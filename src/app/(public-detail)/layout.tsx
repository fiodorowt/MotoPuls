// Ten sam układ co strony publiczne. Trasy z `notFound()` i parametrem dynamicznym (np. rezerwacja/[token])
// leżą w osobnej grupie, bo `(public)/loading.tsx` powoduje strumieniowanie odpowiedzi ze statusem 200,
// a nieistniejący token musi dawać 404 (test E2E "link z nieistniejącym tokenem").
export { default } from "../(public)/layout";

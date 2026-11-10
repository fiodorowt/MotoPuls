import type { Metadata } from "next";
import { Logo } from "@/components/brand/Logo";

export const metadata: Metadata = {
  title: { default: "Panel", template: "%s | Panel Moto Puls" },
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <Logo className="text-fg mx-auto mb-8 h-12 w-auto" />
      <div className="card">{children}</div>
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getCurrentUser } from "@/lib/server-api";
import { AuthActions } from "./auth-actions";

export const metadata: Metadata = {
  title: "DreamyVoice",
  description: "Self-hosted каталог релизов команды DreamyVoice",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="ru">
      <body>
        <header>
          <Link href="/">DreamyVoice</Link>
          <nav>
            <Link href="/">Каталог</Link>
            <Link href="/admin">Админка</Link>
          </nav>
          <AuthActions currentUser={currentUser} />
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}

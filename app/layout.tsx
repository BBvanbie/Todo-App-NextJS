import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Todoアプリ",
  description: "Neon + Prisma で作る個人用Todoダッシュボード",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

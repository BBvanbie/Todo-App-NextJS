import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next Todos",
  description: "Personal todo dashboard with Neon + Prisma",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}

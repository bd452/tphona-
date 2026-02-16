import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tphona | Business eSIM Platform",
  description:
    "Ramp-style controls for mobile connectivity: provision eSIMs, manage spend, and optimize cellular usage per employee.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

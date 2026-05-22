import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MTG Art Game",
  description: "Guess which Magic: The Gathering card art is older."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
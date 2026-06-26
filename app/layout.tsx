import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next Slide",
  description: "SaaS para gestão à vista em TVs corporativas."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body>{children}</body>
    </html>
  );
}

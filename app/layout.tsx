import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Next Slide",
  description: "SaaS para gestão à vista em TVs corporativas.",
  icons: {
    icon: "/brand/next-slide-logo.png",
    apple: "/brand/next-slide-logo.png"
  },
  openGraph: {
    title: "Next Slide",
    description: "SaaS para gestão à vista em TVs corporativas.",
    images: ["/brand/next-slide-logo.png"]
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body>{children}</body>
    </html>
  );
}

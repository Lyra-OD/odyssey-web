import "./globals.css";
import { Inter, Montserrat, Playfair_Display } from "next/font/google";
import type { ReactNode } from "react";

const editorialFont = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-editorial",
  weight: ["400", "500", "600", "700"],
});

const labelFont = Inter({
  subsets: ["latin"],
  variable: "--font-label",
  weight: ["400", "500", "600", "700"],
});

const brandFont = Montserrat({
  subsets: ["latin"],
  variable: "--font-brand",
  weight: ["300", "400", "500", "600", "700"],
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${editorialFont.variable} ${labelFont.variable} ${brandFont.variable} bg-black text-white antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

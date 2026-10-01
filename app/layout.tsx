import "./globals.css";
import type { ReactNode } from "react";

import { brandFont, editorialFont, labelFont } from "@/src/lib/fonts";

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

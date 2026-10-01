import { Inter, Montserrat, Playfair_Display } from "next/font/google";

/**
 * Playfair = `--font-editorial` / `font-editorial`.
 * Exporter `.className` pour sas/player (la seule variable CSS peut perdre face à Inter).
 */
export const editorialFont = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-editorial",
  weight: ["400", "500", "600", "700"],
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
  adjustFontFallback: false,
});

export const labelFont = Inter({
  subsets: ["latin"],
  variable: "--font-label",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const brandFont = Montserrat({
  subsets: ["latin"],
  variable: "--font-brand",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

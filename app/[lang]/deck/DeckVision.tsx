"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

import { editorialFont } from "@/src/lib/fonts";

import { DECK_VISION_CLASS } from "./deckSoftDock";
import { highlightDeckTeal } from "./deckTealText";

type DeckVisionProps = {
  text: string;
  className?: string;
} & Omit<HTMLMotionProps<"p">, "children" | "className">;

/**
 * Vision deck — Playfair + teal, une phrase = une ligne (`\n` dans le JSON).
 * Évite les coupures molles au milieu d’une intention.
 */
export function DeckVision({ text, className = "", ...rest }: DeckVisionProps) {
  const lines = text.split("\n").filter((line) => line.length > 0);

  return (
    <motion.p
      className={`${editorialFont.className} ${DECK_VISION_CLASS} text-center ${className}`}
      style={{ WebkitFontSmoothing: "antialiased" }}
      {...rest}
    >
      {lines.map((line, i) => (
        <span key={`deck-vision-${i}`} className="block">
          {highlightDeckTeal(line)}
        </span>
      ))}
    </motion.p>
  );
}

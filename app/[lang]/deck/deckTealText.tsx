"use client";

import type { ReactNode } from "react";

import { DeckSoftCapWord } from "./DeckSoftCapTip";

/**
 * Mots / chiffres investisseur en teal dans les corps deck.
 * Phrases entières = non. FR + EN dans la même liste.
 * Soft Cap = bulle définition (DeckSoftCapWord).
 */
export const DECK_TEAL_TOKENS = [
  "graphe de données",
  "data graph",
  "tous les budgets",
  "every budget",
  "infrastructure de la mémoire",
  "infrastructure of memory",
  "Souvenir Memory Chest",
  "Coffre Souvenir",
  "émotion est collective",
  "emotion is collective",
  "émotion est déjà collective",
  "emotion is already collective",
  "triple friction",
  "pic émotionnel",
  "emotional peak",
  "cercle",
  "circle",
  "photos",
  "dépenses d’acquisition",
  "dépenses d'acquisition",
  "acquisition spend",
  "Quiet Luxury",
  "Soft Cap",
  "RevShare",
  "Loi 25",
  "Law 25",
  "Facebook",
  "paywall",
  "Amazon",
  "Espace Memoria",
  "Lépine Cloutier",
  "Urgel Bourgie",
  "Sanctuaire",
  "Sanctuary",
  "Athos",
  "Lyra",
  "MRR",
  "clé USB",
  "USB drives",
  "30 secondes",
  "30 seconds",
  "quelques secondes",
  "in seconds",
  "quasi nul",
  "near zero",
  "sans stock",
  "zero inventory",
  "Code prêt pour un exit Silicon Valley",
  "Code ready for a Silicon Valley exit",
  "Silicon Valley",
  "90 jours",
  "90 days",
  "Endgame",
  "Marketplace",
  "équipe terrain",
  "field team",
  "30 %",
  "30%",
  "0 $",
  "$0",
  "22 $",
  "$22",
  "43 $",
  "$43",
  "10 %",
  "10%",
  "179 $",
  "$179",
  "349 $",
  "$349",
  "commission",
] as const;

const DECK_TEAL_SET = new Set<string>(DECK_TEAL_TOKENS);

const DECK_TEAL_RE = new RegExp(
  `(${[...DECK_TEAL_TOKENS]
    .sort((a, b) => b.length - a.length)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|")})`,
  "g",
);

export function highlightDeckTeal(text: string): ReactNode {
  const parts = text.split(DECK_TEAL_RE);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (part === "Soft Cap") {
      return <DeckSoftCapWord key={`soft-${i}`} />;
    }
    if (DECK_TEAL_SET.has(part)) {
      return (
        <span key={`tok-${i}`} className="font-medium text-[var(--salon-cyan)]">
          {part}
        </span>
      );
    }
    return <span key={`txt-${i}`}>{part}</span>;
  });
}

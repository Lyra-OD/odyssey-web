/**
 * Extrait une année YYYY depuis une date wizard (ISO ou texte libre).
 * Pas de jour/mois pour les cartes intro/outro Creatomate.
 */

const YEAR_RE = /\b(1[0-9]{3}|20[0-9]{2})\b/;

export function yearFromDate(raw?: string | null): string | null {
  const s = raw?.trim();
  if (!s) return null;

  // ISO YYYY-MM-DD (ou préfixe année)
  if (/^\d{4}(-\d{2}(-\d{2})?)?$/.test(s)) {
    return s.slice(0, 4);
  }

  const m = s.match(YEAR_RE);
  return m ? m[1] : null;
}

/** Ligne intro/outro : "1940 - 2026" (années seules). */
export function formatYearsLine(
  birthYear: string | null,
  deathYear: string | null,
): string | null {
  if (birthYear && deathYear) return `${birthYear} - ${deathYear}`;
  if (deathYear) return deathYear;
  if (birthYear) return birthYear;
  return null;
}

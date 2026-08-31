/**
 * Tropical zodiac from ISO birth date (YYYY-MM-DD).
 * Cusps classiques (soleil) — suffisant pour silhouette constellation démo.
 */

export type ZodiacSign =
  | "aries"
  | "taurus"
  | "gemini"
  | "cancer"
  | "leo"
  | "virgo"
  | "libra"
  | "scorpio"
  | "sagittarius"
  | "capricorn"
  | "aquarius"
  | "pisces";

/** [month, day] inclusive start of each sign (tropical). */
const ZODIAC_STARTS: readonly { sign: ZodiacSign; month: number; day: number }[] =
  [
    { sign: "capricorn", month: 12, day: 22 },
    { sign: "aquarius", month: 1, day: 20 },
    { sign: "pisces", month: 2, day: 19 },
    { sign: "aries", month: 3, day: 21 },
    { sign: "taurus", month: 4, day: 20 },
    { sign: "gemini", month: 5, day: 21 },
    { sign: "cancer", month: 6, day: 21 },
    { sign: "leo", month: 7, day: 23 },
    { sign: "virgo", month: 8, day: 23 },
    { sign: "libra", month: 9, day: 23 },
    { sign: "scorpio", month: 10, day: 23 },
    { sign: "sagittarius", month: 11, day: 22 },
  ];

/**
 * @returns null si date vide / invalide.
 * Libra = 23 sept → 22 oct (ex. fin septembre → Balance).
 */
export function birthDateToZodiacSign(isoDate: string): ZodiacSign | null {
  const trimmed = isoDate.trim();
  if (!trimmed) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    return null;
  }

  const md = month * 100 + day;
  // Capricorn wraps year-end: Dec 22–Jan 19
  if (md >= 1222 || md <= 119) return "capricorn";
  if (md >= 120 && md <= 218) return "aquarius";
  if (md >= 219 && md <= 320) return "pisces";
  if (md >= 321 && md <= 419) return "aries";
  if (md >= 420 && md <= 520) return "taurus";
  if (md >= 521 && md <= 620) return "gemini";
  if (md >= 621 && md <= 722) return "cancer";
  if (md >= 723 && md <= 822) return "leo";
  if (md >= 823 && md <= 922) return "virgo";
  if (md >= 923 && md <= 1022) return "libra";
  if (md >= 1023 && md <= 1121) return "scorpio";
  return "sagittarius";
}

/** Exposé pour tests / docs — starts table. */
export const ZODIAC_SIGN_STARTS = ZODIAC_STARTS;

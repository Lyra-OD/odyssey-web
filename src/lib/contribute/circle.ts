/**
 * Cercle des proches — preuve sociale Sanctuaire (pas de montants $).
 * Agrège dépôts gratuits (media_assets guest) + empreintes payées (guest_micro_checkouts completed).
 */

export type CircleRole =
  | "present"
  | "voice"
  | "video"
  | "coproducer"
  | "candle"
  | "patron";

export type CircleMember = {
  displayName: string;
  role: CircleRole;
};

const ROLE_LABEL: Record<
  CircleRole,
  { fr: string; en: string }
> = {
  present: { fr: "Présent", en: "Present" },
  voice: { fr: "Voix", en: "Voice" },
  video: { fr: "Présence vidéo", en: "Video presence" },
  coproducer: { fr: "Coproducteur", en: "Co-producer" },
  candle: { fr: "Geste", en: "Gesture" },
  patron: { fr: "Mécène", en: "Patron" },
};

export function circleRoleLabel(
  role: CircleRole,
  locale: "fr" | "en",
): string {
  return ROLE_LABEL[role][locale];
}

export function roleFromProductKey(productKey: string | null | undefined): CircleRole {
  switch (productKey) {
    case "guest_voice":
      return "voice";
    case "guest_video":
      return "video";
    case "guest_heritage":
      return "coproducer";
    case "guest_candle":
      return "candle";
    case "guest_patron":
      return "patron";
    default:
      return "present";
  }
}

/** Affichage Quiet Luxury : « Marc D. » (jamais email complet). */
export function formatCircleDisplayName(
  name: string | null | undefined,
  email?: string | null,
): string | null {
  const raw = (name ?? "").trim();
  if (raw.length > 0) {
    const parts = raw.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0];
    const first = parts[0];
    const lastInitial = parts[parts.length - 1]?.charAt(0)?.toUpperCase();
    return lastInitial ? `${first} ${lastInitial}.` : first;
  }
  const em = (email ?? "").trim();
  if (!em || !em.includes("@")) return null;
  const local = em.split("@")[0] ?? "";
  if (local.length < 2) return null;
  return `${local.slice(0, 1).toUpperCase()}${local.slice(1, 3)}…`;
}

type RawEntry = {
  displayName: string;
  role: CircleRole;
  at: number;
};

/**
 * Déduplique par displayName (garde le rôle le « plus élevé » si plusieurs gestes).
 */
const ROLE_RANK: Record<CircleRole, number> = {
  present: 0,
  candle: 1,
  voice: 2,
  video: 3,
  coproducer: 4,
  patron: 5,
};

export function mergeCircleEntries(
  entries: RawEntry[],
  limit = 24,
): CircleMember[] {
  const byName = new Map<string, RawEntry>();
  for (const e of entries) {
    const key = e.displayName.toLowerCase();
    const prev = byName.get(key);
    if (!prev || ROLE_RANK[e.role] >= ROLE_RANK[prev.role]) {
      byName.set(key, e);
    }
  }
  return Array.from(byName.values())
    .sort((a, b) => b.at - a.at)
    .slice(0, limit)
    .map(({ displayName, role }) => ({ displayName, role }));
}

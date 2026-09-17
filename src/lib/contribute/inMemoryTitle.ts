import type { Locale } from "@/i18n.config";

export type TributeNameBits = {
  firstName: string | null;
  lastName: string | null;
  displayName?: string;
};

export function tributeDisplayName(
  tribute: TributeNameBits,
  locale: Locale,
): string {
  if (tribute.displayName?.trim()) return tribute.displayName.trim();
  const parts = [tribute.firstName, tribute.lastName]
    .map((p) => (p ?? "").trim())
    .filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  return locale === "en" ? "a loved one" : "un être cher";
}

export function tributeSkyName(
  tribute: TributeNameBits,
  locale: Locale,
): string {
  const first = tribute.firstName?.trim();
  if (first) return first;
  return tributeDisplayName(tribute, locale);
}

/** Titre ciel invité — FR élision, EN « In loving memory of ». */
export function inMemoryOfTitle(name: string, locale: Locale): string {
  const trimmed = name.trim();
  if (locale === "en") {
    return trimmed ? `In loving memory of ${trimmed}` : "In loving memory";
  }
  if (!trimmed) return "En mémoire";
  const first = trimmed.charAt(0).normalize("NFD")[0]?.toLowerCase() ?? "";
  const elide = "aeiouy".includes(first);
  return elide ? `En mémoire d’${trimmed}` : `En mémoire de ${trimmed}`;
}

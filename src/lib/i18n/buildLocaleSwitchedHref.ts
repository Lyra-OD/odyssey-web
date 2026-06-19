import type { Locale } from "@/i18n.config";
import { appRoutes } from "@/src/lib/appRoutes";

function withSwappedNextLocale(search: string, nextLang: Locale): string {
  if (!search) return "";
  const query = search.startsWith("?") ? search.slice(1) : search;
  if (!query) return "";

  const params = new URLSearchParams(query);
  const next = params.get("next");
  if (next && /^\/(fr|en)(\/|$)/.test(next)) {
    const parts = next.split("/").filter(Boolean);
    parts[0] = nextLang;
    params.set("next", `/${parts.join("/")}`);
  }

  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

/** Builds the target href when switching locale — preserves query (incl. `?partenaire=`, `?next=`). */
export function buildLocaleSwitchedHref(
  pathname: string,
  nextLang: Locale,
  search = "",
  hash = "",
): string {
  const currentPath = pathname || "/";
  const nextSearch = withSwappedNextLocale(search, nextLang);

  if (currentPath === "/login") {
    return appRoutes.studioConnexion(nextLang);
  }

  const legacyLoginMatch = /^\/(fr|en)\/login$/.exec(currentPath);
  if (legacyLoginMatch) {
    return appRoutes.studioConnexion(nextLang);
  }

  const connexionMatch = /^\/(fr|en)\/(studio|salon)\/connexion\/?$/.exec(
    currentPath,
  );
  if (connexionMatch) {
    const segment = connexionMatch[2] as "studio" | "salon";
    const base =
      segment === "salon"
        ? appRoutes.salonConnexion(nextLang)
        : appRoutes.studioConnexion(nextLang);
    return `${base}${nextSearch}${hash}`;
  }

  const parts = currentPath.split("/").filter(Boolean);
  const rest =
    parts[0] === "fr" || parts[0] === "en" ? parts.slice(1) : parts;
  const nextPath = `/${nextLang}${rest.length > 0 ? `/${rest.join("/")}` : ""}`;
  return `${nextPath}${nextSearch}${hash}`;
}

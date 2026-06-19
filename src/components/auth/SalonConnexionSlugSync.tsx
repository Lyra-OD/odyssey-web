"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import {
  persistPartnerConnexionSlug,
  readPartnerConnexionSlug,
} from "@/src/lib/partner/partnerBrandingTypes";

type SalonConnexionSlugSyncProps = {
  /** Slug déjà validé côté serveur (URL). */
  slugFromUrl: string | null;
};

/**
 * Option B — persiste le slug et force un reload serveur si mémorisé sans param URL.
 */
export function SalonConnexionSlugSync({ slugFromUrl }: SalonConnexionSlugSyncProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (slugFromUrl) {
      persistPartnerConnexionSlug(slugFromUrl);
      return;
    }

    const remembered = readPartnerConnexionSlug();
    if (!remembered) return;

    if (searchParams.get("partenaire") === remembered) return;

    persistPartnerConnexionSlug(remembered);

    const params = new URLSearchParams(searchParams.toString());
    params.set("partenaire", remembered);
    router.replace(`${pathname}?${params.toString()}`);
  }, [slugFromUrl, pathname, router, searchParams]);

  return null;
}

"use client";

import { useEffect } from "react";

import { persistPartnerConnexionSlug } from "@/src/lib/partner/partnerBrandingTypes";
import { usePartner } from "@/src/lib/partner/PartnerContext";

/** Mémorise le slug tenant actif (cookie + localStorage) après connexion au salon. */
export function PartnerConnexionSlugPersist() {
  const { activeTenantId, availableTenants, isLoading } = usePartner();

  useEffect(() => {
    if (isLoading || !activeTenantId) return;
    const tenant = availableTenants.find((t) => t.id === activeTenantId);
    const slug = tenant?.slug?.trim();
    if (slug) persistPartnerConnexionSlug(slug);
  }, [activeTenantId, availableTenants, isLoading]);

  return null;
}

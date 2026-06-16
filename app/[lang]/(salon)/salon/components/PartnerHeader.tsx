"use client";

import { useEffect, useMemo, useState } from "react";

import { PartnerBrandLockup } from "@/src/components/partner/PartnerBrandLockup";
import type { PartnerInitialBrand } from "@/src/lib/partner/fetchPartnerTenantsForUser";
import type { Locale } from "@/i18n.config";
import { readPartnerConnexionSlug } from "@/src/lib/partner/partnerBrandingTypes";
import { usePartner } from "@/src/lib/partner/PartnerContext";
import { createClient } from "@/utils/supabase/client";

type PartnerHeaderProps = {
  lang: Locale;
  poweredByLabel: string;
  initialBrand: PartnerInitialBrand | null;
};

type SlugBranding = {
  brandLabel: string;
  logoUrl: string | null;
};

export function PartnerHeader({
  lang,
  poweredByLabel,
  initialBrand,
}: PartnerHeaderProps) {
  const { activeTenantId, availableTenants, isLoading, setActiveTenantId } =
    usePartner();
  const [slugBranding, setSlugBranding] = useState<SlugBranding | null>(null);

  const activeTenant = useMemo(
    () => availableTenants.find((t) => t.id === activeTenantId) ?? null,
    [availableTenants, activeTenantId],
  );

  const copy =
    lang === "en"
      ? {
          tenantAria: "Active partner workspace",
          tenantLoading: "Loading…",
          tenantEmpty: "No partner workspace",
        }
      : {
          tenantAria: "Espace partenaire actif",
          tenantLoading: "Chargement…",
          tenantEmpty: "Aucun espace partenaire",
        };

  const tenantSelectValue = activeTenantId ?? "";
  const hasTenants = availableTenants.length > 0;

  const brandLabel =
    activeTenant?.brandLabel ??
    activeTenant?.name ??
    initialBrand?.brandLabel ??
    slugBranding?.brandLabel ??
    "Partenaire";
  const logoUrl =
    activeTenant?.logoUrl ??
    initialBrand?.logoUrl ??
    slugBranding?.logoUrl ??
    null;

  useEffect(() => {
    if (logoUrl || availableTenants.length > 0) return;

    const slug = readPartnerConnexionSlug();
    if (!slug) return;

    let cancelled = false;
    const supabase = createClient();

    void (async () => {
      const { data, error } = await supabase.rpc("get_partner_public_branding", {
        p_slug: slug,
      });
      if (cancelled || error || !data || typeof data !== "object") return;

      const row = data as Record<string, unknown>;
      const label =
        typeof row.brand_label === "string" ? row.brand_label : "Partenaire";
      const logoRaw =
        typeof row.brand_logo_url === "string" ? row.brand_logo_url.trim() : "";
      setSlugBranding({
        brandLabel: label,
        logoUrl: logoRaw.length > 0 ? logoRaw : null,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [logoUrl, availableTenants.length]);

  return (
    <header className="relative z-10 border-b border-white/[0.06] bg-[#020202]/40 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1400px] items-start justify-between gap-6 px-5 py-5 md:px-12 md:py-6">
        <PartnerBrandLockup
          key={activeTenantId ?? logoUrl ?? brandLabel}
          brandLabel={brandLabel}
          logoUrl={logoUrl}
          poweredByLabel={poweredByLabel}
          variant="dashboard"
          animate
          animationPreset="dashboard"
        />

        <label className="flex shrink-0 items-center pt-1">
          <span className="sr-only">{copy.tenantAria}</span>
          <select
            value={tenantSelectValue}
            disabled={isLoading || !hasTenants}
            onChange={(e) => setActiveTenantId(e.target.value)}
            className="max-w-[min(100%,16rem)] cursor-pointer border-0 border-b border-white/15 bg-transparent py-1 font-label text-[10px] font-bold uppercase tracking-[0.36em] text-zinc-400 outline-none transition-colors hover:text-zinc-200 focus:border-purple-400/50 focus:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoading ? (
              <option value="">{copy.tenantLoading}</option>
            ) : !hasTenants ? (
              <option value="">{copy.tenantEmpty}</option>
            ) : (
              availableTenants.map((tenant) => (
                <option
                  key={tenant.id}
                  value={tenant.id}
                  className="bg-black text-zinc-200"
                >
                  {tenant.brandLabel ?? tenant.name}
                </option>
              ))
            )}
          </select>
        </label>
      </div>
    </header>
  );
}

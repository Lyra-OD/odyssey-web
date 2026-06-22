"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { DashboardSignOut } from "@/src/components/dashboard/DashboardSignOut";
import { LocaleSwitcher } from "@/src/components/i18n/LocaleSwitcher";
import type { LocaleSwitcherLabels } from "@/src/components/i18n/LocaleSwitcher";
import { PartnerBrandLockup } from "@/src/components/partner/PartnerBrandLockup";
import type { PartnerInitialBrand } from "@/src/lib/partner/fetchPartnerTenantsForUser";
import type { Locale } from "@/i18n.config";
import { appRoutes } from "@/src/lib/appRoutes";
import { readPartnerConnexionSlug } from "@/src/lib/partner/partnerBrandingTypes";
import { usePartner } from "@/src/lib/partner/PartnerContext";
import { createClient } from "@/utils/supabase/client";

type PartnerHeaderProps = {
  lang: Locale;
  poweredByLabel: string;
  signOutLabel: string;
  localeSwitcher: LocaleSwitcherLabels;
  initialBrand: PartnerInitialBrand | null;
};

type SlugBranding = {
  brandLabel: string;
  logoUrl: string | null;
};

export function PartnerHeader({
  lang,
  poweredByLabel,
  signOutLabel,
  localeSwitcher,
  initialBrand,
}: PartnerHeaderProps) {
  const { activeTenantId, availableTenants, isLoading, setActiveTenantId, capabilities } =
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
          navHome: "Invitations",
          navBilling: "Billing",
        }
      : {
          tenantAria: "Espace partenaire actif",
          tenantLoading: "Chargement…",
          tenantEmpty: "Aucun espace partenaire",
          navHome: "Invitations",
          navBilling: "Facturation",
        };

  const tenantSelectValue = activeTenantId ?? "";
  const hasTenants = availableTenants.length > 0;

  const brandLabel =
    activeTenant?.brandLabel ??
    activeTenant?.name ??
    initialBrand?.brandLabel ??
    slugBranding?.brandLabel ??
    "Partenaire";

  const tenantLogoUrl = activeTenant?.logoUrl ?? null;
  const logoUrl =
    tenantLogoUrl ??
    initialBrand?.logoUrl ??
    slugBranding?.logoUrl ??
    null;

  const brandingSlug = useMemo(() => {
    const fromTenant = activeTenant?.slug?.trim();
    if (fromTenant) return fromTenant;
    const fromStorage = readPartnerConnexionSlug();
    if (fromStorage) return fromStorage;
    return availableTenants.find((t) => t.slug?.trim())?.slug?.trim() ?? null;
  }, [activeTenant?.slug, availableTenants]);

  const needsSlugBranding =
    !tenantLogoUrl && !initialBrand?.logoUrl && !slugBranding?.logoUrl;

  useEffect(() => {
    setSlugBranding(null);
  }, [activeTenantId, brandingSlug]);

  useEffect(() => {
    if (!needsSlugBranding || !brandingSlug) return;

    let cancelled = false;
    const supabase = createClient();

    void (async () => {
      const { data, error } = await supabase.rpc("get_partner_public_branding", {
        p_slug: brandingSlug,
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
  }, [needsSlugBranding, brandingSlug]);

  const signInHref = useMemo(
    () =>
      appRoutes.salonConnexionWithParams(lang, {
        partenaire: brandingSlug,
      }),
    [lang, brandingSlug],
  );

  return (
    <header className="relative z-30 border-b border-white/[0.06] bg-[#020202]/40 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[1400px] items-start justify-between gap-6 px-5 py-5 md:px-12 md:py-6">
        <div className="min-w-0 flex-1">
          <PartnerBrandLockup
            key={activeTenantId ?? logoUrl ?? brandLabel}
            brandLabel={brandLabel}
            logoUrl={logoUrl}
            poweredByLabel={poweredByLabel}
            variant="dashboard"
            animate
            animationPreset="dashboard"
          />

          {capabilities?.canRecharge ? (
            <nav
              aria-label={
                lang === "en" ? "Partner console" : "Console partenaire"
              }
              className="mt-4 flex flex-wrap gap-5 md:mt-5"
            >
              <Link
                href={appRoutes.salon(lang)}
                className="font-label text-[10px] font-bold uppercase tracking-[0.36em] text-zinc-500 transition-colors hover:text-white"
              >
                {copy.navHome}
              </Link>
              <Link
                href={appRoutes.salonFacturation(lang)}
                className="font-label text-[10px] font-bold uppercase tracking-[0.36em] text-violet-300/80 transition-colors hover:text-violet-200"
              >
                {copy.navBilling}
              </Link>
            </nav>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-3 pt-1">
          <LocaleSwitcher lang={lang} {...localeSwitcher} />
          <label className="flex items-center">
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
          <DashboardSignOut
            lang={lang}
            label={signOutLabel}
            signInHref={signInHref}
            className="px-0 py-0 text-[10px] font-bold uppercase tracking-[0.36em] text-zinc-500 shadow-none hover:border-transparent hover:bg-transparent hover:text-zinc-200"
          />
        </div>
      </div>
    </header>
  );
}

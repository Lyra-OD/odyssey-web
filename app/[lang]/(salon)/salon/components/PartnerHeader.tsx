"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Locale } from "@/i18n.config";
import { usePartner } from "@/src/lib/partner/PartnerContext";
import { OdysseyBrandLockup } from "@/src/components/OdysseyBrandLockup";

const LOGO_STORAGE_KEY = "odyssey_partner_dashboard_logo";

type PartnerHeaderProps = {
  lang: Locale;
};

export function PartnerHeader({ lang }: PartnerHeaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const { activeTenantId, availableTenants, isLoading, setActiveTenantId } =
    usePartner();

  const copy =
    lang === "en"
      ? {
          uploadLogo: "Upload logo",
          changeLogo: "Change logo",
          tenantAria: "Active partner",
          tenantLoading: "Loading…",
          tenantEmpty: "No partner workspace",
          homeHref: `/${lang}`,
        }
      : {
          uploadLogo: "Ajouter un logo",
          changeLogo: "Modifier le logo",
          tenantAria: "Partenaire actif",
          tenantLoading: "Chargement…",
          tenantEmpty: "Aucun espace partenaire",
          homeHref: `/${lang}`,
        };

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOGO_STORAGE_KEY);
      if (stored) setLogoDataUrl(stored);
    } catch {
      /* ignore */
    }
  }, []);

  const onLogoSelected = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result !== "string") return;
        setLogoDataUrl(result);
        try {
          localStorage.setItem(LOGO_STORAGE_KEY, result);
        } catch {
          /* quota */
        }
      };
      reader.readAsDataURL(file);
      event.target.value = "";
    },
    [],
  );

  const tenantSelectValue = activeTenantId ?? "";
  const hasTenants = availableTenants.length > 0;

  return (
    <header className="relative z-10 border-b border-white/[0.06]">
      <div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center justify-between gap-6 px-5 py-6 md:px-12 md:py-8">
        <div className="flex min-w-0 items-center gap-4 md:gap-5">
          {logoDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoDataUrl}
              alt=""
              className="h-9 max-w-[140px] object-contain object-left md:h-10"
            />
          ) : (
            <span
              aria-hidden
              className="h-9 w-9 shrink-0 border border-white/10 bg-white/[0.02]"
            />
          )}
          <div className="flex min-w-0 flex-col gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="font-label text-left text-[10px] font-bold uppercase tracking-[0.42em] text-white/45 transition-colors hover:text-white/70"
            >
              {logoDataUrl ? copy.changeLogo : copy.uploadLogo}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onLogoSelected}
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-6 md:gap-10">
          <Link
            href={copy.homeHref}
            className="shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <OdysseyBrandLockup wordmark="Odyssey" size="section" />
          </Link>

          <label className="flex min-w-0 items-center gap-2">
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
                    {tenant.name}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>
      </div>
    </header>
  );
}

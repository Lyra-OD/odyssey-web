"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { SoftCapVariant } from "@/src/components/tribute/SoftCapModal";
import {
  isSoftCapEligible,
  shouldOfferMediaSoftCap,
  shouldOfferMusicSoftCap,
} from "@/src/lib/wizard/softCap";
import { isOfficialCatalogTrack } from "@/src/lib/wizard/stingrayCatalog";
import type { WizardBasePackage } from "@/src/lib/wizard/pricingConfig";
import { packageTierRank } from "@/src/lib/wizard/pricingConfig";
import {
  manifestPackageFromWizardBasePackage,
  packageMaxMediaItems,
} from "@/src/lib/wizard/wizardDeliverables";
import type { WizardExtensionsState } from "@/src/lib/wizard/wizardPricing";
import type { WizardStoryboardSong } from "@/src/lib/wizard/wizardState";

export type WizardSoftCapCopySource = {
  softCapMediaUnlockTitle: string;
  softCapMediaUnlockBody: string;
  softCapMediaMagicTitle: string;
  softCapMediaMagicBody: string;
  softCapMusicTitle: string;
  softCapMusicBody: string;
  softCapCtaHeritage: string;
  softCapCtaLicense: string;
  softCapCtaContinue: string;
  softCapCtaDismiss: string;
  softCapPriceHeritage: string;
  softCapPriceLicense: string;
  softCapCollabHint: string;
  softCapCollabCta: string;
};

export type UseWizardSoftCapParams = {
  isEditor: boolean;
  grantedPackage: WizardBasePackage;
  intendedPackage: WizardBasePackage;
  extensions: WizardExtensionsState;
  projectMediaCount: number;
  setProjectMediaCount: React.Dispatch<React.SetStateAction<number>>;
  currentMaxMediaItems: number;
  handleBasePackageChange: (pkg: WizardBasePackage) => void;
  handleExtensionsChange: (next: WizardExtensionsState) => void;
  navigateToStep: (step: number) => void | Promise<void>;
  setPayError: (error: string | null) => void;
  copy: WizardSoftCapCopySource;
};

export function useWizardSoftCap({
  isEditor,
  grantedPackage,
  intendedPackage,
  extensions,
  projectMediaCount,
  setProjectMediaCount,
  currentMaxMediaItems,
  handleBasePackageChange,
  handleExtensionsChange,
  navigateToStep,
  setPayError,
  copy,
}: UseWizardSoftCapParams) {
  const softCapMusicBrowse = shouldOfferMusicSoftCap(
    grantedPackage,
    intendedPackage,
    Boolean(extensions.musicLicense),
  );
  const softCapEligible =
    !isEditor && isSoftCapEligible(grantedPackage, intendedPackage);
  const [softCapOpen, setSoftCapOpen] = useState(false);
  const [softCapVariant, setSoftCapVariant] =
    useState<SoftCapVariant>("mediaUnlock");
  const softCapMediaDismissedRef = useRef(false);
  const softCapMagicDismissedRef = useRef(false);

  const isFreemiumGrant = packageTierRank(grantedPackage) === 0;
  const SOFT_CAP_MEDIA_CEILING = useMemo(
    () =>
      packageMaxMediaItems(manifestPackageFromWizardBasePackage("signature")),
    [],
  );
  const effectiveMaxMediaItems = isFreemiumGrant
    ? Math.max(currentMaxMediaItems, SOFT_CAP_MEDIA_CEILING)
    : currentMaxMediaItems;
  const grantedMediaMax = useMemo(
    () =>
      packageMaxMediaItems(
        manifestPackageFromWizardBasePackage(grantedPackage),
      ),
    [grantedPackage],
  );

  const openSoftCap = useCallback(
    (variant: SoftCapVariant) => {
      if (isEditor) return;
      setSoftCapVariant(variant);
      setSoftCapOpen(true);
    },
    [isEditor],
  );

  const dismissSoftCap = useCallback(() => {
    if (softCapVariant === "mediaUnlock") {
      softCapMediaDismissedRef.current = true;
    }
    if (softCapVariant === "mediaMagic") {
      softCapMagicDismissedRef.current = true;
    }
    setSoftCapOpen(false);
  }, [softCapVariant]);

  const acceptSoftCapHeritage = useCallback(() => {
    softCapMediaDismissedRef.current = true;
    softCapMagicDismissedRef.current = true;
    setSoftCapOpen(false);
    handleBasePackageChange("signature");
    if (extensions.musicLicense) {
      handleExtensionsChange({ ...extensions, musicLicense: false });
    }
  }, [extensions, handleBasePackageChange, handleExtensionsChange]);

  const acceptSoftCapLicense = useCallback(() => {
    setSoftCapOpen(false);
    handleExtensionsChange({ ...extensions, musicLicense: true });
  }, [extensions, handleExtensionsChange]);

  const handleAfterChooseSong = useCallback(
    (song: WizardStoryboardSong) => {
      if (song.source !== "stingray") return;
      if (
        !shouldOfferMusicSoftCap(
          grantedPackage,
          intendedPackage,
          Boolean(extensions.musicLicense),
        )
      ) {
        return;
      }
      if (!isOfficialCatalogTrack(song.trackId)) return;
      openSoftCap("musicDual");
    },
    [extensions.musicLicense, grantedPackage, intendedPackage, openSoftCap],
  );

  const handleStayOnGift = useCallback(() => {
    softCapMediaDismissedRef.current = true;
    softCapMagicDismissedRef.current = true;
    handleBasePackageChange(grantedPackage);
    if (extensions.musicLicense) {
      handleExtensionsChange({ ...extensions, musicLicense: false });
    }
    setPayError(null);
    void navigateToStep(3);
  }, [
    extensions,
    grantedPackage,
    handleBasePackageChange,
    handleExtensionsChange,
    navigateToStep,
    setPayError,
  ]);

  /**
   * Filet Soft Cap à ≥50 — consentement UI (pas d’auto-bump silencieux
   * vers Héritage, qui tuait mediaUnlock + mediaMagic).
   * Uploads restent ouverts jusqu’au plafond Héritage via `effectiveMaxMediaItems`.
   */
  useEffect(() => {
    if (isEditor) return;
    if (softCapOpen) return;
    if (softCapMediaDismissedRef.current) return;
    if (
      !shouldOfferMediaSoftCap(
        grantedPackage,
        intendedPackage,
        projectMediaCount,
      )
    ) {
      return;
    }
    openSoftCap("mediaUnlock");
  }, [
    grantedPackage,
    intendedPackage,
    isEditor,
    openSoftCap,
    projectMediaCount,
    softCapOpen,
  ]);

  const offerMediaSoftCap = shouldOfferMediaSoftCap(
    grantedPackage,
    intendedPackage,
    projectMediaCount,
  );

  const syncStep3MediaCount = useCallback(
    (count: number) => {
      setProjectMediaCount((prev) => (prev === count ? prev : count));
    },
    [setProjectMediaCount],
  );

  const softCapCopy = useMemo(
    () => ({
      mediaUnlockTitle: copy.softCapMediaUnlockTitle,
      mediaUnlockBody: copy.softCapMediaUnlockBody,
      mediaMagicTitle: copy.softCapMediaMagicTitle,
      mediaMagicBody: copy.softCapMediaMagicBody,
      musicTitle: copy.softCapMusicTitle,
      musicBody: copy.softCapMusicBody,
      ctaHeritage: copy.softCapCtaHeritage,
      ctaLicense: copy.softCapCtaLicense,
      ctaContinue: copy.softCapCtaContinue,
      ctaDismiss: copy.softCapCtaDismiss,
      priceHeritage: copy.softCapPriceHeritage,
      priceLicense: copy.softCapPriceLicense,
      collabHint: copy.softCapCollabHint,
      ctaCollab: copy.softCapCollabCta,
    }),
    [copy],
  );

  return {
    softCapMusicBrowse,
    softCapEligible,
    offerMediaSoftCap,
    softCapOpen,
    softCapVariant,
    softCapMediaDismissedRef,
    softCapMagicDismissedRef,
    isFreemiumGrant,
    effectiveMaxMediaItems,
    grantedMediaMax,
    openSoftCap,
    dismissSoftCap,
    acceptSoftCapHeritage,
    acceptSoftCapLicense,
    handleAfterChooseSong,
    handleStayOnGift,
    syncStep3MediaCount,
    softCapCopy,
  };
}

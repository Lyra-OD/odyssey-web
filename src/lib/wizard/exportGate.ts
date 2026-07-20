import type { WizardBasePackage } from "@/src/lib/wizard/pricingConfig";
import { packageTierRank } from "@/src/lib/wizard/pricingConfig";
import type { WizardStoryboardState } from "@/src/lib/wizard/wizardState";

/** Version ToS MP3 — bump si le texte légal change. */
export const MUSIC_RIGHTS_TOS_VERSION = "2026-07-v1";

export type ProjectPaidEntitlementsRow = {
  project_id: string;
  paid_package: WizardBasePackage;
  music_license: boolean;
  export_resolution: "1080p" | "4K";
  extensions: Record<string, unknown> | null;
  paid_at: string | null;
};

export type ExportGateDenial = {
  ok: false;
  code:
    | "entitlements_missing"
    | "resolution_forbidden"
    | "stingray_master_forbidden"
    | "upload_attestation_missing";
  message: string;
};

export type ExportGateOk = {
  ok: true;
  entitlements: ProjectPaidEntitlementsRow;
  allowStingrayMaster: boolean;
  allow4k: boolean;
};

export type ExportGateResult = ExportGateOk | ExportGateDenial;

export function storyboardHasUploadSongs(
  storyboard: WizardStoryboardState | null | undefined,
): boolean {
  if (!storyboard?.chapters?.length) return false;
  return storyboard.chapters.some(
    (ch) => ch.song?.source === "upload",
  );
}

export function storyboardHasStingraySongs(
  storyboard: WizardStoryboardState | null | undefined,
): boolean {
  if (!storyboard?.chapters?.length) return false;
  return storyboard.chapters.some(
    (ch) => ch.song?.source === "stingray",
  );
}

/**
 * Never trust wizard_state for master export.
 * Requires a row in project_paid_entitlements written post-webhook / freemium_free.
 */
export function assertExportAllowed(params: {
  entitlements: ProjectPaidEntitlementsRow | null;
  storyboard?: WizardStoryboardState | null;
  musicRightsAttestation?: { acceptedAt?: string; tosVersion?: string } | null;
  locale?: "fr" | "en";
}): ExportGateResult {
  const locale = params.locale ?? "fr";
  const ent = params.entitlements;

  if (!ent) {
    return {
      ok: false,
      code: "entitlements_missing",
      message:
        locale === "en"
          ? "Payment entitlements are missing. Complete checkout first."
          : "Entitlements de paiement absents. Finalisez d’abord le checkout.",
    };
  }

  const allow4k = ent.export_resolution === "4K";
  const allowStingrayMaster =
    ent.music_license === true || packageTierRank(ent.paid_package) >= 1;

  if (storyboardHasStingraySongs(params.storyboard) && !allowStingrayMaster) {
    return {
      ok: false,
      code: "stingray_master_forbidden",
      message:
        locale === "en"
          ? "Official Stingray masters require Heritage+ or a paid music license."
          : "Le master Stingray officiel exige Héritage+ ou une Licence musique payée.",
    };
  }

  if (storyboardHasUploadSongs(params.storyboard)) {
    const att = params.musicRightsAttestation;
    if (!att?.acceptedAt || !att.tosVersion) {
      return {
        ok: false,
        code: "upload_attestation_missing",
        message:
          locale === "en"
            ? "Accept the music rights terms before exporting personal audio."
            : "Acceptez l’attestation de droits musique avant d’exporter un fichier personnel.",
      };
    }
  }

  return {
    ok: true,
    entitlements: ent,
    allowStingrayMaster,
    allow4k,
  };
}

/** Checkout gate: upload songs require attestation (client may not forge past this). */
export function assertCheckoutMusicRights(params: {
  storyboard?: WizardStoryboardState | null;
  musicRightsAttestation?: { acceptedAt?: string; tosVersion?: string } | null;
  locale?: "fr" | "en";
}): { ok: true } | { ok: false; code: string; message: string } {
  if (!storyboardHasUploadSongs(params.storyboard)) return { ok: true };
  const att = params.musicRightsAttestation;
  if (att?.acceptedAt && att.tosVersion) return { ok: true };
  const locale = params.locale ?? "fr";
  return {
    ok: false,
    code: "music_attestation_required",
    message:
      locale === "en"
        ? "Accept the music rights terms for personal MP3/WAV tracks."
        : "Acceptez l’attestation de droits pour les pistes MP3/WAV personnelles.",
  };
}

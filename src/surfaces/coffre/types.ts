import type { AppDictionary } from "@/lib/dictionaries";
import type { Locale } from "@/i18n.config";
import type { MediaDropzoneAdapterProps } from "@/src/components/media/MediaDropzoneAdapter";

/**
 * `onboarding` = étape 3 du wizard (première rencontre).
 * `drawer` = tiroir chrome (Phase 1 C3) — même banque, jamais un 2ᵉ adapter monté.
 */
export type CoffreMode = "onboarding" | "drawer";

export type CoffreCopy = Pick<
  AppDictionary["tributeWizard"],
  | "coffreDrawerAddCta"
  | "coffreDrawerDropHint"
  | "coffreDrawerDropOverlay"
  | "projectDraftIdle"
  | "projectDraftLoading"
  | "queueEmpty"
  | "queueRemove"
  | "queueRetry"
  | "queueStatusCancelled"
  | "queueStatusFailed"
  | "queueStatusQueued"
  | "queueStatusUploaded"
  | "queueStatusUploading"
  | "queueViaGuest"
  | "queueViaPhoto"
  | "queueViaScanner"
  | "queueViaVideo"
  | "rejectionsClear"
  | "rejectionsTitle"
  | "scannerBadge"
  | "scannerCopied"
  | "scannerCopyLink"
  | "scannerDescription"
  | "scannerErrorGeneric"
  | "scannerEyebrow"
  | "scannerGenerating"
  | "scannerHint"
  | "scannerInstructions"
  | "scannerMobileDescription"
  | "scannerOpenCapture"
  | "scannerPhotosReceived"
  | "scannerQrAlt"
  | "scannerRestorePreview"
  | "scannerTitle"
  | "scannerUnavailable"
  | "scannerWaitingPhone"
  | "softCapMediaBannerBody"
  | "softCapMediaBannerTitle"
  | "softCapMediaUnlockCta"
  | "uploadAria"
  | "uploadAtLeastOne"
  | "uploadBreakdown"
  | "uploadInProgress"
  | "uploadLimitCount"
  | "uploadLimitCountSoftCap"
  | "uploadLimitExceededItemError"
  | "uploadLimitOverflowRejection"
  | "uploadLimitReachedHint"
  | "uploadLimitReachedTitle"
  | "uploadPrompt"
  | "uploadSubtext"
>;

/** Contrat host → Coffre. Le host garde Soft Cap modal, restauration, focal, footer. */
export type CoffreHostProps = {
  mode: CoffreMode;
  projectId: string | null;
  userId?: string;
  tenantId?: string;
  uploadStrategy: "direct" | "signed";
  locale: Locale;
  copy: CoffreCopy;
  /** Plafond effectif de la dropzone (inclut le déblocage Soft Cap) — miroir du trigger SQL P19. */
  maxFiles: number;
  /** Médias inclus dans le forfait courant ; `< maxFiles` = Soft Cap ouvert. */
  includedMaxFiles: number;
  /** Nom affiché du forfait courant (Souvenir, Héritage…). */
  packageLabel: string;
  /** Nom du forfait qui accueille le plafond Soft Cap (Héritage). */
  upgradePackageLabel: string;
  projectDraftLoading: boolean;
  offerMediaSoftCap: boolean;
  onOpenSoftCap: () => void;
  onQueueCountChange: (count: number) => void;
  onUploadRunningChange: (running: boolean) => void;
  onAssetUploaded?: MediaDropzoneAdapterProps["onAssetUploaded"];
  onSessionExpired: () => void;
  onRestorationPreview: (url: string) => void;
};

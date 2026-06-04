"use client";

import {
  ArrowLeft,
  Calendar,
  Camera,
  Cloud,
  Image as ImageIcon,
  Music2,
  Share2,
  User,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { PreviewStep } from "@/src/components/tribute/PreviewStep";
import { CheckoutStep } from "@/src/components/tribute/CheckoutStep";
import { MediaDropzoneAdapter } from "@/src/components/media/MediaDropzoneAdapter";
import { MediaQueueGrid } from "@/src/components/media/MediaQueueGrid";
import { MontageExtensionsStep } from "@/src/components/tribute/MontageExtensionsStep";
import { MontageStep } from "@/src/components/tribute/MontageStep";
import { SoundSignatureStep } from "@/src/components/tribute/SoundSignatureStep";
import { WizardBasePackagePicker } from "@/src/components/tribute/WizardBasePackagePicker";
import {
  ExtensionsStickyFooter,
  WizardCartSummary,
} from "@/src/components/tribute/WizardCartSummary";
import { StickyPriceBar } from "@/src/components/StickyPriceBar";
import { WizardStepper } from "@/src/components/tribute/WizardStepper";
import { AutosaveIndicator } from "@/src/components/tribute/AutosaveIndicator";
import { useWizardAutosave } from "@/src/hooks/useWizardAutosave";
import type { AppDictionary } from "@/lib/dictionaries";
import { createClient } from "@/utils/supabase/client";
import {
  coerceWizardState,
  countIncludedMedia,
  emptyMontageState,
  resolveInitialWizardStep,
  WIZARD_STATE_VERSION,
  type SocialId,
  type WizardInitialDraft,
  type WizardMontageState,
  type WizardBasePackage,
  type WizardExtensionsState,
  type WizardActTracks,
  type WizardStateV1,
} from "@/src/lib/wizard/wizardState";
import {
  buildPricingSnapshot,
  computeWizardCart,
  resolveMusicCatalogTier,
} from "@/src/lib/wizard/wizardPricing";
import { normalizeWizardStateForSave } from "@/src/lib/wizard/wizardExtensions";
import {
  emptyActTracks,
  hasAnyActTrack,
  STINGRAY_CATALOG_PROVIDER,
} from "@/src/lib/wizard/stingrayCatalog";
import type { Locale } from "@/i18n.config";

export type TributeWizardCopy = AppDictionary["tributeWizard"];

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

const TOTAL_STEPS = 8;
const AVATAR_SIGNED_URL_TTL_SEC = 3600;

type WizardFieldsSnapshot = {
  firstName: string;
  lastName: string;
  birthDate: string;
  deathDate: string;
  avatarPath: string | null;
  selectedSocial: SocialId | null;
  isPartner: boolean;
  basePackage: WizardBasePackage;
  montage: WizardMontageState;
  extensions: WizardExtensionsState;
  actTracks: WizardActTracks;
};

function yearFromDateInput(iso: string): string {
  if (!iso?.trim()) return "";
  const y = Number.parseInt(iso.slice(0, 4), 10);
  return Number.isFinite(y) ? String(y) : "";
}

function buildAvatarStoragePath(projectId: string, file: File): string {
  const fromName = file.name.split(".").pop();
  const ext =
    fromName && fromName.length <= 10
      ? fromName.toLowerCase()
      : file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";
  return `projects/${projectId}/avatar/primary-${crypto.randomUUID()}.${ext}`;
}

/** Halos radial pour boutons réseaux — très doux, effet premium */
const SOCIAL_HALOS: Record<
  SocialId,
  string
> = {
  facebook:
    "radial-gradient(circle at 50% 80%, rgba(99,102,241,0.35) 0%, rgba(139,92,246,0.12) 45%, transparent 70%)",
  instagram:
    "radial-gradient(circle at 50% 80%, rgba(236,72,153,0.28) 0%, rgba(168,85,247,0.14) 45%, transparent 70%)",
  tiktok:
    "radial-gradient(circle at 50% 80%, rgba(34,211,238,0.32) 0%, rgba(6,182,212,0.14) 45%, transparent 70%)",
  google:
    "radial-gradient(circle at 50% 80%, rgba(52,211,153,0.26) 0%, rgba(34,197,94,0.12) 45%, transparent 70%)",
};

export function TributeWizard({
  copy,
  initialDraft = null,
  locale = "fr",
  isPartner: isPartnerProp = false,
}: {
  copy: TributeWizardCopy;
  initialDraft?: WizardInitialDraft | null;
  locale?: Locale;
  /** Compte funérarium / partenaire B2B (jetons). */
  isPartner?: boolean;
}) {
  const hydrated = coerceWizardState(initialDraft?.wizard_state);
  const isPartnerInitial = hydrated.isPartner === true || isPartnerProp;

  const [currentStep, setCurrentStep] = useState<Step>(() =>
    resolveInitialWizardStep(
      initialDraft?.wizard_step,
      hydrated,
      TOTAL_STEPS,
    ) as Step,
  );
  const [essentialError, setEssentialError] = useState(false);
  const [montageError, setMontageError] = useState(false);

  const [firstName, setFirstName] = useState(
    hydrated.essentials?.firstName ?? "",
  );
  const [lastName, setLastName] = useState(hydrated.essentials?.lastName ?? "");
  const [birthDate, setBirthDate] = useState(
    hydrated.essentials?.birthDate ?? "",
  );
  const [deathDate, setDeathDate] = useState(
    hydrated.essentials?.deathDate ?? "",
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarPath, setAvatarPath] = useState<string | null>(
    () => hydrated.essentials?.avatarPath?.trim() || null,
  );

  const [selectedSocial, setSelectedSocial] = useState<SocialId | null>(
    hydrated.socialSources?.selected ?? null,
  );
  const [montage, setMontage] = useState<WizardMontageState>(
    () => hydrated.montage ?? emptyMontageState(),
  );
  const [isPartner] = useState(isPartnerInitial);
  const [basePackage, setBasePackage] = useState<WizardBasePackage>(
    () => hydrated.basePackage ?? "signature",
  );
  const [extensions, setExtensions] = useState<WizardExtensionsState>(
    () => hydrated.extensions ?? {},
  );
  const musicCatalogTier = useMemo(
    () => resolveMusicCatalogTier(basePackage, extensions),
    [basePackage, extensions],
  );
  const [actTracks, setActTracks] = useState<WizardActTracks>(
    () => hydrated.musicalAmbiance?.tracks ?? emptyActTracks(),
  );
  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const avatarHydratedPathRef = useRef<string | null>(null);
  const avatarHydrateInflightRef = useRef<string | null>(null);
  const pendingAvatarFileRef = useRef<File | null>(null);
  const avatarUploadingRef = useRef(false);
  const wizardTitleId = useId();

  // Identifiants DB nécessaires pour passer RLS Storage + insert media_assets.
  // Le service d'upload écrit owner_user_id (convention Odyssey, pas user_id)
  // et tenant_id : les deux colonnes sont NOT NULL côté DB, donc indispensables
  // sous peine de faire planter l'upsert.
  const [uploadProjectId, setUploadProjectId] = useState<string | null>(
    initialDraft?.id ?? null,
  );
  const [uploadUserId, setUploadUserId] = useState<string | null>(
    initialDraft?.user_id ?? null,
  );
  const [uploadTenantId, setUploadTenantId] = useState<string | null>(
    initialDraft?.tenant_id ?? null,
  );
  const [projectDraftError, setProjectDraftError] = useState<string | null>(
    null,
  );
  const [projectDraftLoading, setProjectDraftLoading] = useState(false);

  const wizardFieldsRef = useRef<WizardFieldsSnapshot>({
    firstName,
    lastName,
    birthDate,
    deathDate,
    avatarPath,
    selectedSocial,
    isPartner,
    basePackage,
    montage,
    extensions,
    actTracks,
  });
  wizardFieldsRef.current = {
    firstName,
    lastName,
    birthDate,
    deathDate,
    avatarPath,
    selectedSocial,
    isPartner,
    basePackage,
    montage,
    extensions,
    actTracks,
  };

  const skipInitialAutosaveRef = useRef(Boolean(initialDraft?.id));
  const skipStepAutosaveRef = useRef(true);

  const buildWizardState = useCallback((): WizardStateV1 => {
    const s = wizardFieldsRef.current;
    const pricing = buildPricingSnapshot(
      s.extensions,
      s.basePackage,
      s.isPartner,
    );
    return normalizeWizardStateForSave({
      version: WIZARD_STATE_VERSION,
      ...(s.isPartner ? { isPartner: true } : {}),
      basePackage: pricing.basePackage,
      pricing,
      essentials: {
        firstName: s.firstName.trim() || undefined,
        lastName: s.lastName.trim() || undefined,
        birthDate: s.birthDate || undefined,
        deathDate: s.deathDate || undefined,
        avatarPath: s.avatarPath?.trim() || undefined,
      },
      socialSources: s.selectedSocial
        ? { selected: s.selectedSocial }
        : undefined,
      montage: s.montage,
      extensions: s.extensions,
      ...(hasAnyActTrack(s.actTracks)
        ? {
            musicalAmbiance: {
              tracks: s.actTracks,
              catalogProvider: STINGRAY_CATALOG_PROVIDER,
            },
          }
        : {}),
    });
  }, []);

  const { status: autosaveStatus, queueSave, flush, ensureDraft } =
    useWizardAutosave({
      projectId: uploadProjectId,
      wizardStep: currentStep,
      buildWizardState,
    });

  const deceasedDisplayName = useMemo(() => {
    const fn = firstName.trim();
    const ln = lastName.trim();
    if (!fn && !ln) return copy.headerNameFallback;
    return `${fn} ${ln}`.trim();
  }, [firstName, lastName, copy.headerNameFallback]);

  const yearsDisplay = useMemo(() => {
    const b = yearFromDateInput(birthDate);
    const d = yearFromDateInput(deathDate);
    if (!b && !d) return "—";
    return copy.headerYears
      .replace("{birth}", b || "—")
      .replace("{death}", d || "—");
  }, [birthDate, deathDate, copy.headerYears]);

  useEffect(() => {
    if (isPartnerProp) {
      wizardFieldsRef.current.isPartner = true;
    }
  }, [isPartnerProp]);

  useEffect(() => {
    console.log(
      "[TributeWizard] hydrated.essentials?.avatarPath:",
      hydrated.essentials?.avatarPath ?? null,
    );
  }, [hydrated.essentials?.avatarPath]);

  useEffect(() => {
    return () => {
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const hydrateAvatarPreview = useCallback(
    async (storagePath: string, projectId: string) => {
      if (avatarHydrateInflightRef.current === storagePath) return;
      avatarHydrateInflightRef.current = storagePath;

      try {
        const apiRes = await fetch(
          `/api/projects/${projectId}/avatar?path=${encodeURIComponent(storagePath)}`,
        );

        if (apiRes.ok) {
          const body = (await apiRes.json()) as { signedUrl?: string };
          if (body.signedUrl) {
            console.log(
              "[TributeWizard] avatar signed URL (API):",
              storagePath,
            );
            avatarHydratedPathRef.current = storagePath;
            setAvatarPreview(body.signedUrl);
            return;
          }
        }

        const supabase = createClient();
        const { data: signed, error: signError } = await supabase.storage
          .from("user-assets")
          .createSignedUrl(storagePath, AVATAR_SIGNED_URL_TTL_SEC);

        if (!signError && signed?.signedUrl) {
          console.log(
            "[TributeWizard] avatar signed URL (client):",
            storagePath,
          );
          avatarHydratedPathRef.current = storagePath;
          setAvatarPreview(signed.signedUrl);
          return;
        }

        const { data: blob, error: downloadError } = await supabase.storage
          .from("user-assets")
          .download(storagePath);

        if (downloadError || !blob) {
          console.warn(
            "[TributeWizard] avatar hydrate failed:",
            downloadError?.message ?? signError?.message ?? "unknown",
          );
          return;
        }

        const blobUrl = URL.createObjectURL(blob);
        console.log("[TributeWizard] avatar blob URL:", storagePath);
        avatarHydratedPathRef.current = storagePath;
        setAvatarPreview(blobUrl);
      } finally {
        avatarHydrateInflightRef.current = null;
      }
    },
    [],
  );

  // Réhydrate l'avatar depuis Storage après F5 (blob local perdu, avatarPath en DB).
  useEffect(() => {
    const path =
      avatarPath?.trim() || hydrated.essentials?.avatarPath?.trim() || "";
    if (!path) return;
    if (avatarPreview?.startsWith("blob:")) return;
    if (avatarHydratedPathRef.current === path && avatarPreview) return;
    if (!uploadProjectId) return;

    void hydrateAvatarPreview(path, uploadProjectId);
  }, [
    avatarPath,
    avatarPreview,
    hydrated.essentials?.avatarPath,
    uploadProjectId,
    hydrateAvatarPreview,
  ]);

  useEffect(() => {
    const fromDraft = hydrated.essentials?.avatarPath?.trim();
    if (fromDraft && !avatarPath) {
      setAvatarPath(fromDraft);
      wizardFieldsRef.current.avatarPath = fromDraft;
    }
  }, [avatarPath, hydrated.essentials?.avatarPath]);

  const uploadAvatarToStorage = useCallback(
    async (file: File, projectId: string) => {
      if (avatarUploadingRef.current) return;
      avatarUploadingRef.current = true;
      try {
        const supabase = createClient();
        const storagePath = buildAvatarStoragePath(projectId, file);
        const { error } = await supabase.storage
          .from("user-assets")
          .upload(storagePath, file, {
            cacheControl: "3600",
            upsert: true,
            contentType: file.type || undefined,
          });

        if (error) throw error;

        setAvatarPath(storagePath);
        wizardFieldsRef.current.avatarPath = storagePath;
        avatarHydratedPathRef.current = null;
        queueSave("immediate");
      } catch {
        // Preview blob reste visible ; path non persisté jusqu'à retry.
      } finally {
        avatarUploadingRef.current = false;
      }
    },
    [queueSave],
  );

  useEffect(() => {
    if (!uploadProjectId || !pendingAvatarFileRef.current) return;
    const file = pendingAvatarFileRef.current;
    pendingAvatarFileRef.current = null;
    void uploadAvatarToStorage(file, uploadProjectId);
  }, [uploadProjectId, uploadAvatarToStorage]);

  // Crée le projet draft dès que le prénom atteint 2 caractères (autosave + RLS étape 3).
  useEffect(() => {
    if (uploadProjectId) return;
    if (firstName.trim().length < 2) return;

    let aborted = false;
    setProjectDraftLoading(true);
    setProjectDraftError(null);

    (async () => {
      try {
        const draft = await ensureDraft({
          firstName,
          lastName,
          birthDate,
          deathDate,
        });

        if (aborted) return;

        if (!draft?.id) {
          setProjectDraftError("project_insert_failed");
          return;
        }

        setUploadProjectId(draft.id);
        setUploadUserId(draft.user_id ?? null);
        setUploadTenantId(draft.tenant_id ?? null);
      } catch (err) {
        if (!aborted) {
          setProjectDraftError(
            err instanceof Error ? err.message : "network_error",
          );
        }
      } finally {
        if (!aborted) setProjectDraftLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [
    firstName,
    lastName,
    birthDate,
    deathDate,
    uploadProjectId,
    ensureDraft,
  ]);

  // Seed wizard_state en DB après la première création de projet (pas à la reprise).
  useEffect(() => {
    if (!uploadProjectId) return;
    if (skipInitialAutosaveRef.current) {
      skipInitialAutosaveRef.current = false;
      return;
    }
    queueSave("immediate");
  }, [uploadProjectId, queueSave]);

  // Persiste wizard_step après navigation (flush couvre les champs ; ceci met à jour l'étape).
  useEffect(() => {
    if (!uploadProjectId) return;
    if (skipStepAutosaveRef.current) {
      skipStepAutosaveRef.current = false;
      return;
    }
    queueSave("immediate");
  }, [currentStep, uploadProjectId, queueSave]);

  const canProceedEssential =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    birthDate.length > 0 &&
    deathDate.length > 0;

  const navigateToStep = useCallback(
    async (step: Step) => {
      if (step === currentStep) return;
      await flush();
      setCurrentStep(step);
    },
    [currentStep, flush],
  );

  const goNext = useCallback(async () => {
    if (currentStep === 1) {
      if (!canProceedEssential) {
        setEssentialError(true);
        return;
      }
      setEssentialError(false);
    }
    if (currentStep === 4) {
      if (countIncludedMedia(montage) === 0) {
        setMontageError(true);
        return;
      }
      setMontageError(false);
    }
    if (currentStep >= TOTAL_STEPS) return;
    await navigateToStep((currentStep + 1) as Step);
  }, [currentStep, canProceedEssential, navigateToStep, montage]);

  const handleMontageChange = useCallback(
    (next: WizardMontageState) => {
      setMontage(next);
      wizardFieldsRef.current.montage = next;
      if (countIncludedMedia(next) > 0) setMontageError(false);
      queueSave("immediate");
    },
    [queueSave],
  );

  const goBack = useCallback(async () => {
    if (currentStep <= 1) return;
    await navigateToStep((currentStep - 1) as Step);
  }, [currentStep, navigateToStep]);

  const handleStepperClick = useCallback(
    (step: number) => {
      void navigateToStep(step as Step);
    },
    [navigateToStep],
  );

  const handleFirstNameChange = useCallback(
    (value: string) => {
      setFirstName(value);
      wizardFieldsRef.current.firstName = value;
      queueSave("text");
    },
    [queueSave],
  );

  const handleLastNameChange = useCallback(
    (value: string) => {
      setLastName(value);
      wizardFieldsRef.current.lastName = value;
      queueSave("text");
    },
    [queueSave],
  );

  const handleBirthDateChange = useCallback(
    (value: string) => {
      setBirthDate(value);
      wizardFieldsRef.current.birthDate = value;
      queueSave("text");
    },
    [queueSave],
  );

  const handleDeathDateChange = useCallback(
    (value: string) => {
      setDeathDate(value);
      wizardFieldsRef.current.deathDate = value;
      queueSave("text");
    },
    [queueSave],
  );

  const handleSocialSelect = useCallback(
    (id: SocialId) => {
      const next = id === selectedSocial ? null : id;
      setSelectedSocial(next);
      wizardFieldsRef.current.selectedSocial = next;
      queueSave("immediate");
    },
    [selectedSocial, queueSave],
  );

  const handleBasePackageChange = useCallback(
    (pkg: WizardBasePackage) => {
      setBasePackage(pkg);
      wizardFieldsRef.current.basePackage = pkg;
      queueSave("immediate");
    },
    [queueSave],
  );

  const handleActTracksChange = useCallback(
    (next: WizardActTracks) => {
      setActTracks(next);
      wizardFieldsRef.current.actTracks = next;
      queueSave("immediate");
    },
    [queueSave],
  );

  const handleExtensionsChange = useCallback(
    (next: WizardExtensionsState) => {
      setExtensions(next);
      wizardFieldsRef.current.extensions = next;
      queueSave("immediate");
    },
    [queueSave],
  );

  const handleContinueToPreview = useCallback(async () => {
    await navigateToStep(7);
  }, [navigateToStep]);

  const handleProceedToPayment = useCallback(async () => {
    await navigateToStep(8);
  }, [navigateToStep]);

  const handlePreviewEdit = useCallback(async () => {
    await navigateToStep(6);
  }, [navigateToStep]);

  const handlePay = useCallback(async () => {
    if (!uploadProjectId) {
      setPayError(copy.checkoutMissingProject);
      return;
    }

    setIsPaying(true);
    setPayError(null);

    try {
      await flush();
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: uploadProjectId, locale }),
      });
      const data = (await res.json()) as {
        url?: string;
        redirectUrl?: string;
        mode?: string;
        message?: string;
        error?: string;
      };

      if (!res.ok) {
        setPayError(
          typeof data.message === "string" ? data.message : copy.checkoutPayError,
        );
        return;
      }

      if (data.mode === "partner" && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      if (!data.url) {
        setPayError(copy.checkoutPayError);
        return;
      }

      window.location.href = data.url;
    } catch {
      setPayError(copy.checkoutPayError);
    } finally {
      setIsPaying(false);
    }
  }, [uploadProjectId, locale, flush, copy]);

  const handleAvatarChange = useCallback(
    (list: FileList | null) => {
      const file = list?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      setAvatarPreview((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      avatarHydratedPathRef.current = null;

      if (uploadProjectId) {
        void uploadAvatarToStorage(file, uploadProjectId);
      } else {
        pendingAvatarFileRef.current = file;
      }
    },
    [uploadProjectId, uploadAvatarToStorage],
  );

  const socialRows = useMemo(
    () =>
      [
        {
          id: "facebook" as const,
          label: copy.socialFacebook,
          Icon: Share2,
          halo: SOCIAL_HALOS.facebook,
        },
        {
          id: "instagram" as const,
          label: copy.socialInstagram,
          Icon: ImageIcon,
          halo: SOCIAL_HALOS.instagram,
        },
        {
          id: "tiktok" as const,
          label: copy.socialTikTok,
          Icon: Music2,
          halo: SOCIAL_HALOS.tiktok,
        },
        {
          id: "google" as const,
          label: copy.socialGooglePhotos,
          Icon: Cloud,
          halo: SOCIAL_HALOS.google,
        },
      ] as const,
    [copy],
  );

  const extensionRecapLineLabels = useMemo(
    () => ({
      aiRetouch: copy.recapLineAiRetouch,
      extendedLicense: copy.recapLineExtendedLicense,
      collectorUsb: copy.recapLineCollectorUsb,
      digitalVault: copy.recapLineDigitalVault,
      heritagePack: copy.recapLineHeritagePack,
    }),
    [copy],
  );

  const stepperSteps = useMemo(
    () => [
      { id: 1, label: copy.stepperEssentials },
      { id: 2, label: copy.stepperSources },
      { id: 3, label: copy.stepperVault },
      { id: 4, label: copy.stepperMontage },
      { id: 5, label: copy.stepperSound },
      { id: 6, label: copy.stepperExtensions },
      { id: 7, label: copy.stepperPreview },
      { id: 8, label: copy.stepperCheckout },
    ],
    [copy],
  );

  return (
    <div
      className={`relative mx-auto mt-10 w-full ${
        currentStep === 4
          ? "max-w-6xl px-2 md:px-4"
          : currentStep === 7
            ? "max-w-4xl"
            : currentStep >= 5
              ? "max-w-3xl"
              : "max-w-xl"
      }`}
    >
      {currentStep > 1 ? (
        <button
          type="button"
          onClick={() => void goBack()}
          className="mb-6 inline-flex items-center gap-2 rounded-lg px-1 py-1 text-sm font-light text-zinc-400 transition-colors hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
          {copy.back}
        </button>
      ) : null}

      <AutosaveIndicator
        status={autosaveStatus}
        copy={{
          saving: copy.autosaveSaving,
          saved: copy.autosaveSaved,
          error: copy.autosaveError,
        }}
        className="-translate-y-1 md:-translate-y-2"
      />

      {/* Sticky tribute header — à partir de l’étape 2 */}
      {currentStep >= 2 ? (
        <header className="sticky top-0 z-50 -mx-6 mb-8 border-b border-white/10 bg-black/40 px-6 py-3.5 backdrop-blur-xl md:-mx-10 md:px-10">
          <div className="mx-auto flex max-w-5xl items-center gap-4">
            <div
              className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-white/5"
              aria-hidden={!avatarPreview}
            >
              {avatarPreview ? (
                <img
                  alt=""
                  key={avatarPreview}
                  src={avatarPreview}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-white/[0.06]">
                  <User className="h-5 w-5 text-zinc-500" strokeWidth={1.2} />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-editorial truncate text-lg font-medium leading-tight tracking-[0.02em] text-zinc-100 md:text-xl">
                {deceasedDisplayName}
              </p>
              <p className="font-[family-name:var(--font-label)] mt-0.5 text-xs font-normal tracking-[0.18em] text-zinc-500 uppercase">
                {yearsDisplay}
              </p>
            </div>
          </div>
        </header>
      ) : null}

      <section
        className="flex flex-col"
        aria-labelledby={wizardTitleId}
      >
        <WizardStepper
          steps={stepperSteps}
          currentStep={currentStep}
          totalSteps={TOTAL_STEPS}
          onStepClick={handleStepperClick}
          copy={{
            ariaLabel: copy.progressAria,
            stepLabel: copy.stepLabel,
          }}
        />

        <StickyPriceBar
          extensions={extensions}
          basePackage={basePackage}
          isPartner={isPartner}
          copy={{
            consumerTotalLabel: copy.stickyConsumerTotal,
            partnerTokenCostLabel: copy.stickyPartnerTokenCost,
          }}
        />

        {currentStep >= 5 && currentStep <= 6 && !isPartner ? (
          <div className="mb-8">
            <WizardCartSummary
              locale={locale}
              extensions={extensions}
              basePackage={basePackage}
              copy={{
                labelWithOptions: copy.cartLabelWithOptions,
                labelBaseOnly: copy.cartLabelBaseOnly,
                totalFormula: copy.cartTotalFormula,
              }}
            />
          </div>
        ) : null}

        <div className="min-h-[min(48vh,26rem)] pb-40">
          {currentStep === 1 ? (
            <>
              <h2
                id={wizardTitleId}
                className="font-[family-name:var(--font-label)] text-balance text-2xl font-light tracking-wide text-zinc-100 md:text-[1.65rem]"
              >
                {copy.stepEssentialTitle}
              </h2>
              <p className="mt-5 text-lg font-light leading-relaxed text-zinc-400 md:text-xl">
                {copy.stepEssentialDescription}
              </p>

              <div className="mt-10 flex flex-col items-center">
                <p className="mb-4 w-full text-center text-[11px] font-medium uppercase tracking-[0.28em] text-zinc-500">
                  {copy.primaryPhotoLabel}
                </p>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  aria-label={copy.primaryPhotoLabel}
                  onChange={(e) => handleAvatarChange(e.target.files)}
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="group relative flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.04] shadow-[0_0_28px_rgba(139,92,246,0.12)] transition-[box-shadow,border-color] hover:border-white/18 hover:shadow-[0_0_36px_rgba(167,139,250,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020202]"
                >
                  <span
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      background:
                        "radial-gradient(circle at 50% 100%, rgba(167,139,250,0.2) 0%, transparent 65%)",
                    }}
                  />
                  {avatarPreview ? (
                    <img
                      alt=""
                      key={avatarPreview}
                      src={avatarPreview}
                      className="relative z-[1] h-full w-full object-cover"
                    />
                  ) : (
                    <Camera
                      className="relative z-[1] h-11 w-11 text-zinc-500"
                      strokeWidth={1.1}
                      aria-hidden
                    />
                  )}
                </button>
                <p className="mt-4 max-w-sm text-center text-sm font-light text-zinc-500">
                  {copy.primaryPhotoHint}
                </p>
                {avatarPreview ? (
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="mt-3 text-sm text-teal-400/90 underline decoration-teal-500/30 underline-offset-4 hover:text-teal-300"
                  >
                    {copy.avatarChangePhoto}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="mt-3 text-sm font-medium text-zinc-400 hover:text-zinc-300"
                  >
                    {copy.avatarPickPhoto}
                  </button>
                )}
              </div>

              <div className="mt-12 space-y-6">
                <div className="space-y-2">
                  <label
                    htmlFor="tw-first"
                    className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.28em] text-zinc-500"
                  >
                    <User className="h-3.5 w-3.5 text-zinc-600" aria-hidden />
                    {copy.firstNameLabel}
                  </label>
                  <input
                    id="tw-first"
                    value={firstName}
                    onChange={(e) => handleFirstNameChange(e.target.value)}
                    autoComplete="given-name"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-lg font-light text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition-[border,box-shadow] placeholder:text-zinc-600 focus:border-violet-400/25 focus:shadow-[0_0_24px_rgba(139,92,246,0.12)]"
                    placeholder={copy.firstNameLabel}
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="tw-last"
                    className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.28em] text-zinc-500"
                  >
                    <User className="h-3.5 w-3.5 text-zinc-600" aria-hidden />
                    {copy.lastNameLabel}
                  </label>
                  <input
                    id="tw-last"
                    value={lastName}
                    onChange={(e) => handleLastNameChange(e.target.value)}
                    autoComplete="family-name"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-lg font-light text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition-[border,box-shadow] placeholder:text-zinc-600 focus:border-violet-400/25 focus:shadow-[0_0_24px_rgba(139,92,246,0.12)]"
                    placeholder={copy.lastNameLabel}
                  />
                </div>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label
                      htmlFor="tw-birth"
                      className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.28em] text-zinc-500"
                    >
                      <Calendar
                        className="h-3.5 w-3.5 text-zinc-600"
                        aria-hidden
                      />
                      {copy.birthDateLabel}
                    </label>
                    <input
                      id="tw-birth"
                      type="date"
                      value={birthDate}
                      onChange={(e) => handleBirthDateChange(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-base font-light text-zinc-200 outline-none focus:border-teal-400/25 focus:shadow-[0_0_20px_rgba(6,182,212,0.12)]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label
                      htmlFor="tw-death"
                      className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.28em] text-zinc-500"
                    >
                      <Calendar
                        className="h-3.5 w-3.5 text-zinc-600"
                        aria-hidden
                      />
                      {copy.deathDateLabel}
                    </label>
                    <input
                      id="tw-death"
                      type="date"
                      value={deathDate}
                      onChange={(e) => handleDeathDateChange(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-base font-light text-zinc-200 outline-none focus:border-teal-400/25 focus:shadow-[0_0_20px_rgba(6,182,212,0.12)]"
                    />
                  </div>
                </div>
              </div>

              <WizardBasePackagePicker
                locale={locale}
                value={basePackage}
                onChange={handleBasePackageChange}
                hidePrices={isPartner}
                copy={{
                  title: copy.basePackageTitle,
                  hint: copy.basePackageHint,
                  essentialLabel: copy.basePackageEssential,
                  essentialDescription: copy.basePackageEssentialDesc,
                  signatureLabel: copy.basePackageSignature,
                  signatureDescription: copy.basePackageSignatureDesc,
                  heritageLabel: copy.basePackageHeritage,
                  heritageDescription: copy.basePackageHeritageDesc,
                  heritageBundlePromo: copy.basePackageHeritageBundlePromo,
                }}
              />

              {essentialError ? (
                <p
                  className="mt-6 text-center text-sm font-light text-rose-400/90"
                  role="alert"
                >
                  {copy.validationEssential}
                </p>
              ) : null}
            </>
          ) : null}

          {currentStep === 2 ? (
            <>
              <h2
                id={wizardTitleId}
                className="font-[family-name:var(--font-label)] text-balance text-2xl font-light tracking-wide text-zinc-100 md:text-[1.65rem]"
              >
                {copy.stepSourcesTitle}
              </h2>
              <p className="mt-5 text-lg font-light leading-relaxed text-zinc-400 md:text-xl">
                {copy.stepSourcesDescription}
              </p>
              <p className="mt-4 text-sm font-light leading-relaxed text-zinc-500">
                {copy.socialQuickLoginNote}
              </p>

              <WizardBasePackagePicker
                locale={locale}
                value={basePackage}
                onChange={handleBasePackageChange}
                compact
                hidePrices={isPartner}
                copy={{
                  title: copy.basePackageTitle,
                  hint: copy.basePackageHint,
                  essentialLabel: copy.basePackageEssential,
                  essentialDescription: copy.basePackageEssentialDesc,
                  signatureLabel: copy.basePackageSignature,
                  signatureDescription: copy.basePackageSignatureDesc,
                  heritageLabel: copy.basePackageHeritage,
                  heritageDescription: copy.basePackageHeritageDesc,
                  heritageBundlePromo: copy.basePackageHeritageBundlePromo,
                }}
              />

              <div className="mt-10 flex flex-col gap-3">
                {socialRows.map(({ id, label, Icon, halo }) => (
                  <button
                    key={id}
                    type="button"
                    className={`group relative overflow-hidden rounded-2xl border px-5 py-4 text-left shadow-[0_0_20px_rgba(6,182,212,0.06)] transition-[border,box-shadow] md:py-5 ${
                      selectedSocial === id
                        ? "border-white/20 shadow-[0_0_28px_rgba(34,211,238,0.15)]"
                        : "border-white/10 hover:border-white/16"
                    }`}
                    aria-pressed={selectedSocial === id}
                    onClick={() => handleSocialSelect(id)}
                  >
                    <span
                      className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      style={{ background: halo }}
                    />
                    <span className="relative flex items-center gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-zinc-300">
                        <Icon className="h-5 w-5" strokeWidth={1.35} />
                      </span>
                      <span className="font-[family-name:var(--font-label)] text-base font-normal tracking-wide text-zinc-100 md:text-lg">
                        {label}
                      </span>
                    </span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="mt-10 w-full rounded-2xl border border-dashed border-white/15 bg-white/[0.02] py-4 text-center text-base font-light text-zinc-400 transition-colors hover:border-white/22 hover:bg-white/[0.05] hover:text-zinc-200"
                onClick={() => void goNext()}
              >
                {copy.skipSources}
              </button>
            </>
          ) : null}

          {currentStep === 3 ? (
            <>
              <h2
                id={wizardTitleId}
                className="font-[family-name:var(--font-label)] text-balance text-2xl font-light tracking-wide text-zinc-100 md:text-[1.65rem]"
              >
                {copy.stepMediaTitle}
              </h2>
              <p className="mt-5 text-lg font-light leading-relaxed text-zinc-400 md:text-xl">
                {copy.stepMediaDescription}
              </p>

              {projectDraftError ? (
                <div className="mt-6 rounded-xl border border-fuchsia-500/45 bg-fuchsia-950/10 p-4 shadow-[0_0_24px_rgba(255,0,255,0.22)] backdrop-blur-md">
                  <p className="text-sm font-medium text-fuchsia-200/95">
                    {copy.projectDraftErrorTitle}
                  </p>
                  <p className="mt-1 text-xs text-fuchsia-100/90">
                    {projectDraftError}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setProjectDraftError(null);
                      setUploadProjectId(null);
                    }}
                    className="mt-3 inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-light text-zinc-200 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                  >
                    {copy.projectDraftRetry}
                  </button>
                </div>
              ) : null}

              {!uploadProjectId ? (
                <div
                  className="mt-10 flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/12 bg-white/[0.03] px-6 py-16 text-center text-sm font-light text-zinc-400 backdrop-blur-xl"
                  aria-live="polite"
                >
                  {projectDraftLoading
                    ? copy.projectDraftLoading
                    : copy.projectDraftIdle}
                </div>
              ) : (
                <MediaDropzoneAdapter
                  projectId={uploadProjectId}
                  userId={uploadUserId ?? undefined}
                  tenantId={uploadTenantId ?? undefined}
                  autoStart
                  maxFiles={150}
                  maxFileSizeBytes={300 * 1024 * 1024}
                >
                  {(dz) => {
                    const totalQueued = dz.items.length;
                    const isStep3Locked =
                      dz.isRunning || dz.totals.uploaded === 0;

                    return (
                      <>
                        <div
                          {...dz.getRootProps({
                            className: `group relative mt-10 flex w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-white/[0.03] px-6 py-16 text-center backdrop-blur-xl shadow-[0_0_24px_rgba(99,102,241,0.08)] transition-[border,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020202] ${
                              dz.isDragReject
                                ? "border-fuchsia-500/60 shadow-[0_0_32px_rgba(255,0,255,0.24)] focus-visible:ring-fuchsia-500/40"
                                : dz.isDragAccept || dz.isDragActive
                                  ? "border-teal-400/30 shadow-[0_0_32px_rgba(34,211,238,0.16)] focus-visible:ring-teal-400/35"
                                  : "border-white/12 hover:border-teal-400/25 hover:shadow-[0_0_32px_rgba(34,211,238,0.12)] focus-visible:ring-teal-400/35"
                            }`,
                          })}
                          aria-describedby="wizard-step3-dropzone-hint"
                        >
                          <input {...dz.getInputProps({ "aria-label": copy.uploadAria })} />

                          <span
                            className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-400 group-hover:opacity-100"
                            style={{
                              background: dz.isDragReject
                                ? "radial-gradient(ellipse 80% 70% at 50% 80%, rgba(255, 0, 255, 0.24) 0%, transparent 55%)"
                                : "radial-gradient(ellipse 80% 70% at 50% 80%, rgba(34,211,238,0.15) 0%, transparent 55%)",
                            }}
                          />

                          <div className="relative flex items-center gap-3 text-teal-300/85">
                            <ImageIcon className="h-11 w-11 shrink-0" strokeWidth={1.1} />
                            <Music2 className="h-9 w-9 shrink-0 opacity-70" strokeWidth={1.1} />
                          </div>
                          <span className="relative mt-6 text-lg font-light text-zinc-200 md:text-xl">
                            {copy.uploadPrompt}
                          </span>
                          <span
                            id="wizard-step3-dropzone-hint"
                            className="relative mt-2 text-sm font-light text-zinc-500"
                          >
                            {copy.uploadSubtext}
                          </span>
                          {totalQueued > 0 ? (
                            <span
                              className="relative mt-4 text-sm text-teal-400/90"
                              aria-live="polite"
                            >
                              {copy.uploadFilesCount.replace(
                                "{count}",
                                String(totalQueued),
                              )}
                              {dz.totals.uploaded > 0 || dz.totals.uploading > 0 || dz.totals.failed > 0 ? (
                                <span className="ml-2 text-xs font-light text-zinc-400">
                                  {copy.uploadBreakdown
                                    .replace("{uploaded}", String(dz.totals.uploaded))
                                    .replace("{uploading}", String(dz.totals.uploading))
                                    .replace("{failed}", String(dz.totals.failed))}
                                </span>
                              ) : null}
                            </span>
                          ) : null}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              dz.open();
                            }}
                            className="relative mt-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                          >
                            {copy.uploadPrompt}
                          </button>
                        </div>

                        {dz.rejections.length > 0 ? (
                          <div className="mt-5 rounded-xl border border-fuchsia-500/45 bg-fuchsia-950/10 p-4 shadow-[0_0_24px_rgba(255,0,255,0.22)] backdrop-blur-md">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-fuchsia-200/95">
                                {copy.rejectionsTitle}
                              </p>
                              <button
                                type="button"
                                onClick={dz.clearRejections}
                                className="text-xs text-fuchsia-200/80 underline decoration-fuchsia-300/40 underline-offset-4 hover:text-fuchsia-100"
                              >
                                {copy.rejectionsClear}
                              </button>
                            </div>
                            <ul className="space-y-1.5">
                              {dz.rejections.slice(0, 6).map((r, idx) => (
                                <li key={`${r.fileName}-${idx}`} className="text-xs text-fuchsia-100/90">
                                  <span className="font-medium text-[#ff00ff]">{r.code}</span>{" "}
                                  <span className="text-fuchsia-100/80">- {r.fileName}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        <MediaQueueGrid
                          items={dz.items}
                          isRunning={dz.isRunning}
                          deletingId={dz.deletingId}
                          onRemove={dz.handleRemoveItem}
                          onRetry={dz.retryItem}
                          copy={{
                            emptyTitle: copy.queueEmpty,
                            statusQueued: copy.queueStatusQueued,
                            statusUploading: copy.queueStatusUploading,
                            statusUploaded: copy.queueStatusUploaded,
                            statusFailed: copy.queueStatusFailed,
                            statusCancelled: copy.queueStatusCancelled,
                            remove: copy.queueRemove,
                            retry: copy.queueRetry,
                          }}
                        />

                        <p className="mt-4 text-sm font-light text-zinc-500">
                          {dz.isRunning
                            ? copy.uploadInProgress
                            : dz.totals.uploaded === 0
                              ? copy.uploadAtLeastOne
                              : null}
                        </p>

                        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#020202]/90 px-4 py-4 backdrop-blur-xl md:px-8">
                          <div className="mx-auto flex max-w-xl gap-3">
                            <button
                              type="button"
                              onClick={() => void goBack()}
                              className="font-[family-name:var(--font-label)] min-h-[52px] flex-1 rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-base font-normal text-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.04)] transition-colors hover:bg-white/[0.09]"
                            >
                              {copy.back}
                            </button>

                          <button
                            type="button"
                            onClick={() => void goNext()}
                            disabled={isStep3Locked}
                            className="font-[family-name:var(--font-label)] min-h-[52px] flex-[1.35] rounded-2xl border border-white/12 bg-white/[0.08] px-4 text-base font-normal text-zinc-50 shadow-[0_0_24px_rgba(167,139,250,0.12)] transition-colors hover:bg-white/[0.11] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                          >
                            {copy.next}
                          </button>
                        </div>
                      </div>
                    </>
                  );
                }}
              </MediaDropzoneAdapter>
              )}
            </>
          ) : null}

          {currentStep === 4 ? (
            <>
              <h2
                id={wizardTitleId}
                className="font-[family-name:var(--font-label)] text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl"
              >
                {copy.stepMontageTitle}
              </h2>

              {uploadProjectId ? (
                <div className="mt-6">
                  <MontageStep
                    projectId={uploadProjectId}
                    montage={montage}
                    onMontageChange={handleMontageChange}
                    copy={{
                      loading: copy.montageLoading,
                      empty: copy.montageEmpty,
                      instruction: copy.stepMontageDescription,
                      shortcutSelect: copy.montageShortcutSelect,
                      shortcutSelectAll: copy.montageShortcutSelectAll,
                      shortcutDrag: copy.montageShortcutDrag,
                      focalHint: copy.montageFocalHint,
                      clickToEdit: copy.montageClickToEdit,
                      dragHandle: copy.montageDragHandle,
                      remove: copy.montageRemove,
                      unassignedTitle: copy.montageUnassignedTitle,
                      unassignedHint: copy.montageUnassignedHint,
                      multiDragLabel: copy.montageMultiDragLabel,
                      selectAll: copy.montageSelectAll,
                      selectionCount: copy.montageSelectionCount,
                      allSelected: copy.montageAllSelected,
                      shortcutEscape: copy.montageShortcutEscape,
                      selectionHint: copy.montageSelectionHint,
                      clearSelection: copy.montageClearSelection,
                      duplicatesBanner: copy.montageDuplicatesBanner,
                      duplicatesHint: copy.montageDuplicatesHint,
                      removeDuplicates: copy.montageRemoveDuplicates,
                      removingDuplicates: copy.montageRemovingDuplicates,
                      duplicateBadge: copy.montageDuplicateBadge,
                      deleteDuplicate: copy.montageDeleteDuplicate,
                      actSparkLabel: copy.montageActSparkLabel,
                      actSparkSubtitle: copy.montageActSparkSubtitle,
                      actEpicLabel: copy.montageActEpicLabel,
                      actEpicSubtitle: copy.montageActEpicSubtitle,
                      actLegacyLabel: copy.montageActLegacyLabel,
                      actLegacySubtitle: copy.montageActLegacySubtitle,
                      actEmptyHint: copy.montageActEmptyHint,
                      exclude: copy.montageExclude,
                      include: copy.montageInclude,
                      excludedBadge: copy.montageExcludedBadge,
                      directorClose: copy.montageDirectorClose,
                      directorPrevious: copy.montageDirectorPrevious,
                      directorNext: copy.montageDirectorNext,
                      directorCounter: copy.montageDirectorCounter,
                    }}
                  />
                </div>
              ) : null}

              {montageError ? (
                <p
                  className="mt-6 text-center text-sm font-light text-rose-400/90"
                  role="alert"
                >
                  {copy.montageNeedOneIncluded}
                </p>
              ) : null}
            </>
          ) : null}

          {currentStep === 5 ? (
            <SoundSignatureStep
              catalogTier={musicCatalogTier}
              tracks={actTracks}
              onTracksChange={handleActTracksChange}
              copy={{
                title: copy.stepSoundTitle,
                description: copy.stepSoundDescription,
                act1Title: copy.soundAct1Title,
                act2Title: copy.soundAct2Title,
                act3Title: copy.soundAct3Title,
                actEmptyLabel: copy.soundActEmptyLabel,
                actProgress: copy.soundActProgress,
                searchPlaceholder: copy.soundSearchPlaceholder,
                searchHint: copy.soundSearchHint,
                searching: copy.soundSearching,
                noResults: copy.soundNoResults,
                listenCta: copy.soundListenCta,
                chooseCta: copy.soundChooseCta,
                changeCta: copy.soundChangeCta,
                serviceUnavailable: copy.soundServiceUnavailable,
                previewUnavailable: copy.soundPreviewUnavailable,
                licensedNote: copy.soundLicensedNote,
                previewPremiumBadge: copy.soundPreviewPremiumBadge,
                catalogAccessStandard: copy.soundCatalogAccessStandard,
                catalogAccessPremium: copy.soundCatalogAccessPremium,
              }}
            />
          ) : null}

          {currentStep === 6 ? (
            <MontageExtensionsStep
              locale={locale}
              extensions={extensions}
              basePackage={basePackage}
              onChange={handleExtensionsChange}
              copy={{
                title: copy.stepExtensionsTitle,
                description: copy.stepExtensionsDescription,
                aiRetouchTitle: copy.extensionAiRetouchTitle,
                aiRetouchDescription: copy.extensionAiRetouchDescription,
                extendedLicenseTitle: copy.extensionExtendedLicenseTitle,
                extendedLicenseDescription:
                  copy.extensionExtendedLicenseDescription,
                collectorUsbTitle: copy.extensionCollectorUsbTitle,
                collectorUsbDescription: copy.extensionCollectorUsbDescription,
                digitalVaultTitle: copy.extensionDigitalVaultTitle,
                digitalVaultDescription: copy.extensionDigitalVaultDescription,
                heritagePackTitle: copy.extensionHeritagePackTitle,
                heritagePackDescription: copy.extensionHeritagePackDescription,
                heritagePackSavings: copy.extensionHeritagePackSavings,
                heritagePackIncludes: copy.extensionHeritagePackIncludes,
                includedInHeritageBadge: copy.extensionIncludedInHeritage,
                selectedBadge: copy.extensionSelectedBadge,
                recapTitle: copy.extensionsRecapTitle,
                recapEmpty: copy.extensionsRecapEmpty,
                recapLineLabels: extensionRecapLineLabels,
              }}
            />
          ) : null}

          {currentStep === 7 ? (
            <PreviewStep
              projectId={uploadProjectId}
              montage={montage}
              actTracks={actTracks}
              extensions={extensions}
              basePackage={basePackage}
              onProceedToPayment={() => void handleProceedToPayment()}
              onEdit={() => void handlePreviewEdit()}
              copy={{
                title: copy.stepPreviewTitle,
                description: copy.stepPreviewDescription,
                loadingMedia: copy.previewLoadingMedia,
                payCta: copy.previewPayCta,
                editLink: copy.previewEditLink,
                valueNote: copy.previewValueNote,
                valueAiRetouch: copy.previewValueAiRetouch,
                valueLicense: copy.previewValueLicense,
                teaserLoading: copy.previewTeaserLoading,
                teaserEmpty: copy.previewTeaserEmpty,
                teaserNowPlaying: copy.previewTeaserNowPlaying,
                teaserPlay: copy.previewTeaserPlay,
                teaserPause: copy.previewTeaserPause,
              }}
            />
          ) : null}

          {currentStep === 8 ? (
            <CheckoutStep
              locale={locale}
              extensions={extensions}
              basePackage={basePackage}
              isPartner={isPartner}
              isPaying={isPaying}
              payError={payError}
              onPay={() => void handlePay()}
              copy={{
                title: copy.stepCheckoutTitle,
                description: copy.stepCheckoutDescription,
                recapTitle: copy.checkoutRecapTitle,
                baseLabel: copy.checkoutBaseLabel,
                recapLineLabels: extensionRecapLineLabels,
                totalLabel: copy.checkoutTotalLabel,
                secureNote: copy.checkoutSecureNote,
                payCta: copy.checkoutPayCta,
                partnerPayCta: copy.checkoutPartnerPayCta,
                partnerRecapLabel: copy.checkoutPartnerRecap,
                paying: copy.checkoutPaying,
                payError: copy.checkoutPayError,
              }}
            />
          ) : null}
        </div>
      </section>

      {currentStep === 6 ? (
        <ExtensionsStickyFooter
          locale={locale}
          extensions={extensions}
          basePackage={basePackage}
          isPartner={isPartner}
          onSkip={() => void handleContinueToPreview()}
          onContinue={() => void handleContinueToPreview()}
          copy={{
            totalFormula: copy.extensionsFooterTotalFormula,
            partnerTokenCostLabel: copy.stickyPartnerTokenCost,
            continueCta: copy.extensionsFooterContinueCta,
            skipStep: copy.skipStep,
          }}
        />
      ) : null}

      {currentStep !== 3 && currentStep !== 6 && currentStep !== 7 && currentStep !== 8 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#020202]/90 px-4 py-4 backdrop-blur-xl md:px-8">
          <div
            className={`mx-auto ${
              currentStep >= 5 ? "max-w-3xl" : "max-w-xl"
            }`}
          >
            {currentStep <= 5 ? (
              <button
                type="button"
                onClick={() => void goNext()}
                className="font-[family-name:var(--font-label)] min-h-[52px] w-full rounded-2xl border border-white/12 bg-white/[0.08] px-4 text-base font-normal text-zinc-50 shadow-[0_0_24px_rgba(167,139,250,0.12)] transition-colors hover:bg-white/[0.11]"
              >
                {copy.next}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

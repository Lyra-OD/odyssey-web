"use client";

import {
  ArrowLeft,
  Calendar,
  Camera,
  Image as ImageIcon,
  Music2,
  User,
  X,
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
import { SoftCapModal, SoftCapMediaCountSync } from "@/src/components/tribute/SoftCapModal";
import { MediaDropzoneAdapter } from "@/src/components/media/MediaDropzoneAdapter";
import { MediaQueueGrid } from "@/src/components/media/MediaQueueGrid";
import { StoryboardMontageStep } from "@/src/components/tribute/StoryboardMontageStep";
import { StoryboardChaptersStep } from "@/src/components/tribute/StoryboardChaptersStep";
import { WizardCartSummary } from "@/src/components/tribute/WizardCartSummary";
import { StickyPriceBar } from "@/src/components/StickyPriceBar";
import { WizardPhaseProgress } from "@/src/components/tribute/WizardPhaseProgress";
import {
  PackageDossierPanel,
  PackageDossierTrigger,
  type PackageDossierOption,
} from "@/src/components/tribute/PackageDossierPanel";
import {
  SanctuaryInvitePanel,
  SanctuaryInviteStep,
  SanctuaryInviteTrigger,
} from "@/src/components/tribute/SanctuaryInvitePanel";
import {
  CollabInviteInlineCard,
  CollabInvitePanel,
  CollabInviteTrigger,
  collabInviteCopyFromDictionary,
} from "@/src/components/tribute/CollabInvitePanel";
import { ScannerCompanionPanel } from "@/src/components/scanner/ScannerCompanionPanel";
import { ScannerCompanionPlaceholder } from "@/src/components/scanner/ScannerCompanionPlaceholder";
import { RestorationPreviewModal } from "@/src/components/scanner/RestorationPreviewModal";
import { VaultOnlineSourcesSection } from "@/src/components/tribute/VaultOnlineSourcesSection";
import { AutosaveIndicator } from "@/src/components/tribute/AutosaveIndicator";
import { useWizardAutosave } from "@/src/hooks/useWizardAutosave";
import { useWizardStep1Reveal } from "@/src/hooks/useWizardStep1Reveal";
import { useParcoursUx } from "@/src/hooks/useParcoursUx";
import { connexionSubmitButtonClass } from "@/src/components/salon/SalonCyanGlowText";
import { SkyBackdrop } from "@/src/components/contribute/SkyBackdrop";
import { WIZARD_MEDIA_POLL_INTERVAL_MS } from "@/src/lib/wizard/wizardMediaPoll";
import { SanctuaryWizardStep1Sky } from "@/src/components/tribute/SanctuaryWizardStep1Sky";
import { SanctuaryHubHero } from "@/src/components/tribute/SanctuaryHubHero";
import { ParcoursHubBodyFlag } from "@/src/components/tribute/ParcoursHubBodyFlag";
import { hubStarAnchorRef } from "@/src/components/tribute/hubStarAnchorRef";
import { useWizardCheckout } from "@/src/hooks/useWizardCheckout";
import { useWizardDraftLifecycle } from "@/src/hooks/useWizardDraftLifecycle";
import {
  useWizardEssentials,
  type UseWizardEssentialsParams,
} from "@/src/hooks/useWizardEssentials";
import { useWizardSoftCap } from "@/src/hooks/useWizardSoftCap";
import type { AppDictionary } from "@/lib/dictionaries";
import {
  coerceWizardState,
  emptyMontageState,
  emptyStoryboardState,
  resolveInitialWizardStep,
  WIZARD_STATE_VERSION,
  type SocialId,
  type WizardInitialDraft,
  type WizardMontageState,
  type WizardBasePackage,
  type WizardExtensionsState,
  type WizardActTracks,
  type WizardStateV1,
  type WizardStoryboardState,
} from "@/src/lib/wizard/wizardState";
import {
  buildPricingSnapshot,
  bundleSavingsDollarsLabel,
  calculateBundleSavings,
  canUploadPersonalAudio,
  formatWizardPrice,
  hasAiRestorationEntitlement,
  packageCents,
  packageTierRank,
  resolveMusicCatalogTier,
  WIZARD_ALL_PACKAGES,
  WIZARD_B2C_DIRECT_PACKAGES,
  WIZARD_PARTNER_GRANTED_PACKAGES,
  WIZARD_PRICING,
} from "@/src/lib/wizard/wizardPricing";
import { resolveChannelProfile } from "@/src/lib/wizard/channelProfile";
import {
  manifestPackageFromWizardBasePackage,
  packageMaxMediaItems,
  packageMaxSongs,
} from "@/src/lib/wizard/wizardDeliverables";
import { normalizeWizardStateForSave, toggleWizardExtension } from "@/src/lib/wizard/wizardExtensions";
import { resolvePackageDossierRows } from "@/src/lib/wizard/packageDossier";
import {
  emptyActTracks,
  hasAnyActTrack,
  STINGRAY_CATALOG_PROVIDER,
} from "@/src/lib/wizard/stingrayCatalog";
import { shouldOfferMagicSoftCap } from "@/src/lib/wizard/softCap";
import { MUSIC_RIGHTS_TOS_VERSION } from "@/src/lib/wizard/exportGate";
import {
  isWizardStepAllowedForRole,
  type WizardAccessRole,
} from "@/src/lib/wizard/collabCapabilities";
import { fetchProjectMedia } from "@/src/hooks/useMassMediaUpload";
import { useWizardStoryboard } from "@/src/hooks/useWizardStoryboard";
import type { Locale } from "@/i18n.config";

export type TributeWizardCopy = AppDictionary["tributeWizard"];

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const TOTAL_STEPS = 7;

type WizardFieldsSnapshot = {
  firstName: string;
  lastName: string;
  birthDate: string;
  deathDate: string;
  avatarPath: string | null;
  selectedSocial: SocialId | null;
  isPartner: boolean;
  basePackage: WizardBasePackage;
  grantedPackage: WizardBasePackage;
  intendedPackage: WizardBasePackage;
  montage: WizardMontageState;
  storyboard: WizardStoryboardState;
  extensions: WizardExtensionsState;
  actTracks: WizardActTracks;
  musicRightsAttestation?: WizardStateV1["musicRightsAttestation"];
};

function yearFromDateInput(iso: string): string {
  if (!iso?.trim()) return "";
  const y = Number.parseInt(iso.slice(0, 4), 10);
  return Number.isFinite(y) ? String(y) : "";
}

export function TributeWizard({
  copy,
  initialDraft = null,
  locale = "fr",
  isPartner: isPartnerProp = false,
  planOverride,
  accessRole = "owner",
}: {
  copy: TributeWizardCopy;
  initialDraft?: WizardInitialDraft | null;
  locale?: Locale;
  /** Compte funérarium / partenaire B2B (jetons). */
  isPartner?: boolean;
  /** Dev-only : force le forfait accordé (ex. `essential`) pour tester le
   * flux freemium Soft Cap en local. Ignoré en production (voir page studio). */
  planOverride?: string;
  /** Owner = parcours complet · Editor = étapes {3,4,5} sans commerce. */
  accessRole?: WizardAccessRole;
}) {
  const isEditor = accessRole === "editor";
  const hydrated = coerceWizardState(initialDraft?.wizard_state);
  const isPartnerInitial = hydrated.isPartner === true || isPartnerProp;
  const channelProfile = resolveChannelProfile({
    isFreemiumTenant: isPartnerInitial,
    hasInvitation: false,
  });
  const overridePackage: WizardBasePackage | undefined = (
    WIZARD_ALL_PACKAGES as readonly string[]
  ).includes(planOverride ?? "")
    ? (planOverride as WizardBasePackage)
    : undefined;

  /** Drafts pré-ChannelProfile figés sur Éternité par l'ancien défaut → recalés. */
  const hasChannelSpine =
    hydrated.channel === "partner" || hydrated.channel === "direct";
  const looksLikeLegacyHeritageDefault =
    !hasChannelSpine &&
    (hydrated.basePackage === "heritage" || !hydrated.basePackage) &&
    (hydrated.grantedPackage === "heritage" ||
      hydrated.grantedPackage === undefined) &&
    (hydrated.intendedPackage === "heritage" ||
      hydrated.intendedPackage === undefined);

  const initialBasePackage: WizardBasePackage =
    overridePackage ??
    (looksLikeLegacyHeritageDefault
      ? channelProfile.intendedPackage
      : (hydrated.intendedPackage ??
        hydrated.basePackage ??
        channelProfile.intendedPackage));

  const initialGrantedPackage: WizardBasePackage =
    overridePackage ??
    (looksLikeLegacyHeritageDefault
      ? channelProfile.grantedPackage
      : (hydrated.grantedPackage ??
        hydrated.basePackage ??
        hydrated.intendedPackage ??
        channelProfile.grantedPackage));

  const [currentStep, setCurrentStep] = useState<Step>(() => {
    const resolved = resolveInitialWizardStep(
      initialDraft?.wizard_step,
      hydrated,
      TOTAL_STEPS,
    ) as Step;
    if (accessRole === "editor") {
      if (!isWizardStepAllowedForRole("editor", resolved)) {
        return 3;
      }
    }
    return resolved;
  });
  const [essentialError, setEssentialError] = useState(false);
  const [chaptersStructureError, setChaptersStructureError] = useState(false);

  const [selectedSocial, setSelectedSocial] = useState<SocialId | null>(
    hydrated.socialSources?.selected ?? null,
  );
  // `montage` reste un pont legacy en lecture seule pour Preview/Checkout —
  // il n'est plus manipulé par une UI depuis le passage à `storyboard`
  // (Étape 4). Sera retiré lors du ticket cleanup-legacy.
  const [montage] = useState<WizardMontageState>(
    () => hydrated.montage ?? emptyMontageState(),
  );
  const [projectMediaCount, setProjectMediaCount] = useState(0);
  const [step3UploadRunning, setStep3UploadRunning] = useState(false);
  const [isPartner] = useState(isPartnerInitial);
  // Cascade V-Final : ChannelProfile décide l'entrée (partner = Souvenir 0 $,
  // B2C = Héritage 179 $). Plus jamais Éternité 349 $ par défaut.
  const [basePackage, setBasePackage] =
    useState<WizardBasePackage>(initialBasePackage);
  const [grantedPackage] =
    useState<WizardBasePackage>(initialGrantedPackage);
  const intendedPackage = basePackage;
  const [extensions, setExtensions] = useState<WizardExtensionsState>(
    () => hydrated.extensions ?? {},
  );
  const [restorationSrc, setRestorationSrc] = useState<string | null>(null);
  const [musicRightsAttestation, setMusicRightsAttestation] = useState<
    WizardStateV1["musicRightsAttestation"]
  >(() => hydrated.musicRightsAttestation);
  const allowPersonalAudioUpload = canUploadPersonalAudio(intendedPackage);
  const musicCatalogTier = useMemo(
    () => resolveMusicCatalogTier(basePackage, extensions),
    [basePackage, extensions],
  );
  const currentPackageId = useMemo(
    () => manifestPackageFromWizardBasePackage(basePackage),
    [basePackage],
  );
  const currentMaxMediaItems = useMemo(
    () => packageMaxMediaItems(currentPackageId),
    [currentPackageId],
  );
  const currentMaxSongs = useMemo(
    () => packageMaxSongs(currentPackageId),
    [currentPackageId],
  );
  // Trampoline de persistance : `useWizardStoryboard` doit être appelé avant
  // que `queueSave`/`wizardFieldsRef` n'existent (voir plus bas), mais son
  // callback `onChange` ne peut être invoqué qu'après le rendu complet — ce
  // ref est réassigné une fois `queueSave` disponible, sans jamais casser
  // l'ordre des hooks.
  const persistStoryboardRef = useRef<(next: WizardStoryboardState) => void>(
    () => {},
  );
  const magicPerformingRef = useRef(false);
  const handleStoryboardDomainChange = useCallback(
    (next: WizardStoryboardState) => persistStoryboardRef.current(next),
    [],
  );
  // Isole tout le domaine `WizardStoryboardState` (chapitres musicaux,
  // resynchronisation avec le forfait, doublons, validation structurelle) —
  // voir `useWizardStoryboard`. Ne gère jamais l'autosave lui-même.
  const wizardStoryboard = useWizardStoryboard({
    initialStoryboard: hydrated.storyboard ?? emptyStoryboardState(),
    packageId: currentPackageId,
    maxSongs: currentMaxSongs,
    projectMediaCount,
    onChange: handleStoryboardDomainChange,
  });
  const packageDisplayNameFor = useCallback(
    (pkg: WizardBasePackage): string => {
      switch (pkg) {
        case "essential":
          return copy.basePackageEssential;
        case "signature":
          return copy.basePackageSignature;
        case "heritage":
          return copy.basePackageHeritage;
        case "legendary":
          return copy.basePackageLegendary;
        default:
          return copy.basePackageEssential;
      }
    },
    [copy],
  );
  // Même liste que le Dossier de forfait global (en-tête) selon le canal —
  // ne doit jamais proposer un forfait invalide pour ce contexte (ex. jamais
  // Légendaire en canal partenaire freemium).
  const availableBasePackagesForWizard = useMemo(
    () => (isPartner ? WIZARD_PARTNER_GRANTED_PACKAGES : WIZARD_B2C_DIRECT_PACKAGES),
    [isPartner],
  );
  const basePackageOptions: PackageDossierOption[] = useMemo(
    () =>
      availableBasePackagesForWizard.map((pkg) => ({
        id: pkg,
        label: packageDisplayNameFor(pkg),
        priceCents: packageCents(pkg),
      })),
    [availableBasePackagesForWizard, packageDisplayNameFor],
  );
  // Tagline éditoriale par forfait (Dossier) — réutilise les descriptions
  // déjà rédigées pour l'ancien `WizardBasePackagePicker`.
  const packageTaglineFor = useCallback(
    (pkg: WizardBasePackage): string => {
      switch (pkg) {
        case "essential":
          return copy.basePackageEssentialDesc;
        case "signature":
          return copy.basePackageSignatureDesc;
        case "heritage":
          return copy.basePackageHeritageDesc;
        case "legendary":
          return copy.basePackageLegendaryDesc;
        default:
          return copy.basePackageEssentialDesc;
      }
    },
    [copy],
  );
  // Mention d'économie (Éternité uniquement) — `calculateBundleSavings`
  // renvoie 0 pour tout autre forfait, donc `null` en dehors de ce cas.
  const packageSavingsLabelFor = useCallback(
    (pkg: WizardBasePackage): string | null => {
      const savingsCents = calculateBundleSavings(pkg);
      if (savingsCents <= 0) return null;
      return copy.dossierSavingsBadge.replace(
        "{savings}",
        bundleSavingsDollarsLabel(savingsCents),
      );
    },
    [copy],
  );
  // Liste exhaustive des inclusions d'un forfait — sourcée de PACKAGE_MANIFEST
  // (jamais de texte marketing figé), consommée par le Dossier.
  const packageDossierRowsFor = useCallback(
    (pkg: WizardBasePackage) =>
      resolvePackageDossierRows(manifestPackageFromWizardBasePackage(pkg), {
        mediaLabel: copy.dossierRowMediaLabel,
        mediaValue: copy.dossierRowMediaValue,
        songsLabel: copy.dossierRowSongsLabel,
        songsValue: copy.dossierRowSongsValue,
        resolutionLabel: copy.dossierRowResolutionLabel,
        resolution1080p: copy.dossierRowResolution1080p,
        resolution4k: copy.dossierRowResolution4k,
        priorityLabel: copy.dossierRowPriorityLabel,
        priorityStandard: copy.dossierRowPriorityStandard,
        priorityHigh: copy.dossierRowPriorityHigh,
        priorityUltra: copy.dossierRowPriorityUltra,
        salonLabel: copy.dossierRowSalonLabel,
        salonPersonal: copy.dossierRowSalonPersonal,
        salonCatalog: copy.dossierRowSalonCatalog,
        socialLabel: copy.dossierRowSocialLabel,
        vaultLabel: copy.dossierRowVaultLabel,
        vaultValue: copy.dossierRowVaultValue,
        aiRestorationLabel: copy.dossierRowAiRestorationLabel,
        scannerLabel: copy.dossierRowScannerLabel,
        whiteGloveLabel: copy.dossierRowWhiteGloveLabel,
        included: copy.dossierRowIncluded,
        notIncluded: copy.dossierRowNotIncluded,
      }),
    [copy],
  );
  // Combien de chansons déjà choisies seraient perdues si ce forfait était
  // appliqué — pure, dérivée du storyboard courant. Consommé par le Dossier
  // pour son garde-fou "Gant Blanc" inline.
  const songsLostIfBasePackageSelected = useCallback(
    (pkg: WizardBasePackage) => {
      const targetMaxSongs = packageMaxSongs(manifestPackageFromWizardBasePackage(pkg));
      return wizardStoryboard.songsLostIfCappedTo(targetMaxSongs);
    },
    [wizardStoryboard.songsLostIfCappedTo],
  );
  const [isPackageDossierOpen, setIsPackageDossierOpen] = useState(false);
  const [isSanctuaryInviteOpen, setIsSanctuaryInviteOpen] = useState(false);
  const [isCollabInviteOpen, setIsCollabInviteOpen] = useState(false);

  const openPackageDossier = useCallback(() => {
    setIsPackageDossierOpen(true);
  }, []);
  // `actTracks` reste un pont legacy en lecture seule pour PreviewStep/
  // CheckoutStep — il n'est plus manipulé par une UI depuis la neutralisation
  // de SoundSignatureStep (ex-Étape 5, cul-de-sac fonctionnel remplacé par
  // StoryboardMontageStep). Sera retiré lors du ticket cleanup-legacy.
  const [actTracks] = useState<WizardActTracks>(
    () => hydrated.musicalAmbiance?.tracks ?? emptyActTracks(),
  );
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

  // Amorcé avec les valeurs hydratées (pas l'état `firstName` live, qui
  // n'existe pas encore avant `useWizardEssentials` — voir plus bas).
  const wizardFieldsRef = useRef<WizardFieldsSnapshot>({
    firstName: hydrated.essentials?.firstName ?? "",
    lastName: hydrated.essentials?.lastName ?? "",
    birthDate: hydrated.essentials?.birthDate ?? "",
    deathDate: hydrated.essentials?.deathDate ?? "",
    avatarPath: hydrated.essentials?.avatarPath?.trim() || null,
    selectedSocial,
    isPartner,
    basePackage,
    grantedPackage,
    intendedPackage,
    montage,
    storyboard: wizardStoryboard.storyboard,
    extensions,
    actTracks,
    musicRightsAttestation,
  });

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
      channel: channelProfile.channel,
      basePackage: pricing.basePackage,
      grantedPackage: s.grantedPackage,
      intendedPackage: s.intendedPackage,
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
      storyboard: s.storyboard,
      extensions: s.extensions,
      ...(s.musicRightsAttestation
        ? { musicRightsAttestation: s.musicRightsAttestation }
        : {}),
      ...(hasAnyActTrack(s.actTracks)
        ? {
            musicalAmbiance: {
              tracks: s.actTracks,
              catalogProvider: STINGRAY_CATALOG_PROVIDER,
            },
          }
        : {}),
    });
  }, [channelProfile.channel]);

  const { status: autosaveStatus, queueSave, flush, ensureDraft } =
    useWizardAutosave({
      projectId: uploadProjectId,
      wizardStep: currentStep,
      buildWizardState,
    });

  // Persistance des changements de storyboard (manuels ou resynchronisation
  // automatique déclenchée par `useWizardStoryboard`) — voir le trampoline
  // `persistStoryboardRef` déclaré plus haut.
  persistStoryboardRef.current = (next: WizardStoryboardState) => {
    wizardFieldsRef.current.storyboard = next;
    setChaptersStructureError(false);
    if (!magicPerformingRef.current) {
      queueSave("immediate");
    }
  };

  const {
    firstName,
    lastName,
    birthDate,
    deathDate,
    avatarPreview,
    avatarPath,
    avatarInputRef,
    handleFirstNameChange,
    handleLastNameChange,
    handleBirthDateChange,
    handleDeathDateChange,
    handleAvatarChange,
  } = useWizardEssentials({
    initial: hydrated.essentials,
    queueSave,
    uploadProjectId,
    wizardFieldsRef:
      wizardFieldsRef as unknown as UseWizardEssentialsParams["wizardFieldsRef"],
  });

  const step1Sky = !isEditor && currentStep === 1;
  /** Hub Hero seulement si identité jamais saisie (draft vierge à l'arrivée). */
  const [step1VirginHub] = useState(() => {
    const e = hydrated.essentials;
    return (
      !e?.firstName?.trim() &&
      !e?.lastName?.trim() &&
      !e?.birthDate?.trim() &&
      !e?.deathDate?.trim()
    );
  });
  const step1Reveal = useWizardStep1Reveal(firstName, {
    muteFirstNameSnap: step1Sky,
  });
  const hubCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const onHubCanvasMount = useCallback((canvas: HTMLCanvasElement | null) => {
    hubCanvasRef.current = canvas;
  }, []);
  const step1Parcours = useParcoursUx({
    enabled: step1Sky,
    revealPhase: step1Reveal.phase,
    virginHub: step1VirginHub,
    hubCanvasRef,
  });
  const [hubWebGLReady, setHubWebGLReady] = useState(false);
  const onHubWebGLReady = useCallback(() => setHubWebGLReady(true), []);
  const onHubStarAnchor = useCallback(
    (anchor: { x: number; y: number } | null) => {
      hubStarAnchorRef.current = anchor;
    },
    [],
  );

  useEffect(() => {
    if (!step1Sky) {
      setHubWebGLReady(false);
      hubStarAnchorRef.current = null;
      return;
    }
    if (!step1Parcours.showHubWebGL) {
      setHubWebGLReady(false);
      hubStarAnchorRef.current = null;
      hubCanvasRef.current = null;
    }
  }, [step1Sky, step1Parcours.showHubWebGL]);

  /** P0 : PNG immédiat au hub · fondu quand WebGL prêt. */
  const hubBackdropOpacity = step1Parcours.showHubHero
    ? hubWebGLReady
      ? 0
      : 1
    : step1Parcours.backdropOpacity;

  const hubWebGLLayerOpacity = hubWebGLReady
    ? step1Parcours.hubWebGLOpacity
    : 0;

  const step1RewardPendingRef = useRef(false);

  // Réaffecté à chaque rendu maintenant que les champs Essentiels vivent dans
  // `useWizardEssentials` (voir l'amorçage hydraté plus haut).
  wizardFieldsRef.current = {
    firstName,
    lastName,
    birthDate,
    deathDate,
    avatarPath,
    selectedSocial,
    isPartner,
    basePackage,
    grantedPackage,
    intendedPackage,
    montage,
    storyboard: wizardStoryboard.storyboard,
    extensions,
    actTracks,
    musicRightsAttestation,
  };

  useWizardDraftLifecycle({
    isEditor,
    ensureDraft,
    queueSave,
    currentStep,
    firstName,
    lastName,
    birthDate,
    deathDate,
    uploadProjectId,
    setUploadProjectId,
    setUploadUserId,
    setUploadTenantId,
    hasInitialDraft: Boolean(initialDraft?.id),
    projectDraftError,
    setProjectDraftError,
    projectDraftLoading,
    setProjectDraftLoading,
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
    if (!b && !d) return "·";
    return copy.headerYears
      .replace("{birth}", b || "·")
      .replace("{death}", d || "·");
  }, [birthDate, deathDate, copy.headerYears]);

  useEffect(() => {
    if (isPartnerProp) {
      wizardFieldsRef.current.isPartner = true;
    }
  }, [isPartnerProp]);

  useEffect(() => {
    if (currentStep !== 3 || !uploadProjectId) {
      setStep3UploadRunning(false);
    }
  }, [currentStep, uploadProjectId]);

  // Volume total de médias (Étape 3) — pilote le nombre minimum de chapitres
  // pré-générés à l'Étape 4 (S4). Refetch à chaque entrée dans l'étape pour
  // capter d'éventuels ajouts/suppressions faits en revenant en arrière.
  useEffect(() => {
    if (!uploadProjectId || (currentStep !== 4 && currentStep !== 5)) return;
    let aborted = false;
    void fetchProjectMedia(uploadProjectId)
      .then((items) => {
        if (!aborted) setProjectMediaCount(items.length);
      })
      .catch(() => {
        // Best-effort — la pré-génération retombe sur le dernier compte connu.
      });
    return () => {
      aborted = true;
    };
  }, [uploadProjectId, currentStep]);

  const canProceedEssential =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    birthDate.length > 0 &&
    deathDate.length > 0;

  const navigateToStep = useCallback(
    async (step: Step) => {
      if (step === currentStep) return;
      if (!isWizardStepAllowedForRole(accessRole, step)) return;
      await flush();
      setCurrentStep(step);
    },
    [accessRole, currentStep, flush],
  );

  const goNext = useCallback(async () => {
    if (currentStep === 1) {
      if (!canProceedEssential) {
        setEssentialError(true);
        return;
      }
      setEssentialError(false);
      if (step1Sky && step1Reveal.phase !== "done") {
        if (step1RewardPendingRef.current) return;
        step1RewardPendingRef.current = true;
        await flush();
        await step1Reveal.playReward();
        step1RewardPendingRef.current = false;
      }
    }
    if (currentStep === 4) {
      if (!wizardStoryboard.structureValidation.isValid) {
        setChaptersStructureError(true);
        return;
      }
      setChaptersStructureError(false);
      if (
        wizardStoryboard.duplicateSongInfo.hasDuplicates &&
        !wizardStoryboard.duplicateSongsAcknowledged
      ) {
        return;
      }
    }
    if (currentStep >= TOTAL_STEPS) return;
    const next = (currentStep + 1) as Step;
    if (!isWizardStepAllowedForRole(accessRole, next)) return;
    await navigateToStep(next);
  }, [
    accessRole,
    currentStep,
    canProceedEssential,
    navigateToStep,
    step1Reveal,
    step1Sky,
    flush,
    wizardStoryboard.structureValidation,
    wizardStoryboard.duplicateSongInfo,
    wizardStoryboard.duplicateSongsAcknowledged,
  ]);

  const goBack = useCallback(async () => {
    if (currentStep <= 1) return;
    const prev = (currentStep - 1) as Step;
    if (!isWizardStepAllowedForRole(accessRole, prev)) return;
    await navigateToStep(prev);
  }, [accessRole, currentStep, navigateToStep]);

  const handleStepperClick = useCallback(
    (step: number) => {
      // Éditeur : le progress remappe 1/2/3 → Wizard 3/4/5.
      const wizardStep = (isEditor ? step + 2 : step) as Step;
      void navigateToStep(wizardStep);
    },
    [isEditor, navigateToStep],
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
      wizardFieldsRef.current.intendedPackage = pkg;

      if (uploadProjectId) {
        void fetch(`/api/projects/${uploadProjectId}/package-intent`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intendedPackage: pkg }),
        }).catch((error) => {
          console.error("[wizard] package-intent failed:", error);
        });
        return;
      }

      queueSave("immediate");
    },
    [uploadProjectId, queueSave],
  );

  const handleExtensionsChange = useCallback(
    (next: WizardExtensionsState) => {
      setExtensions(next);
      wizardFieldsRef.current.extensions = next;
      queueSave("immediate");
    },
    [queueSave],
  );

  const handleAcceptMusicRights = useCallback(() => {
    const next = {
      acceptedAt: new Date().toISOString(),
      tosVersion: MUSIC_RIGHTS_TOS_VERSION,
    };
    setMusicRightsAttestation(next);
    wizardFieldsRef.current.musicRightsAttestation = next;
    queueSave("immediate");
  }, [queueSave]);

  const handleProceedToPayment = useCallback(async () => {
    await navigateToStep(7);
  }, [navigateToStep]);

  const handlePreviewEdit = useCallback(async () => {
    await navigateToStep(5);
  }, [navigateToStep]);

  const extensionRecapLineLabels = useMemo(
    () => ({
      aiRetouch: copy.recapLineAiRetouch,
      musicLicense: copy.recapLineMusicLicense,
      extendedLicense: copy.recapLineMusicLicense,
      storyVoice: copy.recapLineStoryVoice,
      sanctuaryToken: copy.recapLineSanctuaryToken,
      collectorUsb: copy.recapLineSanctuaryToken,
      digitalVault: copy.recapLineDigitalVault,
      memoryBook: copy.recapLineMemoryBook,
      heritagePack: copy.recapLineHeritagePack,
    }),
    [copy],
  );

  const {
    isPaying,
    payError,
    setPayError,
    fundCreditCents,
    ownerFloorCents,
    viralLoopEnabled,
    riderAccepted,
    setRiderAccepted,
    showCheckoutStayFree,
    handlePay,
  } = useWizardCheckout({
    uploadProjectId,
    locale,
    flush,
    isEditor,
    isPartner,
    currentStep,
    grantedPackage,
    intendedPackage,
    extensions,
    isFreemiumGrant: packageTierRank(grantedPackage) === 0,
    grantedMediaMax: packageMaxMediaItems(
      manifestPackageFromWizardBasePackage(grantedPackage),
    ),
    projectMediaCount,
    copy,
  });

  const {
    softCapMusicBrowse,
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
  } = useWizardSoftCap({
    isEditor,
    grantedPackage,
    intendedPackage,
    extensions,
    projectMediaCount,
    setProjectMediaCount,
    currentMaxMediaItems,
    handleBasePackageChange,
    handleExtensionsChange,
    navigateToStep: (step: number) => navigateToStep(step as Step),
    setPayError,
    copy,
  });

  // Co-Créateur : catalogue premium pour le craft ; Soft Cap UI masquée —
  // le titulaire paie à l'étape 7.
  const musicBrowseTier =
    isEditor || softCapMusicBrowse ? "premium" : musicCatalogTier;

  const stepperSteps = useMemo(
    () => [
      { id: 1, label: copy.stepperEssentials },
      { id: 2, label: copy.stepperSources },
      { id: 3, label: copy.stepperVault },
      { id: 4, label: copy.stepperChapters },
      { id: 5, label: copy.stepperMontage },
      { id: 6, label: copy.stepperPreview },
      { id: 7, label: copy.stepperCheckout },
    ],
    [copy],
  );

  // Stepper en 3 "phases" cinématiques (Déposer / Composer / Recevoir) plutôt
  // que 8 cercles linéaires — réduit la charge cognitive tout en gardant la
  // notion d'avancement (voir refonte en-tête global).
  // Co-Créateur : phases craft uniquement (pas de « Recevoir » / checkout).
  // Les numéros de phase sont locaux (1…N) ; onPhaseClick remap vers étapes Wizard.
  const wizardPhases = useMemo(() => {
    if (isEditor) {
      return [
        { id: 1, label: copy.phaseGatherLabel, firstStep: 1, lastStep: 1 },
        { id: 2, label: copy.phaseComposeLabel, firstStep: 2, lastStep: 3 },
      ];
    }
    return [
      { id: 1, label: copy.phaseGatherLabel, firstStep: 1, lastStep: 3 },
      { id: 2, label: copy.phaseComposeLabel, firstStep: 4, lastStep: 5 },
      { id: 3, label: copy.phaseReceiveLabel, firstStep: 6, lastStep: 7 },
    ];
  }, [copy, isEditor]);
  const currentStepLabel = useMemo(
    () => stepperSteps.find((step) => step.id === currentStep)?.label ?? "",
    [stepperSteps, currentStep],
  );
  const progressTotalSteps = isEditor ? 3 : TOTAL_STEPS;
  /** Éditeur : remap étapes Wizard 3/4/5 → progression locale 1/2/3. */
  const progressCurrentStep = isEditor
    ? (Math.min(5, Math.max(3, currentStep)) - 2)
    : currentStep;

  const collabInviteCopy = useMemo(
    () => collabInviteCopyFromDictionary(copy),
    [copy],
  );

  return (
    <>
      <ParcoursHubBodyFlag active={step1Parcours.hubChromeHidden} />
      {step1Sky && step1Parcours.showBackdrop ? (
        <SkyBackdrop
          src={step1Parcours.freezeCaptureUrl}
          opacity={hubBackdropOpacity}
          durationMs={step1Parcours.skyFadeMs}
          easing={step1Parcours.skyFadeEase}
        />
      ) : null}
      {step1Sky && step1Parcours.showFreezeVeil ? (
        <div
          className="pointer-events-none fixed inset-0 z-[1] transition-opacity"
          style={{
            transitionDuration: `${step1Parcours.skyFadeMs}ms`,
            transitionTimingFunction: step1Parcours.skyFadeEase,
            opacity: step1Parcours.freezeHolding ? 0.55 : 0.22,
            background:
              "radial-gradient(ellipse 55% 45% at 50% 48%, rgba(94,234,212,0.22) 0%, transparent 70%)",
          }}
          aria-hidden
        />
      ) : null}
      {step1Parcours.showHubHero ? (
        <SanctuaryHubHero
          openLabel={copy.parcoursHeroOpenLabel}
          onOpen={step1Parcours.openPanel}
        />
      ) : null}
      {step1Sky && step1Parcours.showHubWebGL ? (
        <SanctuaryWizardStep1Sky
          locale={locale}
          firstName={firstName}
          birthDate={birthDate}
          revealT={step1Reveal.revealT}
          revealTRef={step1Reveal.revealTRef}
          hideHeroName={step1Reveal.hideHeroName}
          skyActive={step1Parcours.hubSkyLive}
          silhouetteIdle={false}
          variant="hub-lite"
          layerOpacity={hubWebGLLayerOpacity}
          fadeMs={step1Parcours.skyFadeMs}
          fadeEase={step1Parcours.skyFadeEase}
          onHubReady={onHubWebGLReady}
          onHubCanvasMount={onHubCanvasMount}
          hubPrompt={copy.parcoursHeroPrompt}
          hubTapHint={copy.parcoursHeroTapHint}
          onStarAnchorChange={onHubStarAnchor}
        />
      ) : null}
      {step1Sky && step1Parcours.showRitualWebGL ? (
        <SanctuaryWizardStep1Sky
          locale={locale}
          firstName={firstName}
          birthDate={birthDate}
          revealT={step1Reveal.revealT}
          revealTRef={step1Reveal.revealTRef}
          hideHeroName={step1Reveal.hideHeroName}
          skyActive={step1Reveal.skyActive}
          silhouetteIdle={false}
          panelFading={
            step1Reveal.phase === "reward" || step1Reveal.phase === "done"
          }
          variant="ritual"
        />
      ) : null}
    <div
      className={`relative mx-auto w-full ${
        currentStep === 6
          ? "max-w-4xl"
          : currentStep >= 4
            ? "max-w-3xl"
            : "max-w-xl"
      } ${step1Sky ? "z-10" : ""} ${
        currentStep === 1 && step1Parcours.showEssentialsPanel
          ? "mt-0"
          : "mt-10"
      }`}
    >
      {isEditor ? (
        <div
          className="mb-6 border-b border-white/10 pb-4"
          role="status"
          aria-live="polite"
        >
          <p className="text-center text-[10px] font-medium uppercase tracking-[0.4em] text-teal-400/50">
            {copy.editorModeBanner}
          </p>
          <p className="mt-2 text-center text-sm font-light text-white/45">
            {copy.editorModeHint}
          </p>
        </div>
      ) : null}

      {currentStep > (isEditor ? 3 : 1) ? (
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
        className={
          step1Parcours.hubChromeHidden
            ? "-translate-y-1 opacity-0 md:-translate-y-2"
            : "-translate-y-1 md:-translate-y-2"
        }
      />

      {/* En-tête sticky — dès l'Étape 1. Le déclencheur du Dossier de forfait
          (typographique, sans chrome de bouton) y est toujours visible, même
          avant que l'identité du défunt ne soit renseignée ; le bloc
          avatar/nom ne rejoint l'en-tête qu'à partir de l'Étape 2. */}
      <header
        className={`sticky top-0 z-50 -mx-6 mb-8 border-b border-white/10 bg-black/40 px-6 py-3.5 backdrop-blur-xl transition-opacity duration-500 md:-mx-10 md:px-10 ${
          step1Parcours.hubChromeHidden
            ? "pointer-events-none opacity-0"
            : ""
        }`}
      >
        <div
          className={`mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 ${
            currentStep >= 2 ? "sm:justify-between" : "sm:justify-end"
          }`}
        >
          {currentStep >= 2 ? (
            <div className="flex items-center gap-4">
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
          ) : null}

          <div className="flex flex-col items-stretch gap-4 sm:w-60 sm:shrink-0 sm:items-end">
            {!isEditor ? (
              <>
            <PackageDossierTrigger
              packageLabel={packageDisplayNameFor(basePackage)}
              onOpen={openPackageDossier}
              copy={{
                label: copy.headerPackageLabel,
                openAria: copy.dossierOpenAria,
              }}
              className="sm:items-end sm:text-right"
            />
            <SanctuaryInviteTrigger
              onOpen={() => setIsSanctuaryInviteOpen(true)}
              disabled={!uploadProjectId || currentStep === 2}
              copy={{
                triggerLabel: copy.inviteTriggerLabel,
                triggerCta: copy.inviteTriggerCta,
                triggerOpenAria: copy.inviteOpenAria,
              }}
              className={`sm:items-end sm:text-right${currentStep === 2 ? " hidden" : ""}`}
            />
            <CollabInviteTrigger
              accessRole={accessRole}
              onOpen={() => setIsCollabInviteOpen(true)}
              disabled={!uploadProjectId}
              copy={{
                triggerLabel: copy.collabTriggerLabel,
                triggerCta: copy.collabTriggerCta,
                triggerOpenAria: copy.collabOpenAria,
              }}
              className="sm:items-end sm:text-right"
            />
              </>
            ) : null}
            {/* Masqué sur mobile — l'en-tête sticky y reste volontairement compact (2 lignes max) ; le détail complet reste consultable dans le Dossier. */}
            <p className="mt-1.5 hidden text-[11px] font-light italic leading-snug text-zinc-500 sm:block sm:text-right">
              {copy.headerNarrativeSummary
                .replace("{minutes}", String(wizardStoryboard.estimatedTotalMinutes))
                .replace("{mediaMax}", String(currentMaxMediaItems))}
            </p>
          </div>
        </div>
      </header>

      {!isEditor ? (
        <>
      <PackageDossierPanel
        isOpen={isPackageDossierOpen}
        onClose={() => setIsPackageDossierOpen(false)}
        currentPackage={basePackage}
        options={basePackageOptions}
        hidePrices={isPartner}
        locale={locale}
        taglineFor={packageTaglineFor}
        savingsLabelFor={packageSavingsLabelFor}
        rowsFor={packageDossierRowsFor}
        songsLostIfSelected={songsLostIfBasePackageSelected}
        onSelect={handleBasePackageChange}
        copy={{
          inclusionsTitle: copy.dossierInclusionsTitle,
          discoverTitle: copy.dossierDiscoverTitle,
          backToCurrentCta: copy.dossierBackToCurrentCta,
          currentBadge: copy.dossierCurrentBadge,
          switchCta: copy.dossierSwitchCta,
          closeAria: copy.dossierCloseAria,
          downgradeWarning: copy.headerDowngradeWarning,
          downgradeConfirmCta: copy.headerDowngradeConfirmCta,
          downgradeCancelCta: copy.headerDowngradeCancelCta,
        }}
      />

      <SanctuaryInvitePanel
        isOpen={isSanctuaryInviteOpen}
        onClose={() => setIsSanctuaryInviteOpen(false)}
        projectId={uploadProjectId}
        locale={locale}
        tributeName={deceasedDisplayName}
        copy={{
          triggerLabel: copy.inviteTriggerLabel,
          triggerCta: copy.inviteTriggerCta,
          triggerOpenAria: copy.inviteOpenAria,
          title: copy.inviteTitle,
          description: copy.inviteDescription,
          generateCta: copy.inviteGenerateCta,
          generating: copy.inviteGenerating,
          shareCta: copy.inviteShareCta,
          copyLink: copy.inviteCopyLink,
          copied: copy.inviteCopied,
          copyMessage: copy.inviteCopyMessage,
          messageCopied: copy.inviteMessageCopied,
          shareHint: copy.inviteShareHint,
          qrAlt: copy.inviteQrAlt,
          closeAria: copy.inviteCloseAria,
          errorGeneric: copy.inviteErrorGeneric,
          needProject: copy.inviteNeedProject,
          shareMessage: copy.inviteShareMessage,
          brandWordmark: copy.inviteBrandWordmark,
          kicker: copy.inviteKicker,
          poweredBy: copy.invitePoweredBy,
        }}
      />

      <CollabInvitePanel
        isOpen={isCollabInviteOpen}
        onClose={() => setIsCollabInviteOpen(false)}
        projectId={uploadProjectId}
        locale={locale}
        accessRole={accessRole}
        copy={collabInviteCopy}
      />
        </>
      ) : null}

      <section
        className="flex flex-col"
        aria-labelledby={wizardTitleId}
      >
        <div
          className={
            step1Parcours.hubChromeHidden
              ? "pointer-events-none h-0 overflow-hidden opacity-0"
              : undefined
          }
        >
        <WizardPhaseProgress
          phases={wizardPhases}
          currentStep={progressCurrentStep}
          totalSteps={progressTotalSteps}
          currentStepLabel={currentStepLabel}
          onPhaseClick={handleStepperClick}
          copy={{
            ariaLabel: copy.progressAria,
            stepAnnouncement: copy.stepLabel,
            stepProgressLabel: copy.stepProgressLabel,
          }}
        />
        </div>

        {!isEditor && !step1Parcours.hubChromeHidden ? (
        <StickyPriceBar
          extensions={extensions}
          basePackage={basePackage}
          grantedPackage={grantedPackage}
          isPartner={isPartner}
          draftMode={currentStep < 6}
          copy={{
            consumerTotalLabel: copy.stickyConsumerTotal,
            partnerTokenCostLabel: copy.stickyPartnerTokenCost,
            draftLabel: copy.stickyDraftLabel,
          }}
        />
        ) : null}

        {currentStep === 5 && !isPartner && !isEditor ? (
          <div className="mb-8">
            <WizardCartSummary
              locale={locale}
              extensions={extensions}
              basePackage={basePackage}
              grantedPackage={grantedPackage}
              copy={{
                labelWithOptions: copy.cartLabelWithOptions,
                labelBaseOnly: copy.cartLabelBaseOnly,
                totalFormula: copy.cartTotalFormula,
              }}
            />
          </div>
        ) : null}

        <div
          className={
            currentStep === 1 && step1Parcours.showEssentialsPanel
              ? "min-h-0 pb-0"
              : "min-h-[min(48vh,26rem)] pb-40"
          }
        >
          {currentStep === 1 && step1Parcours.showEssentialsPanel ? (
            <div
              className="parcours-monolith-shell pointer-events-none fixed inset-0 z-30 flex items-center justify-center px-4"
              aria-hidden={false}
            >
            <div
              className={[
                "parcours-monolith-frame pointer-events-auto relative w-full max-w-xl",
                step1Reveal.phase === "reward" ||
                step1Reveal.phase === "done"
                  ? "pointer-events-none opacity-0"
                  : step1Parcours.panelExiting
                    ? "pointer-events-none translate-y-3 opacity-0 transition-[opacity,transform] ease-in"
                    : "parcours-panel-in",
              ].join(" ")}
              style={
                step1Parcours.panelExiting
                  ? {
                      transitionDuration: `${step1Parcours.panelExitMs}ms`,
                    }
                  : undefined
              }
            >
              <div className="parcours-monolith-atmosphere" aria-hidden>
                <div className="parcours-monolith-aura-cyan" />
              </div>
            <div
              className="parcours-monolith-scroll parcours-monolith-glass relative z-[1] w-full px-6 py-7 md:px-8 md:py-9"
            >
            {step1Parcours.phase === "panel.essentials" &&
            step1Reveal.phase === "typing" ? (
              <button
                type="button"
                onClick={step1Parcours.closePanel}
                className="absolute right-4 top-4 rounded-lg p-2 text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/35"
                aria-label={copy.parcoursPanelCloseHint}
              >
                <X className="h-5 w-5" strokeWidth={1.5} aria-hidden />
              </button>
            ) : null}
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
                  className="group relative flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/[0.04] shadow-[0_0_28px_rgba(45,212,191,0.12)] transition-[box-shadow,border-color] hover:border-teal-400/30 hover:shadow-[0_0_36px_rgba(45,212,191,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020202]"
                >
                  <span
                    className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      background:
                        "radial-gradient(circle at 50% 100%, rgba(45,212,191,0.22) 0%, transparent 65%)",
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
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-lg font-light text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition-[border,box-shadow] placeholder:text-zinc-600 focus:border-teal-400/35 focus:shadow-[0_0_24px_rgba(45,212,191,0.14)]"
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
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-lg font-light text-zinc-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition-[border,box-shadow] placeholder:text-zinc-600 focus:border-teal-400/35 focus:shadow-[0_0_24px_rgba(45,212,191,0.14)]"
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

              {essentialError ? (
                <p
                  className="mt-6 text-center text-sm font-light text-rose-400/90"
                  role="alert"
                >
                  {copy.validationEssential}
                </p>
              ) : null}

              {step1Parcours.phase === "panel.essentials" &&
              step1Reveal.phase === "typing" ? (
                <div className="mt-10 pb-2">
                  <button
                    type="button"
                    disabled={!canProceedEssential}
                    onClick={() => void goNext()}
                    className={`parcours-monolith-continue ${connexionSubmitButtonClass} min-h-[52px] touch-manipulation`}
                  >
                    {copy.parcoursMonolithContinue}
                  </button>
                </div>
              ) : null}
            </>
            </div>
            </div>
            </div>
          ) : null}

          {currentStep === 2 ? (
            <>
            <SanctuaryInviteStep
              projectId={uploadProjectId}
              locale={locale}
              tributeName={deceasedDisplayName}
              titleId={wizardTitleId}
              stepTitle={copy.stepInviteTitle}
              stepDescription={copy.stepInviteDescription}
              skipLabel={copy.skipInvite}
              onSkip={() => void goNext()}
              copy={{
                triggerLabel: copy.inviteTriggerLabel,
                triggerCta: copy.inviteTriggerCta,
                triggerOpenAria: copy.inviteOpenAria,
                title: copy.inviteTitle,
                description: copy.inviteDescription,
                generateCta: copy.inviteGenerateCta,
                generating: copy.inviteGenerating,
                shareCta: copy.inviteShareCta,
                copyLink: copy.inviteCopyLink,
                copied: copy.inviteCopied,
                copyMessage: copy.inviteCopyMessage,
                messageCopied: copy.inviteMessageCopied,
                shareHint: copy.inviteShareHint,
                qrAlt: copy.inviteQrAlt,
                closeAria: copy.inviteCloseAria,
                errorGeneric: copy.inviteErrorGeneric,
                needProject: copy.inviteNeedProject,
                shareMessage: copy.inviteShareMessage,
                brandWordmark: copy.inviteBrandWordmark,
                kicker: copy.inviteKicker,
                poweredBy: copy.invitePoweredBy,
              }}
            />
            <CollabInviteInlineCard
              projectId={uploadProjectId}
              locale={locale}
              accessRole={accessRole}
              copy={collabInviteCopy}
            />
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

              {uploadProjectId ? (
                <ScannerCompanionPanel
                  className="mt-8"
                  projectId={uploadProjectId}
                  locale={locale}
                  copy={{
                    eyebrow: copy.scannerEyebrow,
                    title: copy.scannerTitle,
                    description: copy.scannerDescription,
                    badge: copy.scannerBadge,
                    hint: copy.scannerHint,
                    instructions: copy.scannerInstructions,
                    generating: copy.scannerGenerating,
                    copyLink: copy.scannerCopyLink,
                    copied: copy.scannerCopied,
                    qrAlt: copy.scannerQrAlt,
                    errorGeneric: copy.scannerErrorGeneric,
                    unavailable: copy.scannerUnavailable,
                    waitingPhone: copy.scannerWaitingPhone,
                    photosReceived: copy.scannerPhotosReceived,
                  }}
                />
              ) : (
                <ScannerCompanionPlaceholder
                  className="mt-8"
                  copy={{
                    eyebrow: copy.scannerEyebrow,
                    title: copy.scannerTitle,
                    description: copy.scannerDescription,
                    badge: copy.scannerBadge,
                    hint: copy.scannerHint,
                  }}
                />
              )}

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
                  uploadStrategy={isEditor ? "signed" : "direct"}
                  autoStart
                  pollIntervalMs={WIZARD_MEDIA_POLL_INTERVAL_MS}
                  maxFiles={effectiveMaxMediaItems}
                  maxFileSizeBytes={300 * 1024 * 1024}
                  overflowRejectionMessage={copy.uploadLimitOverflowRejection}
                >
                  {(dz) => {
                    const totalQueued = dz.items.length;

                    return (
                      <>
                        <SoftCapMediaCountSync
                          count={totalQueued}
                          onCount={syncStep3MediaCount}
                        />
                        <SoftCapMediaCountSync
                          count={dz.isRunning ? 1 : 0}
                          onCount={(n) => setStep3UploadRunning(n > 0)}
                        />
                        <div
                          {...dz.getRootProps({
                            className: `group relative mt-10 flex w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-white/[0.03] px-6 py-16 text-center backdrop-blur-xl shadow-[0_0_24px_rgba(45,212,191,0.08)] transition-[border,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#020202] ${
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
                              {copy.uploadLimitCount
                                .replace("{count}", String(totalQueued))
                                .replace("{max}", String(effectiveMaxMediaItems))}
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

                        {offerMediaSoftCap ? (
                          <div
                            className="mt-5 overflow-hidden rounded-2xl border border-amber-300/25 bg-gradient-to-br from-amber-200/[0.07] via-white/[0.02] to-transparent p-5 shadow-[0_0_36px_rgba(251,191,36,0.10)] backdrop-blur-md"
                            role="status"
                            aria-live="polite"
                          >
                            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-amber-200/70">
                              Odyssey
                            </p>
                            <p className="mt-2 font-serif text-lg leading-snug text-amber-50">
                              {copy.softCapMediaBannerTitle}
                            </p>
                            <p className="mt-1.5 text-sm font-light leading-relaxed text-amber-100/75">
                              {copy.softCapMediaBannerBody}
                            </p>
                            <button
                              type="button"
                              onClick={() => openSoftCap("mediaUnlock")}
                              className="mt-4 rounded-xl bg-gradient-to-r from-amber-200/90 to-amber-100/80 px-4 py-2 text-sm font-semibold text-[#1a1410] transition hover:brightness-105"
                            >
                              {copy.softCapMediaUnlockCta}
                            </button>
                          </div>
                        ) : null}

                        {dz.remainingSlots <= 0 && !offerMediaSoftCap ? (
                          <div
                            className="mt-5 rounded-xl border border-amber-400/40 bg-amber-950/10 p-4 shadow-[0_0_24px_rgba(251,191,36,0.14)] backdrop-blur-md"
                            role="status"
                            aria-live="polite"
                          >
                            <p className="text-sm font-medium text-amber-200/95">
                              {copy.uploadLimitReachedTitle}
                            </p>
                            <p className="mt-1 text-xs text-amber-100/85">
                              {copy.uploadLimitReachedHint.replace(
                                "{max}",
                                String(effectiveMaxMediaItems),
                              )}
                            </p>
                          </div>
                        ) : null}

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
                            viaScanner: copy.queueViaScanner,
                            restorePreview: copy.scannerRestorePreview,
                            quotaExceededError:
                              copy.uploadLimitExceededItemError.replace(
                                "{max}",
                                String(currentMaxMediaItems),
                              ),
                          }}
                          onPreviewScanner={(item) => {
                            const url =
                              item.fullPreviewUrl || item.previewUrl || null;
                            if (url) setRestorationSrc(url);
                          }}
                        />

                        <p className="mt-4 text-sm font-light text-zinc-500">
                          {dz.isRunning
                            ? copy.uploadInProgress
                            : dz.totals.uploaded === 0
                              ? copy.uploadAtLeastOne
                              : null}
                        </p>
                      </>
                    );
                  }}
                </MediaDropzoneAdapter>
              )}

              <VaultOnlineSourcesSection
                className="mt-12 mb-28"
                selected={selectedSocial}
                onSelect={handleSocialSelect}
                copy={{
                  title: copy.vaultOnlineTitle,
                  description: copy.vaultOnlineDescription,
                  note: copy.socialQuickLoginNote,
                  facebook: copy.socialFacebook,
                  instagram: copy.socialInstagram,
                  tiktok: copy.socialTikTok,
                  googlePhotos: copy.socialGooglePhotos,
                }}
              />

              <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#020202]/90 px-4 py-4 backdrop-blur-xl md:px-8">
                <div className="mx-auto flex max-w-xl gap-3">
                  {!isEditor ? (
                    <button
                      type="button"
                      onClick={() => void goBack()}
                      className="font-[family-name:var(--font-label)] min-h-[52px] flex-1 rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-base font-normal text-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.04)] transition-colors hover:bg-white/[0.09]"
                    >
                      {copy.back}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => void goNext()}
                    disabled={step3UploadRunning}
                    className="connexion-submit-breathe font-[family-name:var(--font-label)] min-h-[52px] flex-[1.35] rounded-2xl border border-teal-400/35 bg-white/[0.06] px-4 text-base font-normal text-zinc-50 transition-colors hover:border-teal-300/55 hover:bg-white/[0.09] hover:text-teal-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
                  >
                    {projectMediaCount > 0 ? copy.next : copy.stepMediaLater}
                  </button>
                </div>
              </div>
            </>
          ) : null}

          {currentStep === 4 ? (
            <>
              {uploadProjectId ? (
                <StoryboardChaptersStep
                  packageId={currentPackageId}
                  maxSongs={currentMaxSongs}
                  minSongsRequired={wizardStoryboard.structureValidation.minSongsRequired}
                  maxMediaItems={currentMaxMediaItems}
                  projectMediaCount={projectMediaCount}
                  catalogTier={musicBrowseTier}
                  storyboard={wizardStoryboard.storyboard}
                  onStoryboardChange={wizardStoryboard.setStoryboard}
                  onAfterChooseSong={handleAfterChooseSong}
                  duplicateChapterIds={wizardStoryboard.duplicateSongInfo.duplicateChapterIds}
                  hasDuplicateSongs={wizardStoryboard.duplicateSongInfo.hasDuplicates}
                  duplicateSongsAcknowledged={wizardStoryboard.duplicateSongsAcknowledged}
                  onDuplicateSongsAcknowledgedChange={
                    wizardStoryboard.setDuplicateSongsAcknowledged
                  }
                  canUploadPersonalAudio={allowPersonalAudioUpload}
                  projectId={uploadProjectId}
                  musicRightsAccepted={Boolean(
                    musicRightsAttestation?.acceptedAt &&
                      musicRightsAttestation?.tosVersion,
                  )}
                  onAcceptMusicRights={handleAcceptMusicRights}
                  copy={{
                    title: copy.stepChaptersTitle,
                    description: copy.stepChaptersDescription,
                    educationBanner: copy.chapterEducationBanner,
                    progress: copy.chaptersProgress,
                    chapterTitleFallback: copy.chapterTitleFallback,
                    chapterEmptyLabel: copy.chapterEmptyLabel,
                    addChapterCta: copy.chapterAddCta,
                    removeChapterCta: copy.chapterRemoveCta,
                    maxReachedHint: copy.chapterMaxReachedHint,
                    capacityRecommended: copy.chapterCapacityRecommended,
                    capacityPending: copy.chapterCapacityPending,
                    shortTrackWarning: copy.chapterShortTrackWarning,
                    statsMediaLabel: copy.chapterStatsMediaLabel,
                    statsMediaValue: copy.chapterStatsMediaValue,
                    statsSongsLabel: copy.chapterStatsSongsLabel,
                    statsSongsValue: copy.chapterStatsSongsValue,
                    duplicateWarning: copy.chapterDuplicateWarning,
                    duplicateAckLabel: copy.chapterDuplicateAckLabel,
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
                    uploadPersonalTitle: copy.musicUploadPersonalTitle,
                    uploadPersonalHint: copy.musicUploadPersonalHint,
                    uploadPersonalLabel: copy.musicUploadPersonalLabel,
                    uploadTosLabel: copy.musicUploadTosLabel,
                    uploadTosAccept: copy.musicUploadTosAccept,
                    uploadCta: copy.musicUploadCta,
                    uploadUploading: copy.musicUploadUploading,
                    uploadFailed: copy.musicUploadFailed,
                    uploadUnsupported: copy.musicUploadUnsupported,
                    uploadTooLarge: copy.musicUploadTooLarge,
                    uploadNeedsAttestation: copy.musicUploadNeedsAttestation,
                    uploadNeedProject: copy.musicUploadNeedProject,
                    sourceCatalog: copy.musicSourceCatalog,
                    sourcePersonal: copy.musicSourcePersonal,
                    sourceHint: copy.musicSourceHint,
                  }}
                />
              ) : null}

              {chaptersStructureError ? (
                <p
                  className="mt-6 text-center text-sm font-light text-rose-400/90"
                  role="alert"
                >
                  {wizardStoryboard.structureValidation.minSongsRequired > 0
                    ? copy.chapterStructureErrorHint
                        .replace(
                          "{min}",
                          String(
                            wizardStoryboard.structureValidation.minSongsRequired,
                          ),
                        )
                        .replace("{mediaCount}", String(projectMediaCount))
                        .replace(
                          "{selected}",
                          String(
                            wizardStoryboard.storyboard.chapters.filter((c) =>
                              Boolean(c.song),
                            ).length,
                          ),
                        )
                    : copy.chapterStructureErrorTitle}
                </p>
              ) : null}
            </>
          ) : null}

          {currentStep === 5 ? (
            <>
            <StoryboardMontageStep
              packageId={currentPackageId}
              projectId={uploadProjectId}
              storyboard={wizardStoryboard.storyboard}
              onStoryboardChange={wizardStoryboard.setStoryboard}
              onMagicPerformingChange={(performing) => {
                magicPerformingRef.current = performing;
              }}
              onMagicSequenceComplete={() => {
                queueSave("immediate");
                if (isEditor) return;
                if (softCapMagicDismissedRef.current) return;
                if (
                  !shouldOfferMagicSoftCap(
                    grantedPackage,
                    intendedPackage,
                    projectMediaCount,
                  )
                ) {
                  return;
                }
                openSoftCap("mediaMagic");
              }}
              copy={{
                title: copy.stepMontageTitle,
                description: copy.stepMontageDescription,
                loading: copy.montageLoading,
                chapterTabs: {
                  ariaLabel: copy.montageChapterTabsAria,
                  tabSpark: copy.montageActSparkLabel,
                  tabEpic: copy.montageActEpicLabel,
                  tabLegacy: copy.montageActLegacyLabel,
                  tabFallback: copy.chapterTitleFallback,
                },
                card: {
                  clickToEdit: copy.montageClickToEdit,
                  dragHandle: copy.montageDragHandle,
                  remove: copy.montageRemove,
                  duplicateBadge: copy.montageDuplicateBadge,
                  deleteDuplicate: copy.montageDeleteDuplicate,
                },
                director: {
                  close: copy.montageDirectorClose,
                  focalHint: copy.montageFocalHint,
                  exclude: copy.montageExclude,
                  include: copy.montageInclude,
                  remove: copy.montageRemove,
                  previous: copy.montageDirectorPrevious,
                  next: copy.montageDirectorNext,
                  counter: copy.montageDirectorCounter,
                  chapterTablistAria: copy.montageChapterTabsAria,
                },
                capacityRecommended: copy.chapterCapacityRecommended,
                capacityPending: copy.chapterCapacityPending,
                bankColumn: {
                  title: copy.mediaBankColumnTitle,
                  count: copy.mediaBankColumnCount,
                  empty: copy.mediaBankColumnEmpty,
                  selectAll: copy.mediaBankSelectAll,
                  deselectAll: copy.mediaBankDeselectAll,
                  selectedCount: copy.mediaBankSelectedCount,
                  toggleSelectAria: copy.mediaBankToggleSelectAria,
                  magicComposition: copy.mediaBankMagicComposition,
                },
                chapterGrid: {
                  emptyHint: copy.montageChapterGridEmptyHint,
                  beyondRhythmHint: copy.montageChapterBeyondRhythmHint,
                },
                chapterActions: {
                  autoFill: copy.montageChapterAutoFill,
                  clear: copy.montageChapterClear,
                  manage: copy.montageChapterManage,
                  clearConfirmTitle: copy.montageChapterClearConfirmTitle,
                  clearConfirmCancel: copy.montageChapterClearConfirmCancel,
                  clearConfirmAction: copy.montageChapterClearConfirmAction,
                },
                chapterTitleEditAria: copy.montageChapterTitleEditAria,
                chapterReorderAria: copy.montageDragHandle,
                toggleSelectAria: copy.mediaBankToggleSelectAria,
                filmMap: {
                  ariaLabel: copy.montageFilmMapAria,
                  segmentAria: copy.montageFilmMapSegmentAria,
                },
                refinement: {
                  title: copy.montageRefinementTitle,
                  closeAria: copy.montageRefinementCloseAria,
                  inCapacity: copy.montageRefinementInCapacity,
                  beyondCapacity: copy.montageRefinementBeyondCapacity,
                  capacityDivider: copy.montageRefinementCapacityDivider,
                  returnToBank: copy.montageRefinementReturnToBank,
                  moveToNextChapter: copy.montageRefinementMoveToNext,
                  capacityRecommended: copy.chapterCapacityRecommended,
                  capacityPending: copy.chapterCapacityPending,
                },
                multiDragLabel: copy.montageMultiDragLabel,
                onboarding: {
                  title: copy.montageOnboardingTitle,
                  description: copy.montageOnboardingDescription,
                  magic: copy.montageOnboardingMagic,
                  magicHint: copy.montageOnboardingMagicHint,
                  manual: copy.montageOnboardingManual,
                  manualHint: copy.montageOnboardingManualHint,
                },
                magicComposition: {
                  message: copy.montageMagicMessage,
                },
              }}
            />
            <CollabInviteInlineCard
              projectId={uploadProjectId}
              locale={locale}
              accessRole={accessRole}
              copy={collabInviteCopy}
            />
            </>
          ) : null}

          {currentStep === 6 ? (
            <PreviewStep
              projectId={uploadProjectId}
              montage={montage}
              actTracks={actTracks}
              extensions={extensions}
              basePackage={basePackage}
              softCapActive={
                isFreemiumGrant &&
                !isEditor &&
                (packageTierRank(intendedPackage) >= 1 ||
                  projectMediaCount > grantedMediaMax ||
                  Boolean(extensions.musicLicense))
              }
              onProceedToPayment={() => void handleProceedToPayment()}
              onEdit={() => void handlePreviewEdit()}
              copy={{
                title: copy.stepPreviewTitle,
                description: copy.stepPreviewDescription,
                loadingMedia: copy.previewLoadingMedia,
                payCta: copy.previewPayCta,
                payCtaSoftCap: copy.previewPayCtaSoftCap,
                softCapNote: copy.previewSoftCapNote,
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

          {currentStep === 7 ? (
            <CheckoutStep
              locale={locale}
              extensions={extensions}
              basePackage={basePackage}
              grantedPackage={grantedPackage}
              isPartner={isPartner}
              isPaying={isPaying}
              payError={payError}
              showStayFree={showCheckoutStayFree}
              fundCreditCents={fundCreditCents}
              ownerFloorCents={ownerFloorCents}
              viralLoopEnabled={viralLoopEnabled}
              riderAccepted={riderAccepted}
              onRiderChange={setRiderAccepted}
              excessMediaCount={
                isFreemiumGrant && projectMediaCount > grantedMediaMax
                  ? projectMediaCount - grantedMediaMax
                  : 0
              }
              onPay={() => void handlePay()}
              onStayFree={handleStayOnGift}
              onGoToMedia={() => void navigateToStep(3)}
              onExtensionsChange={handleExtensionsChange}
              onRemoveExtension={(key) =>
                handleExtensionsChange({ ...extensions, [key]: false })
              }
              extensionsCopy={{
                title: copy.checkoutAddonsTitle,
                description: copy.checkoutAddonsDescription,
                aiRetouchTitle: copy.extensionAiRetouchTitle,
                aiRetouchDescription: copy.extensionAiRetouchDescription,
                musicLicenseTitle: copy.extensionMusicLicenseTitle,
                musicLicenseDescription: copy.extensionMusicLicenseDescription,
                storyVoiceTitle: copy.extensionStoryVoiceTitle,
                storyVoiceDescription: copy.extensionStoryVoiceDescription,
                sanctuaryTokenTitle: copy.extensionSanctuaryTokenTitle,
                sanctuaryTokenDescription:
                  copy.extensionSanctuaryTokenDescription,
                memoryBookTitle: copy.extensionMemoryBookTitle,
                memoryBookDescription: copy.extensionMemoryBookDescription,
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
                stayFreeCta: copy.checkoutStayFreeCta,
                stayFreeHint: copy.checkoutStayFreeHint,
                amputationHint: copy.checkoutAmputationHint,
                excessMediaNotice: copy.checkoutExcessMediaNotice,
                goToMediaLink: copy.checkoutGoToMediaLink,
                removeOption: copy.checkoutRemoveOption,
                fundCreditLabel: copy.checkoutFundCreditLabel,
                fundCreditHint: copy.checkoutFundCreditHint,
                remainingDueLabel: copy.checkoutRemainingDueLabel,
                riderLabel: copy.checkoutRiderLabel,
                riderHint: copy.checkoutRiderHint,
                payCtaFree: copy.checkoutPayCtaFree,
              }}
            />
          ) : null}
        </div>
      </section>

      <RestorationPreviewModal
        open={Boolean(restorationSrc)}
        src={restorationSrc}
        canFullPreview={hasAiRestorationEntitlement(
          intendedPackage,
          extensions,
        )}
        alreadyAdded={Boolean(
          extensions.aiRetouch || extensions.heritagePack,
        )}
        allowPurchase={!isEditor}
        showUpgrade={!isEditor && packageTierRank(intendedPackage) < 2}
        addPriceLabel={formatWizardPrice(
          WIZARD_PRICING.extensions.RETOUCHE_IA.priceCents,
          locale,
        )}
        onClose={() => setRestorationSrc(null)}
        onAddRetouch={() => {
          handleExtensionsChange(
            toggleWizardExtension(extensions, "aiRetouch", true),
          );
        }}
        onUpgradeEternity={() => {
          handleBasePackageChange("heritage");
          setRestorationSrc(null);
        }}
        copy={{
          title: copy.scannerRestoreTitle,
          hint: copy.scannerRestoreHint,
          lockedHint: copy.scannerRestoreLockedHint,
          included: copy.scannerRestoreIncluded,
          addCta: copy.scannerRestoreAddCta,
          addedCta: copy.scannerRestoreAddedCta,
          upgradeEternity: copy.scannerRestoreUpgrade,
          beforeLabel: copy.scannerRestoreBefore,
          afterLabel: copy.scannerRestoreAfter,
          closeAria: copy.scannerRestoreClose,
          watermark: copy.scannerRestoreWatermark,
        }}
      />

      {!isEditor ? (
      <SoftCapModal
        open={softCapOpen}
        variant={softCapVariant}
        mediaCount={projectMediaCount}
        copy={softCapCopy}
        onAcceptHeritage={acceptSoftCapHeritage}
        onAcceptLicense={acceptSoftCapLicense}
        onDismiss={dismissSoftCap}
        onInviteCollab={() => {
          dismissSoftCap();
          setIsCollabInviteOpen(true);
        }}
      />
      ) : null}

      {currentStep !== 3 &&
      currentStep !== 6 &&
      currentStep !== 7 &&
      !(currentStep === 1 && step1Sky && step1Reveal.phase === "typing") ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#020202]/90 px-4 py-4 backdrop-blur-xl md:px-8">
          <div
            className={`mx-auto ${
              currentStep >= 5 ? "max-w-3xl" : "max-w-xl"
            }`}
          >
            {currentStep === 5 && isEditor ? (
              <p className="text-center text-sm font-light text-white/55">
                {copy.editorCraftComplete}
              </p>
            ) : currentStep <= 5 ? (
              <button
                type="button"
                disabled={
                  currentStep === 1 &&
                  (step1Reveal.phase === "reward" ||
                    step1Reveal.phase === "done")
                }
                onClick={() => void goNext()}
                className="connexion-submit-breathe font-[family-name:var(--font-label)] min-h-[52px] w-full rounded-2xl border border-teal-400/35 bg-white/[0.06] px-4 text-base font-normal text-zinc-50 transition-colors hover:border-teal-300/55 hover:bg-white/[0.09] hover:text-teal-50 disabled:cursor-wait disabled:opacity-70"
              >
                {currentStep === 1 &&
                (step1Reveal.phase === "reward" ||
                  step1Reveal.phase === "done")
                  ? copy.step1ConstellationReward
                  : copy.next}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
    </>
  );
}

"use client";

import {
  Calendar,
  Camera,
  Cloud,
  GripVertical,
  Heart,
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
import { MediaDropzoneAdapter } from "@/src/components/media/MediaDropzoneAdapter";
import { MediaQueueGrid } from "@/src/components/media/MediaQueueGrid";
import type { AppDictionary } from "@/lib/dictionaries";

export type TributeWizardCopy = AppDictionary["tributeWizard"];

type Step = 1 | 2 | 3 | 4;
type MoodId = "soft" | "classical" | "melancholic" | "bright";
type SocialId = "facebook" | "instagram" | "tiktok" | "google";
type TrackId = "a" | "b" | "c";

const TOTAL_STEPS = 4;

function replaceStepLabel(
  template: string,
  current: number,
  total: number,
): string {
  return template
    .replace("{current}", String(current))
    .replace("{total}", String(total));
}

function yearFromDateInput(iso: string): string {
  if (!iso?.trim()) return "";
  const y = Number.parseInt(iso.slice(0, 4), 10);
  return Number.isFinite(y) ? String(y) : "";
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

export function TributeWizard({ copy }: { copy: TributeWizardCopy }) {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [completed, setCompleted] = useState(false);
  const [essentialError, setEssentialError] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [deathDate, setDeathDate] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [selectedSocial, setSelectedSocial] = useState<SocialId | null>(null);
  const [selectedMood, setSelectedMood] = useState<MoodId | null>(null);
  const [trackOrder, setTrackOrder] = useState<TrackId[]>(["a", "b", "c"]);
  const [draggingId, setDraggingId] = useState<TrackId | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const wizardTitleId = useId();

  // Identifiants DB nécessaires pour passer RLS Storage + insert media_assets.
  // Le service d'upload écrit owner_user_id (convention Odyssey, pas user_id)
  // et tenant_id : les deux colonnes sont NOT NULL côté DB, donc indispensables
  // sous peine de faire planter l'upsert.
  const [uploadProjectId, setUploadProjectId] = useState<string | null>(null);
  const [uploadUserId, setUploadUserId] = useState<string | null>(null);
  const [uploadTenantId, setUploadTenantId] = useState<string | null>(null);
  const [projectDraftError, setProjectDraftError] = useState<string | null>(null);
  const [projectDraftLoading, setProjectDraftLoading] = useState(false);
  const draftRequestedRef = useRef(false);

  const moodOptions = useMemo(
    () =>
      [
        { id: "soft" as const, label: copy.moodSoft },
        { id: "classical" as const, label: copy.moodClassical },
        { id: "melancholic" as const, label: copy.moodMelancholic },
        { id: "bright" as const, label: copy.moodBright },
      ] as const,
    [copy],
  );

  const trackLabels = useMemo(
    (): Record<TrackId, string> => ({
      a: copy.trackA,
      b: copy.trackB,
      c: copy.trackC,
    }),
    [copy],
  );

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
    return () => {
      if (avatarPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  // À l'entrée dans l'étape 3, crée un projet "draft" en DB pour disposer d'un
  // project_id réel — exigé par les policies RLS sur Storage et media_assets.
  useEffect(() => {
    if (currentStep !== 3) return;
    if (uploadProjectId) return;
    if (draftRequestedRef.current) return;
    draftRequestedRef.current = true;

    let aborted = false;
    setProjectDraftLoading(true);
    setProjectDraftError(null);

    (async () => {
      try {
        const res = await fetch("/api/projects/draft", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            firstName: firstName.trim() || undefined,
            lastName: lastName.trim() || undefined,
            birthDate: birthDate || undefined,
            deathDate: deathDate || undefined,
          }),
        });
        const payload = (await res.json().catch(() => null)) as
          | {
              id?: string;
              user_id?: string;
              tenant_id?: string;
              error?: string;
              message?: string;
            }
          | null;

        if (!res.ok || !payload?.id) {
          const reason =
            payload?.message ??
            payload?.error ??
            `HTTP ${res.status}`;
          if (!aborted) {
            setProjectDraftError(reason);
            draftRequestedRef.current = false;
          }
          return;
        }

        if (!aborted) {
          setUploadProjectId(payload.id);
          setUploadUserId(payload.user_id ?? null);
          setUploadTenantId(payload.tenant_id ?? null);
        }
      } catch (err) {
        if (!aborted) {
          setProjectDraftError(
            err instanceof Error ? err.message : "network_error",
          );
          draftRequestedRef.current = false;
        }
      } finally {
        if (!aborted) setProjectDraftLoading(false);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [currentStep, uploadProjectId]);

  const canProceedEssential =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    birthDate.length > 0 &&
    deathDate.length > 0;

  const goNext = useCallback(() => {
    if (currentStep === 1) {
      if (!canProceedEssential) {
        setEssentialError(true);
        return;
      }
      setEssentialError(false);
    }
    setCurrentStep((s) => (s < TOTAL_STEPS ? ((s + 1) as Step) : s));
  }, [currentStep, canProceedEssential]);

  const goBack = useCallback(() => {
    setCurrentStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  }, []);

  const handleAvatarChange = useCallback(
    (list: FileList | null) => {
      const file = list?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      setAvatarPreview((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
    },
    [],
  );

  const finish = useCallback(() => {
    if (!selectedMood) return;
    setCompleted(true);
  }, [selectedMood]);

  const reorderTracks = useCallback((from: TrackId, to: TrackId) => {
    if (from === to) return;
    setTrackOrder((order) => {
      const arr = [...order];
      const fromIdx = arr.indexOf(from);
      const toIdx = arr.indexOf(to);
      if (fromIdx === -1 || toIdx === -1) return order;
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
      return arr;
    });
  }, []);

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

  if (completed) {
    return (
      <section
        className="mx-auto mt-12 max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-14 text-center shadow-[0_0_40px_rgba(6,182,212,0.08)] backdrop-blur-md"
        aria-live="polite"
      >
        <Heart
          className="mx-auto mb-6 h-10 w-10 text-teal-400/75"
          strokeWidth={1.25}
          aria-hidden
        />
        <p className="font-[family-name:var(--font-label)] text-lg font-light leading-relaxed tracking-wide text-zinc-200 md:text-xl">
          {copy.completedMessage}
        </p>
      </section>
    );
  }

  return (
    <div className="relative mx-auto mt-10 w-full max-w-xl">
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
        <div
          className="mb-10 flex flex-col items-center gap-3"
          role="group"
          aria-label={copy.progressAria}
        >
          <p className="sr-only">
            {replaceStepLabel(copy.stepLabel, currentStep, TOTAL_STEPS)}
          </p>
          <div className="flex items-center gap-2" aria-hidden>
            {[1, 2, 3, 4].map((dot) => (
              <span
                key={dot}
                className={`h-1.5 rounded-full transition-all duration-500 ease-out ${
                  dot === currentStep
                    ? "w-7 bg-white/50 shadow-[0_0_12px_rgba(167,139,250,0.35)]"
                    : dot < currentStep
                      ? "w-1.5 bg-white/30"
                      : "w-1.5 bg-white/12"
                }`}
              />
            ))}
          </div>
          <div className="h-px w-full max-w-[12rem] bg-gradient-to-r from-transparent via-white/12 to-transparent" />
        </div>

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
                    onChange={(e) => setFirstName(e.target.value)}
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
                    onChange={(e) => setLastName(e.target.value)}
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
                      onChange={(e) => setBirthDate(e.target.value)}
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
                      onChange={(e) => setDeathDate(e.target.value)}
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
                    onClick={() =>
                      setSelectedSocial(id === selectedSocial ? null : id)
                    }
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
                onClick={goNext}
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
                      draftRequestedRef.current = false;
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
                          onRemove={dz.removeItem}
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
                              onClick={goBack}
                              className="font-[family-name:var(--font-label)] min-h-[52px] flex-1 rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-base font-normal text-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.04)] transition-colors hover:bg-white/[0.09]"
                            >
                              {copy.back}
                            </button>

                          <button
                            type="button"
                            onClick={goNext}
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
                className="font-[family-name:var(--font-label)] text-balance text-2xl font-light tracking-wide text-zinc-100 md:text-[1.65rem]"
              >
                {copy.stepAmbianceTitle}
              </h2>
              <p className="mt-5 text-lg font-light leading-relaxed text-zinc-400 md:text-xl">
                {copy.stepAmbianceDescription}
              </p>
              <p className="mt-3 text-sm font-light text-zinc-500">
                {copy.moodHint}
              </p>

              <div
                className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2"
                role="radiogroup"
                aria-label={copy.stepAmbianceTitle}
              >
                {moodOptions.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    role="radio"
                    aria-checked={selectedMood === id}
                    className={`group relative overflow-hidden rounded-2xl border px-4 py-5 text-left text-base transition-[border,box-shadow] md:text-lg ${
                      selectedMood === id
                        ? "border-cyan-400/35 shadow-[0_0_28px_rgba(34,211,238,0.18)]"
                        : "border-white/10 shadow-[0_0_16px_rgba(6,182,212,0.06)] hover:border-white/15"
                    }`}
                    onClick={() => setSelectedMood(id)}
                  >
                    <span
                      className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${
                        selectedMood === id ? "opacity-60" : ""
                      }`}
                      style={{
                        background:
                          "radial-gradient(circle at 50% 120%, rgba(34,211,238,0.18) 0%, rgba(139,92,246,0.08) 45%, transparent 70%)",
                      }}
                    />
                    <span className="relative font-[family-name:var(--font-label)] text-zinc-100">
                      {label}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-14 border-t border-white/10 pt-10">
                <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">
                  <Music2 className="h-3.5 w-3.5" aria-hidden />
                  {copy.tracksTitle}
                </p>
                <p className="mt-2 text-sm font-light text-zinc-500">
                  {copy.tracksReorderHint}
                </p>
                <ul className="mt-5 space-y-2" aria-label={copy.tracksTitle}>
                  {trackOrder.map((tid) => (
                    <li
                      key={tid}
                      draggable
                      onDragStart={() => setDraggingId(tid)}
                      onDragEnd={() => setDraggingId(null)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (draggingId && draggingId !== tid) {
                          reorderTracks(draggingId, tid);
                        }
                        setDraggingId(null);
                      }}
                      className={`flex cursor-grab items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3.5 shadow-[0_0_16px_rgba(99,102,241,0.06)] active:cursor-grabbing ${
                        draggingId === tid ? "opacity-70" : ""
                      }`}
                    >
                      <GripVertical
                        className="h-5 w-5 shrink-0 text-zinc-600"
                        aria-hidden
                      />
                      <span className="flex-1 text-left text-base font-light text-zinc-300">
                        {trackLabels[tid]}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}
        </div>
      </section>

      {currentStep !== 3 ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#020202]/90 px-4 py-4 backdrop-blur-xl md:px-8">
          <div className="mx-auto flex max-w-xl gap-3">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={goBack}
                className="font-[family-name:var(--font-label)] min-h-[52px] flex-1 rounded-2xl border border-white/10 bg-white/[0.06] px-4 text-base font-normal text-zinc-200 shadow-[0_0_20px_rgba(255,255,255,0.04)] transition-colors hover:bg-white/[0.09]"
              >
                {copy.back}
              </button>
            ) : (
              <span className="min-h-[52px] flex-1" aria-hidden />
            )}

            {currentStep < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={goNext}
                className="font-[family-name:var(--font-label)] min-h-[52px] flex-[1.35] rounded-2xl border border-white/12 bg-white/[0.08] px-4 text-base font-normal text-zinc-50 shadow-[0_0_24px_rgba(167,139,250,0.12)] transition-colors hover:bg-white/[0.11]"
              >
                {copy.next}
              </button>
            ) : (
              <button
                type="button"
                onClick={finish}
                disabled={!selectedMood}
                className="font-[family-name:var(--font-label)] min-h-[52px] flex-[1.35] rounded-2xl border border-teal-400/30 bg-teal-950/35 px-4 text-base font-normal text-teal-50 shadow-[0_0_28px_rgba(45,212,191,0.35)] transition-[background,box-shadow,opacity] hover:bg-teal-900/40 hover:shadow-[0_0_40px_rgba(34,211,238,0.38)] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                {copy.finishCta}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

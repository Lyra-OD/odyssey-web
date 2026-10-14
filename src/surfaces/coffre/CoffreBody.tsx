"use client";

import { Image as ImageIcon, Music2 } from "lucide-react";
import { SoftCapMediaCountSync } from "@/src/components/tribute/SoftCapModal";
import { MediaDropzoneAdapter } from "@/src/components/media/MediaDropzoneAdapter";
import { MediaQueueGrid } from "@/src/components/media/MediaQueueGrid";
import { ScannerCompanionPanel } from "@/src/components/scanner/ScannerCompanionPanel";
import { ScannerCompanionPlaceholder } from "@/src/components/scanner/ScannerCompanionPlaceholder";
import { WIZARD_MEDIA_POLL_INTERVAL_MS } from "@/src/lib/wizard/wizardMediaPoll";
import type { CoffreHostProps } from "./types";

export function CoffreBody({
  projectId,
  userId,
  tenantId,
  uploadStrategy,
  locale,
  copy,
  maxFiles,
  quotaMaxFiles,
  projectDraftLoading,
  offerMediaSoftCap,
  onOpenSoftCap,
  onQueueCountChange,
  onUploadRunningChange,
  onAssetUploaded,
  onSessionExpired,
  onRestorationPreview,
}: CoffreHostProps) {
  return (
    <>
      {!projectId ? (
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
          projectId={projectId}
          userId={userId}
          tenantId={tenantId}
          uploadStrategy={uploadStrategy}
          autoStart
          pollIntervalMs={WIZARD_MEDIA_POLL_INTERVAL_MS}
          maxFiles={maxFiles}
          maxFileSizeBytes={300 * 1024 * 1024}
          overflowRejectionMessage={copy.uploadLimitOverflowRejection}
          onAssetUploaded={onAssetUploaded}
          onUploadError={(error) => {
            if (error.message === "unauthenticated") {
              onSessionExpired();
            }
          }}
        >
          {(dz) => {
            const totalQueued = dz.items.length;

            return (
              <>
                <SoftCapMediaCountSync
                  count={totalQueued}
                  onCount={onQueueCountChange}
                />
                <SoftCapMediaCountSync
                  count={dz.isRunning ? 1 : 0}
                  onCount={(n) => onUploadRunningChange(n > 0)}
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
                    className="relative mt-2 text-sm font-light text-zinc-400"
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
                        .replace("{max}", String(maxFiles))}
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
                      onClick={onOpenSoftCap}
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
                        String(maxFiles),
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
                    viaGuest: copy.queueViaGuest,
                    viaPhoto: copy.queueViaPhoto,
                    viaVideo: copy.queueViaVideo,
                    restorePreview: copy.scannerRestorePreview,
                    quotaExceededError:
                      copy.uploadLimitExceededItemError.replace(
                        "{max}",
                        String(quotaMaxFiles),
                      ),
                  }}
                  onPreviewScanner={(item) => {
                    const url =
                      item.fullPreviewUrl || item.previewUrl || null;
                    if (url) onRestorationPreview(url);
                  }}
                />

                <p className="mt-4 text-sm font-light text-zinc-400">
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

      <section className="mt-12 border-t border-white/[0.06] pt-10">
        {projectId ? (
          <ScannerCompanionPanel
            projectId={projectId}
            locale={locale}
            copy={{
              eyebrow: copy.scannerEyebrow,
              title: copy.scannerTitle,
              description: copy.scannerDescription,
              mobileDescription: copy.scannerMobileDescription,
              openCapture: copy.scannerOpenCapture,
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
            copy={{
              eyebrow: copy.scannerEyebrow,
              title: copy.scannerTitle,
              description: copy.scannerDescription,
              badge: copy.scannerBadge,
              hint: copy.scannerHint,
            }}
          />
        )}
      </section>
    </>
  );
}

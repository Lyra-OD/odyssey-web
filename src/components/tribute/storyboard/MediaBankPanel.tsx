"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Film, Image as ImageIcon, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { StoragePreviewImage } from "@/src/components/media/StoragePreviewImage";
import { EASE_OUT_LUXE } from "@/src/lib/motion/easing";
import type { MontageMediaItem } from "@/src/lib/wizard/montageHelpers";

export type MediaBankPanelCopy = {
  title: string;
  hint: string;
  empty: string;
  closeAria: string;
  selectAll: string;
  deselectAll: string;
  /** Doit contenir `{count}`. */
  selectedCount: string;
  /** Doit contenir `{count}` et `{chapter}`. */
  assignCta: string;
  toggleSelectAria: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  items: readonly MontageMediaItem[];
  /** Snapshot du chapitre cible à l'ouverture — figé pour toute la session banque. */
  targetChapterLabel: string;
  onAssignBatch: (mediaIds: string[]) => void;
  copy: MediaBankPanelCopy;
};

function BankMediaTile({
  item,
  isSelected,
  onToggle,
  toggleAria,
}: {
  item: MontageMediaItem;
  isSelected: boolean;
  onToggle: () => void;
  toggleAria: string;
}) {
  const content = item.previewUrl ? (
    <StoragePreviewImage
      src={item.previewUrl}
      fallbackSrc={item.fullPreviewUrl}
      alt=""
      className="h-full w-full object-cover"
      draggable={false}
    />
  ) : item.isVideo ? (
    <div className="flex h-full w-full items-center justify-center bg-[#020202]">
      <Film className="h-7 w-7 text-zinc-600" strokeWidth={1.1} />
    </div>
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-[#020202]">
      <ImageIcon className="h-7 w-7 text-zinc-600" strokeWidth={1.1} />
    </div>
  );

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isSelected}
      aria-label={toggleAria}
      className={`relative aspect-video w-full overflow-hidden rounded-xl transition-all duration-200 ease-out ${
        isSelected
          ? "scale-[0.97] ring-2 ring-amber-400/70 shadow-[0_0_20px_rgba(251,191,36,0.12)]"
          : "ring-1 ring-white/10 hover:ring-amber-400/25"
      }`}
    >
      {content}
      {isSelected ? (
        <span
          className="pointer-events-none absolute inset-0 bg-amber-400/[0.08]"
          aria-hidden
        />
      ) : null}
    </button>
  );
}

/**
 * Banque de médias — overlay ~95 % (inset-4 desktop, top 5vh mobile),
 * multi-sélection batch + sticky footer. Fermeture magique post-ajout.
 */
export function MediaBankPanel({
  isOpen,
  onClose,
  items,
  targetChapterLabel,
  onAssignBatch,
  copy,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected = items.length > 0 && selectedIds.length === items.length;

  const close = useCallback(() => {
    setSelectedIds([]);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setSelectedIds([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, close]);

  const toggleSelect = useCallback((assetId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(assetId)) {
        return prev.filter((id) => id !== assetId);
      }
      return [...prev, assetId];
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(items.map((item) => item.assetId));
  }, [items]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const handleAssign = useCallback(() => {
    if (selectedIds.length === 0) return;
    onAssignBatch(selectedIds);
    setSelectedIds([]);
  }, [onAssignBatch, selectedIds]);

  const selectedCountLabel = copy.selectedCount.replace(
    "{count}",
    String(selectedIds.length),
  );
  const assignLabel = copy.assignCta
    .replace("{count}", String(selectedIds.length))
    .replace("{chapter}", targetChapterLabel);

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            key="bank-backdrop"
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT_LUXE }}
            onClick={close}
            aria-hidden
          />
          <motion.aside
            key="bank-panel"
            role="dialog"
            aria-modal="true"
            aria-label={copy.title}
            className="fixed z-[61] flex flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#020202]/95 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl inset-x-0 bottom-0 top-[5vh] md:inset-4 md:rounded-2xl"
            initial={{ y: 24, opacity: 0.6, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0.6, scale: 0.98 }}
            transition={{ duration: 0.4, ease: EASE_OUT_LUXE }}
          >
            <div
              className="h-px w-full shrink-0 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent"
              aria-hidden
            />

            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/[0.06] px-5 pb-4 pt-5 md:px-8 md:pt-6">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <h3 className="font-[family-name:var(--font-label)] text-xs font-medium uppercase tracking-[0.24em] text-amber-400/90">
                    {copy.title}
                  </h3>
                  {items.length > 0 ? (
                    <button
                      type="button"
                      onClick={allSelected ? handleDeselectAll : handleSelectAll}
                      className="text-xs font-light text-zinc-500 underline decoration-white/15 underline-offset-4 transition-colors hover:text-amber-300/90"
                    >
                      {allSelected ? copy.deselectAll : copy.selectAll}
                    </button>
                  ) : null}
                </div>
                <p className="text-sm font-light leading-relaxed text-zinc-400">
                  {copy.hint}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label={copy.closeAria}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
              >
                <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-8">
              {items.length === 0 ? (
                <p className="py-16 text-center text-sm font-light text-zinc-500">
                  {copy.empty}
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {items.map((item) => (
                    <BankMediaTile
                      key={item.assetId}
                      item={item}
                      isSelected={selectedSet.has(item.assetId)}
                      onToggle={() => toggleSelect(item.assetId)}
                      toggleAria={copy.toggleSelectAria}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="shrink-0 border-t border-white/[0.08] bg-[#020202]/90 px-5 py-4 backdrop-blur-xl md:px-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-light text-zinc-400">{selectedCountLabel}</p>
                <button
                  type="button"
                  onClick={handleAssign}
                  disabled={selectedIds.length === 0}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-amber-400/30 bg-amber-400/[0.08] px-6 py-2.5 text-sm font-medium text-amber-100 transition-all duration-200 hover:border-amber-400/45 hover:bg-amber-400/[0.14] disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-zinc-600"
                >
                  {assignLabel}
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, ArrowUpRight, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { PackageDossierRow } from "@/src/lib/wizard/packageDossier";
import { formatCentsForDisplay } from "@/src/lib/wizard/wizardPricing";
import type { WizardBasePackage } from "@/src/lib/wizard/pricingConfig";

export type PackageDossierOption = {
  id: WizardBasePackage;
  label: string;
  priceCents: number;
};

export type PackageDossierPanelCopy = {
  inclusionsTitle: string;
  discoverTitle: string;
  backToCurrentCta: string;
  currentBadge: string;
  /** Doit contenir `{package}`. */
  switchCta: string;
  closeAria: string;
  /** Doit contenir `{package}` et `{count}`. */
  downgradeWarning: string;
  downgradeConfirmCta: string;
  downgradeCancelCta: string;
};

export type PackageDossierTriggerCopy = {
  label: string;
  openAria: string;
};

type TriggerProps = {
  packageLabel: string;
  onOpen: () => void;
  copy: PackageDossierTriggerCopy;
  className?: string;
};

/**
 * Déclencheur du Dossier — typographie éditoriale, aucun chrome de bouton
 * (pas de bordure, pas de chevron de menu) pour ne jamais évoquer un
 * `<select>`. Se lit comme une légende, pas comme un contrôle de formulaire.
 */
export function PackageDossierTrigger({
  packageLabel,
  onOpen,
  copy,
  className = "",
}: TriggerProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={copy.openAria}
      className={`group inline-flex flex-col items-start gap-0.5 text-left ${className}`}
    >
      <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">
        {copy.label}
      </span>
      <span className="inline-flex items-center gap-1.5 font-editorial text-base font-medium text-zinc-100">
        <span className="border-b border-transparent pb-0.5 transition-colors duration-200 group-hover:border-white/25">
          {packageLabel}
        </span>
        <ArrowUpRight
          className="h-3.5 w-3.5 text-zinc-500 transition-colors duration-200 group-hover:text-zinc-300"
          strokeWidth={1.5}
          aria-hidden
        />
      </span>
    </button>
  );
}

const EASE_OUT_LUXE = [0.16, 1, 0.3, 1] as const;

function SavingsBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-teal-400/25 bg-teal-400/[0.07] px-2.5 py-0.5 text-[10px] font-medium tracking-wide text-teal-200/90">
      {label}
    </span>
  );
}

function DossierRows({ rows }: { rows: readonly PackageDossierRow[] }) {
  return (
    <dl className="mt-6 divide-y divide-white/[0.06] border-y border-white/[0.06]">
      {rows.map((row) => (
        <div
          key={row.id}
          className="flex items-baseline justify-between gap-4 py-3"
        >
          <dt className="text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
            {row.label}
          </dt>
          <dd className="shrink-0 text-right text-sm font-light text-zinc-200">
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  currentPackage: WizardBasePackage;
  options: readonly PackageDossierOption[];
  hidePrices: boolean;
  locale: "fr" | "en";
  taglineFor: (pkg: WizardBasePackage) => string;
  /** `null` si ce forfait n'a pas de mention d'économie à afficher. */
  savingsLabelFor: (pkg: WizardBasePackage) => string | null;
  rowsFor: (pkg: WizardBasePackage) => PackageDossierRow[];
  songsLostIfSelected: (pkg: WizardBasePackage) => number;
  onSelect: (pkg: WizardBasePackage) => void;
  copy: PackageDossierPanelCopy;
};

/**
 * « Le Dossier » — panneau off-canvas global consultable depuis n'importe
 * quelle étape. Remplace le menu déroulant : la comparaison d'un autre
 * forfait se fait par cross-fade in-place (jamais un second niveau de
 * popup), et le garde-fou de downgrade s'affiche inline, juste au-dessus du
 * CTA de confirmation.
 */
export function PackageDossierPanel({
  isOpen,
  onClose,
  currentPackage,
  options,
  hidePrices,
  locale,
  taglineFor,
  savingsLabelFor,
  rowsFor,
  songsLostIfSelected,
  onSelect,
  copy,
}: Props) {
  const [previewPackage, setPreviewPackage] = useState<WizardBasePackage | null>(null);

  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      setPreviewPackage(null);
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

  const currentOption = options.find((option) => option.id === currentPackage);
  const otherOptions = options.filter((option) => option.id !== currentPackage);
  const previewOption = previewPackage
    ? options.find((option) => option.id === previewPackage) ?? null
    : null;
  const lostCount = previewPackage ? songsLostIfSelected(previewPackage) : 0;
  const currentSavingsLabel = savingsLabelFor(currentPackage);
  const previewSavingsLabel = previewOption ? savingsLabelFor(previewOption.id) : null;

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            key="dossier-backdrop"
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE_OUT_LUXE }}
            onClick={close}
            aria-hidden
          />
          <motion.aside
            key="dossier-panel"
            role="dialog"
            aria-modal="true"
            aria-label={copy.inclusionsTitle}
            className="fixed inset-y-0 right-0 z-[61] flex w-full max-w-[26rem] flex-col border-l border-white/10 bg-[#020202]/98 shadow-[-24px_0_64px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
            initial={{ x: "100%", opacity: 0.4 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0.4 }}
            transition={{ duration: 0.4, ease: EASE_OUT_LUXE }}
          >
            <div
              className="h-px w-full shrink-0 bg-gradient-to-r from-teal-400/60 via-violet-400/50 to-transparent"
              aria-hidden
            />

            <div className="flex items-center justify-end px-6 pt-5 md:px-8">
              <button
                type="button"
                onClick={close}
                aria-label={copy.closeAria}
                className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
              >
                <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-10 md:px-8">
              <AnimatePresence mode="wait" initial={false}>
                {previewOption ? (
                  <motion.div
                    key={`preview-${previewOption.id}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3, ease: EASE_OUT_LUXE }}
                  >
                    <button
                      type="button"
                      onClick={() => setPreviewPackage(null)}
                      className="inline-flex items-center gap-2 text-xs font-light text-zinc-500 transition-colors hover:text-zinc-300"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                      {copy.backToCurrentCta}
                    </button>

                    <div className="mt-5 flex items-start justify-between gap-3">
                      <h2 className="font-editorial text-2xl font-medium text-zinc-50">
                        {previewOption.label}
                      </h2>
                      {!hidePrices ? (
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <span className="text-sm font-medium tabular-nums text-teal-300/90">
                            {formatCentsForDisplay(previewOption.priceCents, locale)}
                          </span>
                          {previewSavingsLabel ? <SavingsBadge label={previewSavingsLabel} /> : null}
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm font-light leading-relaxed text-zinc-500">
                      {taglineFor(previewOption.id)}
                    </p>

                    <DossierRows rows={rowsFor(previewOption.id)} />

                    {lostCount > 0 ? (
                      <p
                        className="mt-6 flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-500/[0.06] px-4 py-3 text-xs font-light leading-relaxed text-amber-200/90"
                        role="alert"
                      >
                        <AlertTriangle
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300/80"
                          aria-hidden
                        />
                        {copy.downgradeWarning
                          .replace("{package}", previewOption.label)
                          .replace("{count}", String(lostCount))}
                      </p>
                    ) : null}

                    <div className="mt-6 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setPreviewPackage(null)}
                        className="rounded-lg px-3 py-2 text-xs font-light text-zinc-400 transition-colors hover:text-zinc-200"
                      >
                        {copy.downgradeCancelCta}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(previewOption.id);
                          close();
                        }}
                        className={`rounded-lg border px-4 py-2 text-xs font-medium transition-colors ${
                          lostCount > 0
                            ? "border-amber-400/30 bg-amber-500/10 text-amber-100 hover:border-amber-400/45"
                            : "border-teal-400/30 bg-teal-400/[0.08] text-teal-100 hover:border-teal-400/45"
                        }`}
                      >
                        {lostCount > 0
                          ? copy.downgradeConfirmCta
                          : copy.switchCta.replace("{package}", previewOption.label)}
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="current"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.3, ease: EASE_OUT_LUXE }}
                  >
                    <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-teal-300/80">
                      {copy.currentBadge}
                    </p>
                    <div className="mt-2 flex items-start justify-between gap-3">
                      <h2 className="font-editorial text-2xl font-medium text-zinc-50">
                        {currentOption?.label ?? ""}
                      </h2>
                      {!hidePrices && currentOption ? (
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <span className="text-sm font-medium tabular-nums text-teal-300/90">
                            {formatCentsForDisplay(currentOption.priceCents, locale)}
                          </span>
                          {currentSavingsLabel ? <SavingsBadge label={currentSavingsLabel} /> : null}
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm font-light leading-relaxed text-zinc-500">
                      {taglineFor(currentPackage)}
                    </p>

                    <p className="mt-8 text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">
                      {copy.inclusionsTitle}
                    </p>
                    <DossierRows rows={rowsFor(currentPackage)} />

                    {otherOptions.length > 0 ? (
                      <div className="mt-8">
                        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-zinc-500">
                          {copy.discoverTitle}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2.5">
                          {otherOptions.map((option) => {
                            const optionSavingsLabel = savingsLabelFor(option.id);
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => setPreviewPackage(option.id)}
                                className={`rounded-full border px-4 py-2 text-xs font-light transition-colors ${
                                  optionSavingsLabel
                                    ? "border-teal-400/25 bg-teal-400/[0.04] text-zinc-200 hover:border-teal-400/40 hover:bg-teal-400/[0.07]"
                                    : "border-white/10 text-zinc-300 hover:border-violet-400/30 hover:bg-white/[0.03] hover:text-zinc-100"
                                }`}
                              >
                                {option.label}
                                {!hidePrices ? (
                                  <span className="ml-2 tabular-nums text-teal-300/80">
                                    {formatCentsForDisplay(option.priceCents, locale)}
                                  </span>
                                ) : null}
                                {optionSavingsLabel ? (
                                  <span className="ml-2 text-teal-200/80">{optionSavingsLabel}</span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

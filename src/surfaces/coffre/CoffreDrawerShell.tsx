"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useMediaBankLayout } from "@/src/hooks/useMediaBankLayout";

type CoffreDrawerShellProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  closeAria: string;
  children: ReactNode;
};

/**
 * Coquille du tiroir Coffre. Le host décide du montage (ouvert ou upload en
 * cours) : fermé mais monté = caché, l’upload continue en arrière-plan.
 */
export function CoffreDrawerShell({
  isOpen,
  onClose,
  title,
  closeAria,
  children,
}: CoffreDrawerShellProps) {
  const layout = useMediaBankLayout();

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  const panelClass =
    layout === "drawer"
      ? `inset-y-0 right-0 w-full max-w-[34rem] border-l ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`
      : `inset-x-0 bottom-0 h-[88vh] rounded-t-2xl border-t ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`;

  return (
    <div className={isOpen ? "" : "invisible"} aria-hidden={!isOpen}>
      <div
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal={isOpen}
        aria-label={title}
        className={`fixed z-[61] flex flex-col border-white/10 bg-[#020202]/98 shadow-[-24px_0_64px_rgba(0,0,0,0.5)] backdrop-blur-2xl transition-transform duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${panelClass}`}
      >
        <div
          className="h-px w-full shrink-0 bg-gradient-to-r from-teal-400/60 via-cyan-400/40 to-transparent"
          aria-hidden
        />
        <div className="flex items-center justify-between gap-3 px-6 pt-5 md:px-8">
          <p className="font-editorial text-xl font-medium text-zinc-50">
            {title}
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeAria}
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
          >
            <X className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-12 md:px-8">
          {children}
        </div>
      </aside>
    </div>
  );
}

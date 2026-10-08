"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type SoftCapTipValue = {
  tip: string;
  aria: string;
};

const SoftCapTipContext = createContext<SoftCapTipValue>({
  tip: "",
  aria: "Soft Cap",
});

export function DeckSoftCapTipProvider({
  tip,
  aria,
  children,
}: SoftCapTipValue & { children: ReactNode }) {
  return (
    <SoftCapTipContext.Provider value={{ tip, aria }}>
      {children}
    </SoftCapTipContext.Provider>
  );
}

/**
 * Mot Soft Cap teal + bulle définition (hover / focus / tap).
 */
export function DeckSoftCapWord({
  className = "",
}: {
  className?: string;
}) {
  const { tip, aria } = useContext(SoftCapTipContext);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const place = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.min(280, window.innerWidth - 16);
    const left = Math.max(
      8,
      Math.min(r.left + r.width / 2 - width / 2, window.innerWidth - width - 8),
    );
    const below = r.bottom + 10;
    const top =
      below + 96 < window.innerHeight ? below : Math.max(8, r.top - 100);
    setPos({ top, left });
  }, []);

  const show = useCallback(() => {
    if (!tip) return;
    place();
    setOpen(true);
  }, [place, tip]);

  const hide = useCallback(() => setOpen(false), []);

  const toggle = useCallback(() => {
    if (open) hide();
    else show();
  }, [hide, open, show]);

  if (!tip) {
    return (
      <span className={`font-medium text-[var(--salon-cyan)] ${className}`}>
        Soft Cap
      </span>
    );
  }

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={`inline cursor-help border-b border-dotted border-[rgba(0,232,240,0.55)] bg-transparent p-0 font-medium text-[var(--salon-cyan)] ${className}`}
        aria-label={aria}
        aria-expanded={open}
        aria-describedby={open ? "deck-soft-cap-tip" : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") hide();
        }}
      >
        Soft Cap
      </button>
      {open
        ? createPortal(
            <span
              id="deck-soft-cap-tip"
              role="tooltip"
              style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                zIndex: 9999,
                width: Math.min(280, window.innerWidth - 16),
              }}
              className="pointer-events-none rounded-md border border-[rgba(0,232,240,0.28)] bg-zinc-950/95 px-3 py-2.5 text-left font-label text-[0.78rem] font-normal normal-case leading-snug tracking-normal text-white/88 shadow-xl backdrop-blur-sm"
            >
              {tip}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}

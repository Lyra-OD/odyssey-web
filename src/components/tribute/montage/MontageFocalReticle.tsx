"use client";

import { motion } from "framer-motion";

import type { MontageFocalPoint } from "@/src/lib/wizard/wizardState";

type Props = {
  point: MontageFocalPoint;
  onClear: () => void;
};

const UV = "#ff00ff";

/**
 * Cinematic crosshair reticle — Ultraviolet pulse, precise studio look.
 */
export function MontageFocalReticle({ point, onClear }: Props) {
  return (
    <motion.button
      type="button"
      aria-label="Remove focal point"
      onClick={(e) => {
        e.stopPropagation();
        onClear();
      }}
      className="pointer-events-auto absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{
        opacity: 1,
        scale: [1, 1.06, 1],
      }}
      transition={{
        opacity: { duration: 0.25 },
        scale: {
          duration: 2.2,
          repeat: Infinity,
          ease: "easeInOut",
        },
      }}
    >
      <span className="relative flex h-8 w-8 items-center justify-center">
        <motion.span
          className="absolute -inset-2 rounded-full"
          style={{
            boxShadow: `0 0 20px ${UV}55, 0 0 40px ${UV}22`,
          }}
          animate={{ opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <span
          className="absolute h-px w-full"
          style={{
            backgroundColor: `${UV}e6`,
            boxShadow: `0 0 8px ${UV}99`,
          }}
        />
        <span
          className="absolute h-full w-px"
          style={{
            backgroundColor: `${UV}e6`,
            boxShadow: `0 0 8px ${UV}99`,
          }}
        />
        <span
          className="absolute h-3 w-3 rounded-full border bg-[#ff00ff]/10"
          style={{
            borderColor: `${UV}cc`,
            boxShadow: `0 0 14px ${UV}73`,
          }}
        />
        <span
          className="absolute -inset-1 rounded-full border"
          style={{ borderColor: `${UV}33` }}
        />
      </span>
    </motion.button>
  );
}

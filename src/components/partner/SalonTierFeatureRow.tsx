"use client";

import { motion } from "framer-motion";

import {
  SALON_TYPO_LIGHT,
  salonTierFeatureIconClass,
  salonTierFeatureLabelClass,
} from "@/src/lib/salonTierCardSkin";
import type { PartnerInvitationFeature } from "@/src/lib/wizard/wizardDeliverables.utils";

type SalonTierFeatureRowProps = {
  feature: PartnerInvitationFeature;
  isAccent: boolean;
  isSelected: boolean;
  reducedMotion: boolean;
};

function SalonFeatureIcon({ included }: { included: boolean }) {
  if (included) {
    return (
      <svg
        aria-hidden
        viewBox="0 0 12 12"
        className="h-3 w-3 shrink-0"
        fill="none"
      >
        <circle cx="6" cy="6" r="1.5" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden
      viewBox="0 0 12 12"
      className="h-3 w-3 shrink-0"
      fill="none"
    >
      <line
        x1="3.5"
        y1="6"
        x2="8.5"
        y2="6"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SalonTierFeatureRow({
  feature,
  isAccent,
  isSelected,
  reducedMotion,
}: SalonTierFeatureRowProps) {
  const { included, label } = feature;

  const labelOpacity = included
    ? isSelected
      ? 0.85
      : isAccent
        ? 0.75
        : 0.65
    : 0.25;

  return (
    <motion.li
      initial={false}
      animate={{ opacity: labelOpacity }}
      transition={reducedMotion ? { duration: 0 } : SALON_TYPO_LIGHT}
      className="flex items-start gap-2.5 text-left"
      aria-label={
        included ? `Inclus : ${label}` : `Non inclus : ${label}`
      }
    >
      <span className={salonTierFeatureIconClass(included, isSelected)}>
        <SalonFeatureIcon included={included} />
      </span>
      <span
        className={salonTierFeatureLabelClass(
          included,
          isAccent,
          isSelected,
        )}
      >
        {label}
      </span>
    </motion.li>
  );
}

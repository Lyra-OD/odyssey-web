"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

export const LUEUR_VIDEO_SRC = "/lueur.mp4";

export type SanctuaryLueurOrbProps = {
  /** single = carte/rituel hero ; sky = Ciel Famille organique */
  variant?: "single" | "sky";
  size?: "card" | "ritual";
  className?: string;
  "aria-label"?: string;
};

type OrganicVariant = {
  rotateDeg: number;
  mirror: boolean;
  hueDeg: number;
  rate: number;
  startRatio: number;
};

const HERO: OrganicVariant = {
  rotateDeg: 0,
  mirror: false,
  hueDeg: 0,
  rate: 1,
  startRatio: 0,
};

function rollOrganicVariant(): OrganicVariant {
  return {
    rotateDeg: Math.random() * 360,
    mirror: Math.random() < 0.5,
    hueDeg: -20 + Math.random() * 40,
    rate: 0.8 + Math.random() * 0.4,
    startRatio: Math.random(),
  };
}

function frameStyle(v: OrganicVariant): CSSProperties {
  return {
    ["--lueur-rotate" as string]: `${v.rotateDeg}deg`,
    ["--lueur-scale-x" as string]: v.mirror ? "-1" : "1",
    ["--lueur-hue" as string]: `${v.hueDeg}deg`,
  };
}

/**
 * Lueur MP4 (fond noir) + mix-blend-mode: screen.
 * - variant="single" : présentation hero, zéro random
 * - variant="sky" : random client-only (Ciel Famille), hydratation-safe
 */
export function SanctuaryLueurOrb({
  variant = "single",
  size = "card",
  className = "",
  "aria-label": ariaLabel,
}: SanctuaryLueurOrbProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  /** null = pas encore tiré (sky) → identité = match SSR */
  const [organic, setOrganic] = useState<OrganicVariant | null>(null);

  const isSky = variant === "sky";
  const look = isSky ? (organic ?? HERO) : HERO;

  useEffect(() => {
    if (!isSky) {
      setOrganic(null);
      return;
    }
    setOrganic(rollOrganicVariant());
  }, [isSky]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isSky && organic === null) return;

    const applied = isSky && organic ? organic : HERO;
    el.playbackRate = applied.rate;

    const seek = () => {
      if (!Number.isFinite(el.duration) || el.duration <= 0) return;
      try {
        el.currentTime = applied.startRatio * el.duration;
      } catch {
        /* ignore seek race */
      }
    };

    if (el.readyState >= 1) seek();
    else el.addEventListener("loadedmetadata", seek, { once: true });

    void el.play().catch(() => {});

    return () => {
      el.removeEventListener("loadedmetadata", seek);
    };
  }, [isSky, organic]);

  const stageClass =
    size === "ritual"
      ? "sanctuary-lueur-stage sanctuary-lueur-stage--ritual"
      : "sanctuary-lueur-stage";
  const frameClass =
    size === "ritual"
      ? "sanctuary-lueur-frame sanctuary-lueur-frame--ritual"
      : "sanctuary-lueur-frame";

  return (
    <div className={`${stageClass} ${className}`.trim()}>
      <div
        className={frameClass}
        style={frameStyle(look)}
        role="img"
        aria-label={ariaLabel}
      >
        <video
          ref={videoRef}
          className="sanctuary-lueur-video"
          src={LUEUR_VIDEO_SRC}
          autoPlay
          loop
          muted
          playsInline
          preload={isSky ? "metadata" : "auto"}
          aria-hidden
        />
      </div>
    </div>
  );
}

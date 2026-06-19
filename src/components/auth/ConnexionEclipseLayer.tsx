"use client";

import { useEffect, useRef, useState } from "react";

export const CONNEXION_ECLIPSE_LOGIN_SRC = "/eclipse_login.mp4";

export function ConnexionEclipseLayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);

    const onChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };

    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tryPlay = () => {
      if (reducedMotion) {
        video.pause();
        video.currentTime = 0;
        return;
      }
      void video.play().catch(() => {});
    };

    tryPlay();
    video.addEventListener("loadeddata", tryPlay);
    return () => video.removeEventListener("loadeddata", tryPlay);
  }, [reducedMotion]);

  return (
    <div
      className="connexion-eclipse-layer pointer-events-none absolute inset-0 z-[1] overflow-hidden"
      aria-hidden
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        loop
        preload="auto"
        className="connexion-eclipse-video pointer-events-none absolute inset-0 h-full w-full scale-[1.14] object-cover object-[center_38%] mix-blend-screen opacity-[0.11] contrast-[1.06] brightness-[0.98]"
        src={CONNEXION_ECLIPSE_LOGIN_SRC}
      />
    </div>
  );
}

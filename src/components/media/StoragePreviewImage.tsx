"use client";

import { useEffect, useState } from "react";

type Props = {
  src: string | null | undefined;
  fallbackSrc?: string | null;
  alt?: string;
  className?: string;
  draggable?: boolean;
  loading?: "eager" | "lazy";
  onClick?: (event: React.MouseEvent<HTMLImageElement>) => void;
};

/**
 * Grid-safe Storage preview: lazy load + fallback to full resolution if thumb 404 (legacy assets).
 */
export function StoragePreviewImage({
  src,
  fallbackSrc,
  alt = "",
  className,
  draggable = false,
  loading = "lazy",
  onClick,
}: Props) {
  const [currentSrc, setCurrentSrc] = useState(src ?? "");

  useEffect(() => {
    setCurrentSrc(src ?? "");
  }, [src]);

  if (!currentSrc) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      draggable={draggable}
      loading={loading}
      decoding="async"
      onClick={onClick}
      onError={() => {
        if (fallbackSrc && currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
    />
  );
}

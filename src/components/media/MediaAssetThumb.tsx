"use client";

import { Film, Image as ImageIcon } from "lucide-react";

import { MediaVideoPreview } from "@/src/components/media/MediaVideoPreview";
import { StoragePreviewImage } from "@/src/components/media/StoragePreviewImage";
import { looksLikeImageSrc } from "@/src/lib/media/thumbnailPath";

type Props = {
  isVideo: boolean;
  src: string | null | undefined;
  fallbackSrc?: string | null;
  className?: string;
  pointerEventsNone?: boolean;
};

/**
 * Miniature Coffre / montage : photo ou poster vidéo = img ;
 * vidéo sans poster = video element (jamais img sur MP4).
 */
export function MediaAssetThumb({
  isVideo,
  src,
  fallbackSrc,
  className = "h-full w-full object-cover",
  pointerEventsNone = true,
}: Props) {
  const wrap = pointerEventsNone ? "pointer-events-none " : "";
  const cls = `${wrap}${className}`.trim();
  const imageFallback = looksLikeImageSrc(fallbackSrc) ? fallbackSrc : null;

  if (src && looksLikeImageSrc(src)) {
    return (
      <StoragePreviewImage
        src={src}
        fallbackSrc={imageFallback}
        alt=""
        className={cls}
        draggable={false}
      />
    );
  }

  if (isVideo && src) {
    return <MediaVideoPreview src={src} className={cls} />;
  }

  if (!isVideo && src) {
    return (
      <StoragePreviewImage
        src={src}
        fallbackSrc={fallbackSrc}
        alt=""
        className={cls}
        draggable={false}
      />
    );
  }

  return (
    <div
      className={`${wrap}flex h-full w-full items-center justify-center bg-[#020202]`}
    >
      {isVideo ? (
        <Film className="h-7 w-7 text-zinc-600" strokeWidth={1.1} />
      ) : (
        <ImageIcon className="h-7 w-7 text-zinc-600" strokeWidth={1.1} />
      )}
    </div>
  );
}

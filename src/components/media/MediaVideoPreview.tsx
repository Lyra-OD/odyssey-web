"use client";

type Props = {
  src: string;
  className?: string;
  /** Directeur : lecture, pas drag. */
  controls?: boolean;
};

/** Aperçu vidéo grille / directeur — jamais un &lt;img&gt; sur un MP4. */
export function MediaVideoPreview({
  src,
  className,
  controls = false,
}: Props) {
  return (
    <video
      src={src}
      className={className}
      muted
      playsInline
      preload="metadata"
      controls={controls}
      draggable={false}
    />
  );
}
